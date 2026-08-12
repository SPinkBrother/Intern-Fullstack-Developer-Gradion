# Gradion — Authentication Checkpoint

This repository currently contains the first two staged checkpoints: authentication, plus the authenticated project list and empty state.

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

## Test

```sh
./test.sh
```

The New project buttons route to a clearly labeled next-checkpoint placeholder. Book upload, project creation, Gemini, and illustration features are not implemented yet.
