# Engineering decisions

## Why i'm using Typescript instead of JavaScript

I'd prefer javascript because i want to minimize the error of schema type, and readable type when it come to AI code.
And this project is base on JSON from Gemini API (as list of characters, chapters). If the type is not strict it could make AI handle bad schema and come with runtime error. With Typescript AI will strict to the schema at first, so it can make code readable and easy to maintain.

