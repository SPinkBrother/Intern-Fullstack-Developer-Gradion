# Engineering decisions

## Why i'm using Typescript instead of JavaScript

I'd prefer javascript because i want to minimize the error of schema type, and readable type when it come to AI code.
And this project is base on JSON from Gemini API (as list of characters, chapters). If the type is not strict it could make AI handle bad schema and come with runtime error. With Typescript AI will strict to the schema at first, so it can make code readable and easy to maintain.

## Tailwind CSS for frontend styling

The frontend uses Tailwind CSS through its Vite plugin. The brown pastel palette, typography, shadows, and animations live in one `@theme` block, while components use responsive utility classes. This adds a build-time dependency but removes the growing set of page-specific CSS selectors and keeps future UI work consistent with the existing design system.

## Local book ingestion

The browser reads an uploaded `.txt` file and sends the resulting text through the same JSON contract used for pasted content. This keeps `POST /api/projects` simple and avoids a multipart dependency. Requests are capped at 10 MB. Metadata stays in `data/store.json`, while book files use the separately configurable `BOOKS_DIR`, which defaults to `storage/books`; this preserves existing local authentication data while keeping media-like content separate.

## Book preview

The project detail view reads book text through an authenticated, owner-scoped API endpoint. A short excerpt is shown in the page and the complete text opens in an in-page dialog, avoiding another route or page reload. Loading the complete text is acceptable for this assignment because book uploads are already capped at 10 MB.

## Optional manual art style

Art style is optional project metadata. A non-empty value is treated as the user's chosen direction; clearing it leaves the project ready for the future Gemini style step to derive a style from the stored book text. Saving a style does not introduce or advance pipeline state yet.

## Gemini style integration

Gemini is called only from Express through REST, keeping the API key out of the browser and avoiding another SDK dependency. When no manual style exists, the backend uploads the local `.txt` file through Gemini Files, persists its reusable file reference, and generates the style from that reference. Gemini files expire, so a later user-triggered step may upload the local source again only when the saved reference is no longer valid.

The Style call uses a small per-project in-memory guard and persisted `styleState`. The guard prevents duplicate concurrent calls in one server process, while persisted state lets refresh and polling display progress without triggering work. This is intentionally smaller than the full pipeline state machine planned for later.

The text model default is `gemini-3.5-flash`. The existing `generateContent` REST endpoint remains appropriate for this one-shot Style operation and is supported by Gemini 3.5 Flash; a broader migration to the Interactions API can be considered when implementing the later multi-step pipeline.

## Character portraits

Character extraction continues to use structured text output from the reusable Gemini book file. The server filters for adults and caps the stored list at two even if the model returns more. Portraits use the recommended `gemini-3.1-flash-image` model through the Interactions API because Imagen is deprecated. Images are generated sequentially and stored on local disk, and the selected style is locked once characters exist to maintain visual consistency.

Gemini file processing is polled only until the original upload becomes `ACTIVE`, with a bounded timeout; this is not an automatic model-call retry. Portrait filenames follow Gemini's returned MIME type. The image is written before the atomic JSON metadata update, and retries first look for an existing `.jpg` or `.png` so a crash between those writes does not spend another image-generation call.

