import { describe, expect, it } from "vitest";
import { MockGeminiService } from "./mock-gemini.js";

describe("MockGeminiService", () => {
  it("returns deterministic structured output and valid PNG image data without network calls", async () => {
    const service = new MockGeminiService();

    await expect(service.uploadBook("The Cat", "Book text")).resolves.toMatchObject({ state: "ACTIVE", uri: "mock://files/the-cat" });
    await expect(service.generateStyle("mock://files/the-cat")).resolves.toContain("watercolor");
    await expect(service.generateCharacters("mock://files/the-cat", "Watercolor")).resolves.toHaveLength(2);
    await expect(service.generateChapter("mock://files/the-cat", "Watercolor", [])).resolves.toMatchObject({ title: expect.any(String), scenePrompt: expect.any(String) });

    const portrait = await service.generatePortrait("Portrait prompt");
    const illustration = await service.generateIllustration("mock://files/the-cat", "Scene prompt", []);
    expect(portrait.mimeType).toBe("image/png");
    expect(illustration.mimeType).toBe("image/png");
    expect([...portrait.data.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
