# Testing

## Strategy

Backend tests cover authentication ownership, project storage, step ordering, duplicate execution guards, structured output caps, image MIME persistence, recovery, failure state, and the final illustration prompt. The API suite also runs all five pipeline stages through `MockGeminiService`; it uses the real Express routes and local storage without network calls or Gemini quota.

Frontend component tests cover authentication, empty/project states, text upload, book preview, each pipeline action, illustration polling, persisted errors, retry, final image display, and the visible demo-mode notice.

Deliberately excluded: visual image-quality assertions and a live Gemini call in CI. Provider output is nondeterministic, costs quota, and the current development key has no image quota. A live manual smoke test should be performed when quota is available; `GEMINI_MOCK_MODE=false` restores the real service.

## Test report

Actual local run on August 13, 2026 using `npm.cmd test`:

- API: 25 tests passed across 3 files.
- Web: 14 tests passed across 1 file.
- Total: 39 tests passed.
- API TypeScript build passed.
- Web TypeScript and Vite production build passed.
