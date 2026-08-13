import type { GeminiImageReference, GeminiService } from "./gemini.js";

const DEMO_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xt0YAAAAAElFTkSuQmCC", "base64");

export class MockGeminiService implements GeminiService {
  async uploadBook(title: string) {
    return {
      name: `files/${slug(title)}`,
      uri: `mock://files/${slug(title)}`,
      expirationTime: "2099-01-01T00:00:00.000Z",
      state: "ACTIVE" as const,
    };
  }

  async generateStyle() {
    return "Warm hand-painted watercolor with soft ink outlines, gentle pastel colors, and cozy storybook lighting.";
  }

  async generateCharacters() {
    return [
      { name: "Mira", age: 32, description: "A thoughtful traveler who follows the river at dusk.", visualPrompt: "Adult woman with dark wavy hair, a moss-green coat, leather satchel, and warm brown boots." },
      { name: "Jon", age: 38, description: "Mira's calm companion and keeper of the old lantern.", visualPrompt: "Adult man with short silver-streaked hair, round glasses, a navy wool coat, and a brass lantern." },
    ];
  }

  async generatePortrait() {
    return { data: DEMO_PNG, mimeType: "image/png" as const };
  }

  async generateChapter() {
    return {
      title: "Lanterns by the River",
      scenePrompt: "At dusk beside a winding river, Mira lifts an old brass lantern while Jon watches the first warm light reflect across the water; reeds move in the breeze and distant trees frame the quiet discovery.",
    };
  }

  async generateIllustration(_fileUri: string, _prompt: string, _portraits: GeminiImageReference[]) {
    return { data: DEMO_PNG, mimeType: "image/png" as const };
  }
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book";
}
