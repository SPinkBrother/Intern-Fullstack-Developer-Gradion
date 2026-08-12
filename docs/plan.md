# Gradion Staged Implementation Plan

## Current checkpoint — Authentication

Implement and review only:

- A dedicated login page at `#/login`.
- A dedicated registration page at `#/register`.
- Login with email and password.
- Registration with name, email, and password.
- Salted password hashing and persisted HTTP-only cookie sessions.
- Session restore and sign-out.
- Brown pastel responsive styling.
- Focused backend and frontend authentication tests.

Project creation, Gemini integration, the five-step illustration pipeline, and project UI are intentionally not implemented yet.

## Later checkpoints

After the authentication checkpoint is approved, plan and implement one reviewable slice at a time:

1. Project list and empty state.
2. New project with paste/upload and local storage.
3. Persistent pipeline state and concurrency guard.
4. Gemini text steps: style and adult characters.
5. Portrait generation and per-item progress.
6. Chapter prompt and consistent final illustration.
7. Failure recovery, final documentation, and complete verification.
