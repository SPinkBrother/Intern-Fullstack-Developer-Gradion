export interface GeminiFileReference {
  name: string;
  uri: string;
  expirationTime?: string;
}

export interface GeminiService {
  uploadBook(title: string, bookContent: string): Promise<GeminiFileReference>;
  generateStyle(fileUri: string): Promise<string>;
}

export class RestGeminiService implements GeminiService {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY || "",
    private readonly model = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
  ) {}

  private requireKey() {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  }

  async uploadBook(title: string, bookContent: string): Promise<GeminiFileReference> {
    this.requireKey();
    const byteLength = Buffer.byteLength(bookContent, "utf8");
    const start = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(byteLength),
        "X-Goog-Upload-Header-Content-Type": "text/plain",
      },
      body: JSON.stringify({ file: { display_name: `${title}.txt` } }),
    });
    if (!start.ok) throw new Error(await geminiError(start));
    const uploadUrl = start.headers.get("x-goog-upload-url");
    if (!uploadUrl) throw new Error("Gemini did not provide an upload URL.");

    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": String(byteLength),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: bookContent,
    });
    if (!upload.ok) throw new Error(await geminiError(upload));
    const body = await upload.json() as { file?: GeminiFileReference };
    if (!body.file?.name || !body.file.uri) throw new Error("Gemini returned an invalid file reference.");
    return body.file;
  }

  async generateStyle(fileUri: string): Promise<string> {
    this.requireKey();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { file_data: { mime_type: "text/plain", file_uri: fileUri } },
          { text: "Based only on this book, define one concise visual art style for character portraits and chapter illustrations. Return only the style description in 1-3 sentences. Do not summarize the plot." },
        ] }],
        generationConfig: { maxOutputTokens: 250 },
      }),
    });
    if (!response.ok) throw new Error(await geminiError(response));
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const style = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!style) throw new Error("Gemini returned an empty style.");
    return style;
  }
}

async function geminiError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  return body.error?.message || `Gemini request failed with status ${response.status}.`;
}
