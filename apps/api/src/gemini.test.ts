import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIllustrationPrompt, RestGeminiService } from "./gemini.js";

afterEach(() => vi.restoreAllMocks());

describe("RestGeminiService", () => {
  it("waits for an uploaded file to become ACTIVE", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { "x-goog-upload-url": "https://upload.example/book" } }))
      .mockResolvedValueOnce(json({ file: { name: "files/book-1", uri: "https://files/book-1", state: "PROCESSING" } }))
      .mockResolvedValueOnce(json({ name: "files/book-1", uri: "https://files/book-1", state: "ACTIVE", expirationTime: "2026-08-15T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new RestGeminiService("test-key", "gemini-3.5-flash", { filePollIntervalMs: 0, filePollTimeoutMs: 100 });

    const file = await service.uploadBook("The Cat", "Book text");

    expect(file.state).toBe("ACTIVE");
    expect(fetchMock.mock.calls[2][0]).toBe("https://generativelanguage.googleapis.com/v1beta/files/book-1");
  });

  it("preserves the image MIME type returned by Gemini", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ steps: [{ type: "model_output", content: [{ type: "image", mime_type: "image/jpeg", data: "AQID" }] }] })));
    const service = new RestGeminiService("test-key", "gemini-3.5-flash");

    const portrait = await service.generatePortrait("Portrait prompt");

    expect(portrait.mimeType).toBe("image/jpeg");
    expect([...portrait.data]).toEqual([1, 2, 3]);
  });

  it("replaces Gemini quota details with a short user-facing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests. Please retry in 44 seconds." },
    }), { status: 429, headers: { "Content-Type": "application/json" } })));
    const service = new RestGeminiService("test-key", "gemini-3.5-flash");

    await expect(service.generatePortrait("Portrait prompt")).rejects.toThrow("Out of quota.");
  });

  it("builds an illustration prompt from style, persisted appearances, and scene context", () => {
    const prompt = buildIllustrationPrompt({
      style: { selectedStyle: "Warm watercolor" },
      characters: [{ name: "Mira", appearanceDescription: "Adult woman with dark curls and a green coat" }],
      scene: { title: "River Light", context: "Mira raises a lantern beside the flooded river at dusk." },
    });

    expect(prompt).toContain("Warm watercolor");
    expect(prompt).toContain("Mira: Adult woman with dark curls and a green coat");
    expect(prompt).toContain("River Light");
    expect(prompt).toContain("Mira raises a lantern beside the flooded river at dusk.");
  });

  it("generates an illustration with the stored book URI and portrait references", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ output_image: { mime_type: "image/png", data: "AQID" } }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new RestGeminiService("test-key", "gemini-3.5-flash");

    const illustration = await service.generateIllustration("https://files/book-1", "Scene prompt", [
      { data: new Uint8Array([1, 2]), mimeType: "image/jpeg" },
    ]);

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.input).toEqual([
      { type: "document", uri: "https://files/book-1", mime_type: "text/plain" },
      { type: "image", mime_type: "image/jpeg", data: "AQI=" },
      { type: "text", text: "Scene prompt" },
    ]);
    expect(request.response_format.aspect_ratio).toBe("16:9");
    expect(illustration.mimeType).toBe("image/png");
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
