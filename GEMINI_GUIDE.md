# Using real Gemini instead of demo mode

Gradion uses demo mode only when `GEMINI_MOCK_MODE=true`. Real mode uses the same buttons, API routes, project state, locks, and local storage; only the Gemini service changes.

## 1. Create a Gemini API key

Create or view a key in [Google AI Studio](https://aistudio.google.com/app/apikey). Google recommends keeping the key in an environment variable and never exposing it in browser code or committing it to Git.

Image generation may require available quota or a project with billing enabled. Current limits and usage are available in Google's [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits) and [usage dashboard](https://ai.dev/rate-limit).

## 2. Configure Gradion

From the repository root, create `.env` if it does not exist:

```powershell
Copy-Item .env.example .env
```

Set these values in `.env`:

```dotenv
GEMINI_API_KEY=your_real_api_key_here
GEMINI_MOCK_MODE=false
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

Keep `.env` private. It is already ignored by Git. The API key is read by the Express backend and is not sent to the React application.

## 3. Restart the application

Environment values are loaded when the backend and Vite start, so stop the current development process and run:

```powershell
npm.cmd run dev
```

Open <http://localhost:5173/>. The **Demo mode** notice should no longer appear.

## 4. Run the real five-stage pipeline

Create a **new project** with a title and book text, then run each action in order:

1. Save a manual style or select **Generate style from book**.
2. Select **Generate Characters**.
3. Select **Generate Portraits**.
4. Select **Generate Chapter**, review the scene, and save any edits.
5. Select **Generate Illustration**.

Use a new project for this check. Completed demo projects retain their locally saved placeholder portraits and illustration; Gradion correctly reuses those files instead of spending another Gemini request.

Gemini work starts only from POST actions. Refreshing the page and GET polling are read-only, and failed requests retry only when you press the retry button.

## Troubleshooting

- **Out of quota:** Check the usage dashboard and billing/quota for the Google Cloud project linked to the key. Gradion shows a short `Out of quota.` message; it does not automatically retry.
- **Demo notice still appears:** Confirm `GEMINI_MOCK_MODE=false`, save `.env`, and restart both apps.
- **API key error:** Check for extra spaces or quotes in `GEMINI_API_KEY`, then restart the stack.
- **Model unavailable:** Update the model value in `.env` to a model available to your Gemini project. No code change is required.

## Switch back to demo mode

Set `GEMINI_MOCK_MODE=true` in `.env` and restart. Demo mode consumes no Gemini quota and remains useful for reviewing the complete application flow.
