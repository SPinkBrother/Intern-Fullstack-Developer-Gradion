export interface GeminiFileReference {
  name: string;
  uri: string;
  expirationTime?: string;
  state?: "PROCESSING" | "ACTIVE" | "FAILED";
}

export interface GeminiService {
  uploadBook(title: string, bookContent: string): Promise<GeminiFileReference>;
  generateStyle(fileUri: string): Promise<string>;
  generateCharacters?(fileUri: string, artStyle: string): Promise<Array<{ name: string; age: number; description: string; visualPrompt: string }>>;
  generatePortrait?(prompt: string): Promise<{ data: Uint8Array; mimeType: string }>;
}

export class RestGeminiService implements GeminiService {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY || "",
    private readonly model = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
    private readonly options: { filePollIntervalMs?: number; filePollTimeoutMs?: number } = {},
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
    return this.waitForActiveFile(body.file);
  }

  private async waitForActiveFile(uploaded: GeminiFileReference) {
    let file = uploaded;
    const timeoutMs = this.options.filePollTimeoutMs ?? 30_000;
    const intervalMs = this.options.filePollIntervalMs ?? 500;
    const deadline = Date.now() + timeoutMs;
    while (file.state !== "ACTIVE") {
      if (file.state === "FAILED") throw new Error("Gemini could not process the uploaded book.");
      if (Date.now() >= deadline) throw new Error("Gemini timed out while processing the uploaded book.");
      if (intervalMs > 0) await delay(intervalMs);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, {
        headers: { "X-Goog-Api-Key": this.apiKey },
      });
      if (!response.ok) throw new Error(await geminiError(response));
      file = await response.json() as GeminiFileReference;
    }
    return file;
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

  async generateCharacters(fileUri: string, artStyle: string) {
    this.requireKey();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { file_data: { mime_type: "text/plain", file_uri: fileUri } },
          { text: `Identify the main adult characters for illustration. Use this art style: ${artStyle}. Return at most two characters with concrete visual details and no plot summary.` },
        ] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "ARRAY", maxItems: 2, items: { type: "OBJECT", required: ["name", "age", "description", "visualPrompt"], properties: {
            name: { type: "STRING" }, age: { type: "INTEGER" }, description: { type: "STRING" }, visualPrompt: { type: "STRING" },
          } } },
        },
      }),
    });
    if (!response.ok) throw new Error(await geminiError(response));
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) throw new Error("Gemini returned no characters.");
    return JSON.parse(text) as Array<{ name: string; age: number; description: string; visualPrompt: string }>;
  }

  async generatePortrait(prompt: string) {
    this.requireKey();
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        input: prompt,
        response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "3:4", image_size: "1K" },
      }),
    });
    if (!response.ok) throw new Error(await geminiError(response));
    const body = await response.json() as { output_image?: { data?: string; mime_type?: string }; steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string; mime_type?: string }> }> };
    const image = body.output_image || body.steps?.flatMap((step) => step.content || []).find((item) => item.type === "image");
    if (!image?.data) throw new Error("Gemini returned no portrait image.");
    const mimeType = image.mime_type;
    if (mimeType !== "image/jpeg" && mimeType !== "image/png") throw new Error("Gemini returned an unsupported portrait format.");
    return { data: Buffer.from(image.data, "base64"), mimeType };
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function geminiError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  const message = body.error?.message;
  if (response.status === 429 || /quota exceeded|out of quota/i.test(message || "")) return "Out of quota.";
  return message || `Gemini request failed with status ${response.status}.`;
}
