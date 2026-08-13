# Gradion — Book Illustration Studio

This repository currently contains authentication, user-owned projects, local book ingestion and preview, Gemini Style and adult Character extraction, and locally stored character portraits.

The React frontend uses Tailwind CSS with the brown pastel palette defined as reusable theme tokens in `apps/web/src/styles.css`.

## Run

```sh
cp .env.example .env
./start.sh
```

Open <http://localhost:5173/#/login>. Registration is available at <http://localhost:5173/#/register>.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Set `GEMINI_API_KEY` in `.env` before using **Generate style from book**. `GEMINI_TEXT_MODEL` defaults to `gemini-3.5-flash`. The key is read only by the backend and `.env` is ignored by Git.
Portrait generation uses `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image` and stores output under `PORTRAITS_DIR=storage/portraits`.

## Authentication API

- `POST /api/auth` — `{ "email", "password" }`
- `POST /api/auth/register` — `{ "name", "email", "password" }`
- `GET /api/auth` — restore the current session
- `DELETE /api/auth` — sign out
- `GET /api/projects` — list projects owned by the signed-in user

Passwords are salted and hashed with Node's built-in `scrypt`. Sessions use an HTTP-only, SameSite=Lax cookie and only its SHA-256 hash is stored in `data/store.json`.

## Project API and storage

- `GET /api/projects` lists projects owned by the signed-in user.
- `POST /api/projects` creates a draft project from `{ "title", "bookContent" }`.
- `GET /api/projects/:projectId` loads an owned project.
- `GET /api/projects/:projectId/book` reads the locally stored book for its owner.
- `PATCH /api/projects/:projectId/style` saves or clears a manual style.
- `POST /api/projects/:projectId/style/generate` derives a style with Gemini when no manual style exists.
- `POST /api/projects/:projectId/characters/generate` extracts no more than two adult characters.
- `POST /api/projects/:projectId/portraits/generate` generates missing portraits sequentially.
- `GET /api/projects/:projectId/portraits/:characterId` serves an owned portrait.

Project metadata remains in `data/store.json`. Book text is stored locally at `storage/books/{project_id}.txt`; it is uploaded to Gemini only when the user explicitly requests style generation.

## Test

```sh
./test.sh
```

Chapters and final illustrations are not implemented yet.
