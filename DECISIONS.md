# Engineering decisions

## Why i'm using Typescript instead of JavaScript

I'd prefer javascript because i want to minimize the error of schema type, and readable type when it come to AI code.
And this project is base on JSON from Gemini API (as list of characters, chapters). If the type is not strict it could make AI handle bad schema and come with runtime error. With Typescript AI will strict to the schema at first, so it can make code readable and easy to maintain.

## Tailwind CSS for frontend styling

The frontend uses Tailwind CSS through its Vite plugin. The brown pastel palette, typography, shadows, and animations live in one `@theme` block, while components use responsive utility classes. This adds a build-time dependency but removes the growing set of page-specific CSS selectors and keeps future UI work consistent with the existing design system.

