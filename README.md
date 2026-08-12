# Gradion — Authentication Checkpoint

This repository currently contains authentication, the authenticated project list, and local project creation from pasted or uploaded text.

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

Project metadata remains in `data/store.json`. Book text is stored locally at `storage/books/{project_id}.txt` and is not sent to Gemini during project creation.

## Test

```sh
./test.sh
```

Gemini and illustration pipeline features are not implemented yet.
