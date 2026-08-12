# Gradion — Authentication Checkpoint

This repository currently contains only the first implementation checkpoint: login, registration, cookie-session restoration, and sign-out.

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

Passwords are salted and hashed with Node's built-in `scrypt`. Sessions use an HTTP-only, SameSite=Lax cookie and only its SHA-256 hash is stored in `data/store.json`.

## Test

```sh
./test.sh
```

No project, book upload, Gemini, or illustration feature is implemented in this checkpoint.
