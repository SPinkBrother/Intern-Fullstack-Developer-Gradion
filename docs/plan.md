# Gradion Staged Implementation Plan

## Completed checkpoints

- [x] Authentication
  - Dedicated login and registration pages.
  - Salted password hashing, persisted HTTP-only cookie sessions, restore, and sign-out.
  - Brown pastel responsive styling implemented with Tailwind CSS theme tokens and focused tests.
- [x] Project list and empty state
  - Authenticated, user-scoped `GET /api/projects`.
  - Loading, failure, empty, and populated list layouts based on `app-demo.html`.
  - Title, created date, and draft status.
  - `#/projects/new` navigation seam prepared for the next checkpoint.
- [x] New project with paste/upload and local storage
  - Required project title and book content validation in the UI and API.
  - Direct text pasting and `.txt` file loading.
  - Authenticated `POST /api/projects` with locally persisted books under `storage/books`.
  - Draft project creation and navigation to a simple saved-book detail view.
- [x] Book preview
  - Authenticated, owner-only endpoint for reading the locally saved `.txt` book.
  - Short preview and in-page full-book dialog on the existing project detail view.
- [x] Optional manual art style
  - Owner-only project endpoint for saving or clearing a manual style description.
  - Blank style is explicitly reserved for deriving the style from the book during later Gemini integration.
  - Five-stage progress bar mirrors `app-demo.html`; saving a style immediately marks Style complete and shows Characters as next.
- [x] Gemini style setup
  - Backend-only Gemini REST client configured through `GEMINI_API_KEY` and `GEMINI_TEXT_MODEL`.
  - Blank manual style can upload the local book once and generate a persisted visual style.
  - Saved Gemini file references are reusable by later steps while valid.
  - Persisted style execution state plus a per-project in-memory guard blocks duplicate active requests; GET and polling remain read-only.
- [x] Adult characters and portraits
  - Gemini structured output is validated server-side, filters out minors, and stores no more than two main adult characters.
  - Portraits use `gemini-3.1-flash-image` through Interactions, generate sequentially, and persist under `storage/portraits`.
  - Owner-only portrait endpoints serve local images; duplicate active requests are rejected per project and stage.
  - Style becomes immutable once characters exist so later portrait and illustration consistency is preserved.
  - Pre-flight safety waits for uploaded books to become `ACTIVE`, preserves returned JPEG/PNG formats, and recovers orphan portrait files without another Gemini call.
- [x] Meaningful chapter prompt form
  - Gemini selects one visually meaningful, plot-relevant scene using the reusable book file, established style, and character context.
  - Structured output and server validation enforce a maximum of one chapter.
  - The generated title and scene prompt remain editable and persist without leaving the project detail page.

The final chapter illustration is intentionally not implemented yet.

## Later checkpoints

After the authentication checkpoint is approved, plan and implement one reviewable slice at a time:

1. [x] Project list and empty state.
2. [x] New project with paste/upload and local storage.
3. [ ] Persistent pipeline state and concurrency guard.
4. [x] Gemini text steps: style and adult characters.
5. [x] Portrait generation and per-item progress.
6. [x] Chapter prompt form.
7. [ ] Consistent final illustration.
8. [ ] Failure recovery, final documentation, and complete verification.
