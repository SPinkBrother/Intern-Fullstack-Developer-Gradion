# AGENTS.md — AI Copilot Guidelines & System Context

This document defines the strict rules, constraints, architecture, and workflow for any AI coding assistant (OpenAI Codex, Claude, Cursor) working on this repository.

---

## 01 · Project Overview

We are building a full-stack web application that converts book text into character portraits and chapter illustrations using the **Google Gemini API**.

### The Reference Pipeline (Strict Requirement)

The backend pipeline **must strictly follow** steps 1–5 of Google's notebook (`Book_illustration.ipynb`):

1. **Style**: Generate an art style from the book text or accept user input.
2. **Characters**: Produce structured output of the main **adult** characters with visual prompts (**maximum 2 characters, enforced server-side**).
3. **Portraits**: Generate one portrait image per character.
4. **Chapters**: Produce structured chapter illustration prompts that reference the characters (**maximum 1 chapter, enforced server-side**).
5. **Illustrations**: Generate one scene illustration per chapter, reusing portraits for visual consistency.

---

## 02 · Critical Architectural Rules & Constraints

### 1. Cost & Context Discipline

- **Do not** resend the full book text on every step.
- Upload or send the book content **once** and reuse it across steps using Gemini session/chat context chaining or file references.
- Never automatically retry Gemini API calls in a loop. Retries must be strictly user-triggered.

### 2. Concurrency & Duplicate Request Guard

- Refreshing, opening a second tab, or double-clicking **must not** trigger a duplicate Gemini API call.
- The server must maintain an execution lock (for example, an in-memory mutex or file lock) per project step.
- Mid-flight requests must return the existing in-progress state to the client.

### 3. State Management & Resumability

- Separate overall project status (`draft`, `in_progress`, `completed`, `failed`) from `current_step` (1–5) and step execution state (`idle`, `running`, `failed`).
- Any project can stop and resume at any step after a page refresh or server restart.
- Stranded steps caused by a server crash must have a clean recovery path, such as a timeout or user-facing retry button.

### 4. Storage Requirements

- Keep it simple: use local disk storage (JSON files plus a static media directory) or SQLite.
- All images and book `.txt` files must be stored on the local filesystem and served through backend endpoints. No S3 or cloud storage is required.

### 5. Backend & Frontend Enforcement

- Character limits (maximum 2) and chapter limits (maximum 1) must be strictly validated **on the server side**, not merely hidden in the UI.

---

## 03 · AI Assistant Operating Mode

1. **Spec-Driven Development**: Always check code proposals against this file and `docs/plan.md`.
2. **No Over-Engineering**: Prefer boring, simple, readable solutions over complex abstractions or unnecessary dependencies.
3. **Write Tests First / TDD**: Write tests for backend step ordering and locks, and UI loading and error states, before completing features.
4. **Transparent Authoring**: Always notify the human driver of architectural trade-offs so they can be documented in `DECISIONS.md`.

---

## 04 · Tech Stack

- **Backend**: Node.js / Express
- **Frontend**: React
- **Storage**: JSON files with a file mutex lock
- **Gemini API**: REST endpoints
- **Gemini Text Model**: `gemini-2.5-flash` (or current equivalent)
- **Gemini Image Model**: `imagen-3.0-generate-002` (or current equivalent)

---

## 05 · Commands

- **Start Stack**: `./start.sh`
- **Run Tests**: `./test.sh`
