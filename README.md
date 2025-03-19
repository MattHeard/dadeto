# Dadeto - Blog Generator

A simple, elegant static blog generator that transforms JSON content into a styled HTML blog.

## Overview

Dadeto is a lightweight, JavaScript-based static site generator designed to create a personal blog from structured JSON data. It converts blog posts defined in a JSON file into a fully formatted HTML page with support for various media types including text, images, audio, and YouTube embeds.

## Features

- **Static Site Generation**: Generates a complete HTML blog from JSON data
- **Media Support**: Handles text, images, audio files, and YouTube embeds
- **Related Links**: Supports linking to related content
- **Responsive Design**: Creates a clean, readable blog layout
- **Formatting**: Uses Prettier for consistent HTML formatting
- **Text Formatting**: Supports basic text formatting like bold text

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm

### Usage

1. Edit the blog content in `src/blog.json`
2. Generate the HTML:
   ```
   npm run generate
   ```
3. The generated blog will be available at `public/index.html`

## Development

### Project Structure

- `src/` - Source code
  - `blog.json` - Blog content in JSON format
  - `generator.js` - Main generator logic
  - `html.js` - HTML utility functions
  - `textFormatter.js` - Text formatting utilities
  - Other component files
- `public/` - Generated output and static assets
- `test/` - Test files

### Commands

- `npm test` - Run all tests
- `npm run test-watch` - Run tests in watch mode
- `npm test -- -t "test pattern"` - Run specific test matching pattern
- `npm run generate` - Generate the blog HTML
- `./tcr.sh [commit message]` - Test && Commit || Revert (TCR workflow)

### Code Style

- **ES Modules**: Uses import/export syntax
- **Naming**: Constants in UPPERCASE, functions in camelCase
- **Function Docs**: JSDoc comments for functions
- **HTML Generation**: Composable helper functions
- **Error Handling**: Defensive coding (null checks)
- **Quotation**: Double quotes for HTML attributes and strings
- **Constants**: Reusable constants for HTML elements/attributes
- **Security**: Uses escapeHtml for user-provided content
- **Formatting**: Consistent indentation (2 spaces)
- **File Structure**: Modular components in separate files

## Blog Post Format

Blog posts are defined in the `src/blog.json` file with the following structure:

```json
{
  "posts": [
    {
      "key": "UNIQUE_KEY",
      "title": "Post Title",
      "publicationDate": "YYYY-MM-DD",
      "content": [
        "Paragraph 1",
        "Paragraph 2",
        "..."
      ],
      "illustration": {
        "fileType": "png|webp",
        "altText": "Description of the image"
      },
      "audio": {
        "fileType": "m4a"
      },
      "youtube": {
        "id": "YOUTUBE_VIDEO_ID",
        "title": "Video Title",
        "timestamp": 0
      },
      "relatedLinks": [
        {
          "url": "https://example.com",
          "title": "Link Title",
          "author": "Author Name",
          "type": "article|book|microblog"
        }
      ]
    }
  ]
}
```

## License

All content is authored by Matt Heard and is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), unless otherwise noted.
