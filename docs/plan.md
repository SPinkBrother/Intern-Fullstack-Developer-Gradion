# Gradion Book Illustration Studio — Implementation Plan

## 1. Purpose

Build a local full-stack application that turns a book's text into an art style, up to two adult character portraits, and one chapter illustration through a user-driven five-step Gemini pipeline.

The implementation must satisfy the take-home assessment, `AGENTS.md`, and steps 1–5 of Google's `Book_illustration.ipynb`. The reference `app-demo.html` defines the minimum UI scope but is not an implementation source for persistence, concurrency, or timing.

## 2. Scope

### In scope

- Lightweight identity using name and email, without passwords or OAuth.
- Multiple projects per user.
- Project creation from pasted text or an uploaded `.txt` file.
- A five-step pipeline run explicitly and in order by the user:
  1. Style
  2. Characters
  3. Portraits
  4. Chapters
  5. Illustrations
- Persistent progress, outputs, failures, and Gemini interaction identifiers.
- Server-side duplicate-execution protection and stale-step recovery.
- Local JSON metadata plus local book and image files.
- Backend and frontend tests, including a real test-run report.
- One start command and one test command.

### Out of scope

- Passwords, OAuth, email verification, and production-grade authentication.
- Cloud storage, deployment, queues, workers, WebSockets, and distributed locks.
- Veo animation, Lyria music, TTS narration, audiobook features, and media mixing.
- Automatic Gemini retries.
- Public hosting.

## 3. Technical Direction

### Stack

- Node.js with npm workspaces.
- Express backend written in TypeScript.
- React frontend built with Vite and TypeScript.
- JSON files for application metadata.
- Local directories for original book text and generated images.
- Vitest for shared test execution.
- Supertest for backend HTTP tests.
- React Testing Library for frontend component tests.
- Zod for validating request bodies, persisted records, and Gemini structured output.

### Repository layout

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── storage/
│   │   │   ├── gemini/
│   │   │   └── domain/
│   │   └── tests/
│   └── web/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── pages/
│       │   └── test/
│       └── tests/
├── data/                    # gitignored runtime data
│   ├── store.json
│   ├── books/<project-id>/book.txt
│   └── media/<project-id>/
├── docs/
├── AGENTS.md
├── DECISIONS.md
├── TESTING.md
├── README.md
├── start.sh
└── test.sh
```

Keep modules small and domain-oriented, but do not introduce repositories, dependency-injection containers, event buses, or other abstractions without a demonstrated need.

## 4. Architecture

```text
React client
    │ JSON API + session token
    ▼
Express API
    ├── identity/project routes
    ├── pipeline state machine
    ├── per-project execution locks
    ├── Gemini REST client
    └── atomic JSON/file storage
             │
             ├── store.json
             ├── book.txt files
             └── portrait/illustration images
```

The browser is a projection of server state. It may disable buttons for usability, but ordering, limits, ownership, retries, and duplicate-call prevention are enforced by the API.

## 5. Persistence Model

Use one `store.json` document for users, sessions, and project metadata. Store large text and binary image data in separate files.

### User

- `id`
- `name`
- `emailNormalized`
- `createdAt`
- `updatedAt`

### Session

- `tokenHash` or random opaque token
- `userId`
- `createdAt`

A bearer token returned at sign-in is sufficient for this local assessment. Persist it so a server restart does not sign the browser out unexpectedly. Never accept a user ID from the browser as authorization.

### Project

- `id`
- `userId`
- `title`
- `bookPath`
- `createdAt`
- `updatedAt`
- `status`: `draft | in_progress | completed | failed`
- `currentStep`: `1 | 2 | 3 | 4 | 5`
- `stepState`: `idle | running | failed`
- `runningStep`: `1 | 2 | 3 | 4 | 5 | null`
- `stepStartedAt`: ISO timestamp or `null`
- `lastError`: sanitized error information or `null`
- `style`: string or `null`
- `characters`: zero to two character records
- `chapters`: zero or one chapter record
- `gemini.bookFileName`
- `gemini.bookFileUri`
- `gemini.bookInteractionId`
- `gemini.textInteractionId`
- `gemini.imageInteractionId`
- `steps`: one record per step with state, start/end timestamps, error, and attempt count

### Character

- `id`
- `name`
- `prompt`
- `portraitPath`
- `portraitState`: `pending | running | completed | failed`
- `error`

### Chapter

- `id`
- `name`
- `prompt`
- `characterNames`
- `illustrationPath`
- `illustrationState`: `pending | running | completed | failed`
- `error`

### Safe writes

- Serialize all mutations through a process-level store mutex.
- Write complete JSON to a temporary file in the same directory, flush/close it, then atomically rename it over `store.json`.
- Never mutate the in-memory object without completing the corresponding disk write.
- Validate persisted JSON on startup and fail clearly if it is corrupt.
- Exclude `data/` from Git and create it automatically on first start.

## 6. Pipeline State Machine

| Step | Required prior result | Stored output | Next step |
| --- | --- | --- | --- |
| 1. Style | Project created and book context seeded | `style`, text interaction ID | 2 |
| 2. Characters | Style complete | 1–2 adult characters and prompts, text interaction ID | 3 |
| 3. Portraits | Characters complete | One local portrait per character, image interaction ID | 4 |
| 4. Chapters | Portraits complete | Exactly one chapter prompt referencing characters, text interaction ID | 5 |
| 5. Illustrations | Chapter complete | One local scene illustration | Complete |

Only the server advances `currentStep`. A request for any other step returns `409 Conflict` with the current project state and does not contact Gemini.

Before a Gemini call, persist `stepState=running`, `runningStep`, and `stepStartedAt`. Persist each generated image immediately so per-item progress survives refreshes. On success, save the result, mark the step complete, and advance. On failure, retain completed outputs, store a sanitized error, set `stepState=failed`, and wait for an explicit retry.

## 7. Gemini Integration

Use direct REST calls to the Gemini Files and Interactions APIs. Keep model IDs configurable:

- `GEMINI_TEXT_MODEL`, initially `gemini-2.5-flash` unless the pre-build Colab/API verification identifies a required current replacement.
- `GEMINI_IMAGE_MODEL`, initially `gemini-2.5-flash-image` (Nano Banana) unless the same verification identifies a better available free-tier/current equivalent.
- `GEMINI_API_KEY`, required and never committed.

Do not use the legacy `imagen-3.0-generate-002` path for the final implementation if it cannot accept portrait context. The current notebook uses a native Gemini image model and a chained image interaction specifically to preserve character consistency.

### One-time book context

Project creation saves the book locally. Before the first pipeline step, the backend:

1. Uploads `book.txt` once using the Files API.
2. Creates a seed text Interaction containing the uploaded document URI and a short instruction that the book will be illustrated.
3. Persists the file name, file URI, and seed interaction ID.

Subsequent text steps send only their new instruction and the previous interaction ID. They do not resend the full book.

The Files API currently expires uploaded files after a limited lifetime. If a file has expired but the existing Gemini interaction chain remains usable, continue with the chain. If the chain itself is no longer usable, surface a recoverable error and require explicit user action before re-uploading; record this trade-off in `DECISIONS.md`. Never silently create a second paid attempt.

### Step 1: style

- If the user supplies a style, send it into the text interaction so later prompts inherit it.
- Otherwise ask Gemini to produce a concise illustration style suited to the book.
- Persist the returned style and new text interaction ID.

### Step 2: characters

- Continue from the style interaction.
- Ask only for main adult characters and detailed image prompts grounded in the book.
- Request structured JSON with an array of `{ name, prompt }`.
- Include `maxItems: 2` in the schema where supported.
- Parse and validate with Zod, reject children if explicitly identified, and enforce `slice(0, 2)` only after recording that the upstream response exceeded the contract.
- Never persist more than two characters.

### Step 3: portraits

- Create a separate image interaction seeded once with the chosen style and image rules: family-friendly, single full image, no title, border, panels, or printed text.
- Generate each portrait sequentially using a 9:16 composition and the character prompt, chaining each call from the previous image interaction.
- Decode each returned image, validate its MIME type and size, write it under `data/media/<project-id>/`, then update the character record immediately.
- A retry resumes at the first missing/failed portrait and does not regenerate completed portraits.

### Step 4: chapters

- Continue the text chain from the character-prompt interaction.
- Request structured JSON for one chapter with `{ name, prompt, characterNames }`.
- Require a single-image scene, descriptive character appearances, and reuse of character prompts.
- Enforce `maxItems: 1` in the schema and validate again on the server.

### Step 5: illustrations

- Continue the image chain from the final portrait interaction so portrait context is available.
- Transition the image conversation from portraits to chapter scenes.
- Generate the chapter image with the stored chapter prompt and referenced characters, using a landscape composition.
- Persist the image immediately and mark the project completed.

### API-call policy

- No SDK-level or application-level automatic retry configuration.
- Apply request timeouts, but treat timeout as an uncertain result; keep the step recoverable and do not automatically repeat it.
- Log request IDs and model names, never the API key or complete book text.
- Convert upstream failures into safe application errors with enough detail for manual diagnosis.

## 8. Concurrency and Recovery

### Duplicate guard

- Maintain an in-memory mutex keyed by project ID.
- Acquire it with a non-waiting `tryLock` before any pipeline execution.
- While holding the lock, reread the latest project from disk and revalidate ownership, expected step, and execution state.
- If already running, return `202 Accepted` with the existing state and do not make a Gemini request.
- Persist the running state before releasing control to the long API call.

The persisted running marker protects after refresh and across requests; the mutex prevents races inside one server process. This application intentionally supports one local server instance only.

### Stranded-step recovery

- Define `STEP_STALE_AFTER_MS` through environment configuration, with a conservative default longer than expected image latency.
- A stale running step is displayed as interrupted, not automatically reset.
- `POST /projects/:id/steps/:step/recover` is user-triggered.
- Recovery obtains the project lock, confirms the same step is still stale, marks it failed/retryable, and makes no Gemini call.
- The next explicit retry runs only unfinished work for that step.

## 9. HTTP API

All project endpoints require the bearer session and verify ownership.

### Identity

- `POST /api/sessions` — validate name/email; find or create the user and return a session token.
- `DELETE /api/sessions/current` — sign out the current browser session.
- `GET /api/me` — return the current user.

### Projects

- `GET /api/projects` — list the user's projects with status and progress.
- `POST /api/projects` — accept multipart `.txt` upload or pasted text plus title; validate and create a draft.
- `GET /api/projects/:projectId` — return full project detail, including full book text.
- `GET /api/projects/:projectId/book` — serve the stored book as text if kept separate from detail.
- `GET /api/projects/:projectId/media/:fileName` — authorize and stream a generated image.

### Pipeline

- `POST /api/projects/:projectId/steps/1` — optional `{ style }`.
- `POST /api/projects/:projectId/steps/2`
- `POST /api/projects/:projectId/steps/3`
- `POST /api/projects/:projectId/steps/4`
- `POST /api/projects/:projectId/steps/5`
- `POST /api/projects/:projectId/steps/:step/recover` — stale-step recovery only.

The client polls `GET /api/projects/:projectId` while a step is running. Polling reads state only and never starts work.

## 10. Frontend Plan

### Screens

1. Identity form with inline name/email validation.
2. Project list with empty state, title, created date, status pill, and five-segment progress.
3. New-project form supporting `.txt` upload and pasted text with clear validation.
4. Project detail with full readable book text, five-step stepper, style, character cards, chapter card, media, and one primary action for the current step.

### Required states

- Loading skeleton or named loading state.
- Empty project list.
- Current step ready.
- Named step in progress.
- Per-character portrait progress and per-chapter illustration progress.
- Failed step with its error and retry action.
- Stale/interrupted step with recovery action.
- Completed project.
- Unauthorized/expired session.

### Interaction rules

- Disable the action locally after submission for immediate feedback, while relying on the server as the actual guard.
- On `202`, render the returned in-flight state and begin polling.
- On `409`, replace local state with the authoritative server state.
- Do not optimistically mark steps complete.
- Ensure keyboard focus, visible focus rings, labeled form controls, accessible status text, responsive layouts, reduced-motion support, and no layout shift as images arrive.

## 11. Test-First Plan

Use a fake `GeminiClient` at the service boundary. Tests must never consume quota.

### Backend tests written before implementation

- Rejects out-of-order steps without calling Gemini.
- Advances exactly one step after a successful result.
- Returns the existing running state for duplicate/double-click requests.
- Allows only one Gemini call for two concurrent requests.
- Persists failed state and permits only user-triggered retry.
- Does not regenerate completed portraits when retrying a partially failed portrait step.
- Allows user-triggered recovery only after the stale threshold.
- Enforces no more than two characters and one chapter even if Gemini returns more.
- Prevents one user from reading or running another user's project.
- Preserves state after recreating the storage/service instance to simulate restart.
- Uploads/sends book content once and chains later calls by interaction ID.

### Frontend tests written before implementation

- Project list empty state and progress/status rendering.
- Project detail loading and named in-progress state.
- Failed-step error and retry action.
- Stale-step recovery action.
- Portrait cards update independently as images become ready.
- Current-step action is disabled while submitting/running.
- Forms show validation errors for missing/invalid fields.

### Optional integration test

Run the full five-step happy path through Express using the fake Gemini client and real temporary JSON/media storage. Assert final state, exact external call count, local media files, and persisted restart behavior.

After implementation, run the real test command and paste the unedited summary into `TESTING.md`, along with what is intentionally untested and why.

## 12. Delivery Phases

### Phase 0 — Validate external assumptions

- Run steps 1–5 of the Google notebook in Colab before app code.
- Confirm the configured text and image model IDs are available to the provided API key.
- Confirm image-model free-tier/rate-limit behavior.
- Exercise Files upload and REST Interactions chaining manually.
- Save notes or prompts under `docs/` as AI artifacts.

### Phase 1 — Harness and domain tests

- Create npm workspaces, TypeScript configuration, lint/format scripts, and Vitest setup.
- Write state-machine, ordering, cap, concurrency, failure, and restart tests first.
- Define project schemas and fake Gemini behavior.

### Phase 2 — Storage and backend

- Implement atomic JSON storage and filesystem layout.
- Implement identity/session and ownership checks.
- Implement project CRUD and book/media endpoints.
- Implement pipeline coordinator, locks, stale recovery, and Gemini REST adapter.
- Make backend tests pass.

### Phase 3 — Frontend tests and UI

- Write component-state tests first.
- Build identity, list, create, and detail screens.
- Add polling, per-item progress, error/retry, and stale recovery.
- Match or exceed the reference demo's visual quality and responsive/accessibility behavior.

### Phase 4 — Real Gemini verification

- Run a minimal real project within the required 2/1 caps.
- Verify book upload occurs once, interaction IDs chain correctly, files persist locally, and character references influence the chapter image.
- Verify failures are visible and no automatic retry occurs.

### Phase 5 — Documentation and handoff

- Complete `README.md`, `.env.example`, `DECISIONS.md`, and `TESTING.md`.
- Add `start.sh` and `test.sh`, and verify both from a clean checkout.
- Confirm secrets and `data/` are ignored.
- Run tests and record the real output.
- Perform keyboard, responsive, refresh, second-tab, double-click, failure, retry, and restart UAT.
- Review Git history for small, meaningful commits and transparent AI attribution.

## 13. Definition of Done

- All five steps work end to end with real Gemini calls.
- The server enforces order, maximum two adult characters, and maximum one chapter.
- The full book is uploaded/sent to Gemini once per project and later text calls use interaction chaining.
- Portrait generation and chapter illustration share an image interaction context.
- Refresh, sign-out/sign-in, and server restart preserve completed results and the true current state.
- Duplicate requests cause at most one Gemini call.
- Failed and stranded steps have explicit, user-driven recovery without automatic retry.
- Each generated item becomes visible as soon as it is persisted.
- Backend and frontend tests pass through `./test.sh`.
- `./start.sh` starts the full stack.
- Required documentation and AI artifacts are committed.
- No API keys, runtime user data, or generated media are committed.

## 14. Decisions to Capture During Implementation

`DECISIONS.md` must reflect real discussion rather than copying this plan. Likely decision points include:

- JSON storage versus SQLite and the accepted single-process limitation.
- Separate project status, current step, and step execution state.
- Persisted running markers plus an in-memory project mutex.
- Polling instead of SSE/WebSockets.
- Gemini Interactions REST API and separate text/image chains.
- Native Gemini image generation instead of legacy Imagen for portrait-reference continuity.
- Any AI proposals rejected as unsafe, overcomplicated, or contrary to the cost rules.

Record at least three genuine AI overrides as they occur, including who proposed what, the pushback, the final choice, and its cost.

## 15. Reference Sources

- Assessment: `gradion-assessment-intern-software-engineer.md`
- Copilot rules: `AGENTS.md`
- UI reference: `app-demo.html`
- Google notebook: <https://github.com/google-gemini/cookbook/blob/main/examples/Book_illustration.ipynb>
- Gemini Files API: <https://ai.google.dev/gemini-api/docs/files>
- Gemini structured outputs: <https://ai.google.dev/gemini-api/docs/structured-output>
- Gemini image generation: <https://ai.google.dev/gemini-api/docs/image-generation>
