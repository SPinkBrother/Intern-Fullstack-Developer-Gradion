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

Gemini integration and the five-step illustration pipeline are intentionally not implemented yet.

## Later checkpoints

After the authentication checkpoint is approved, plan and implement one reviewable slice at a time:

1. [x] Project list and empty state.
2. [x] New project with paste/upload and local storage.
3. [ ] Persistent pipeline state and concurrency guard.
4. [ ] Gemini text steps: style and adult characters.
5. [ ] Portrait generation and per-item progress.
6. [ ] Chapter prompt and consistent final illustration.
7. [ ] Failure recovery, final documentation, and complete verification.
