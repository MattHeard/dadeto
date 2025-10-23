# Build Module

This directory contains the logic used to build the static HTML blog. Each file focuses on a specific part of the generation process.

## Files

- **`generator.js`** – orchestrates the creation of the blog page. It assembles the header, articles, media sections and footer, and exposes `generateBlogOuter` for use by the CLI.
- **`head.js`** – produces the `<head>` element with fonts, icons, inline styles and the component registry script.
- **`html.js`** – low‑level helpers for constructing HTML tags, attributes and the final document wrapper.
- **`styles.js`** – returns the CSS rules embedded in the generated page.
- **`title.js`** – provides the ASCII banner displayed at the top of the blog.
- **`full-width.js`** – utility for inserting a placeholder row that spans both columns of the layout.
- **`copy.js`** – CLI script that copies data and interactive component files from `src/` to `public/`.

## Usage

The `src/build/generate.js` script demonstrates invoking `generateBlogOuter` with the blog JSON data and writing the formatted HTML to `public/index.html`.

Run `npm run generate` to create the blog output. Interactive component files can be copied by running `node src/build/copy.js`.
