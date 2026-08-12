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

