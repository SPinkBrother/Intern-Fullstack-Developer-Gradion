import { afterEach, describe, expect, it, vi } from "vitest";
import { RestGeminiService } from "./gemini.js";

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
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
