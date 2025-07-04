#!/usr/bin/env node

// This CLI script demonstrates how to call the generateBlogOuter function from the command line.
// Make sure your package.json has "type": "module" if you're using ES modules.

import { generateBlogOuter } from './src/generator/generator.js';
import { createRequire } from 'module';
import fs from 'fs';
import prettier from 'prettier';

const require = createRequire(import.meta.url);

// Construct a sample blog object
const blog = require('./src/blog.json');

// Generate the HTML using generateBlogOuter
const outputHTML = generateBlogOuter(blog);

// Format the HTML using Prettier
const formatHTML = async html => {
  const options = await prettier.resolveConfig('./.prettierrc');
  return prettier.format(html, {
    ...options,
    parser: 'html',
  });
};

// Format and write the HTML to a file
const writeFormattedHTML = async () => {
  try {
    const formattedHTML = await formatHTML(outputHTML);
    fs.writeFileSync('public/index.html', formattedHTML, 'utf8');
    console.log(
      'HTML formatted with Prettier and written to public/index.html'
    );
  } catch (error) {
    console.error('Error formatting HTML:', error);
    // Fall back to unformatted HTML if formatting fails
    fs.writeFileSync('public/index.html', outputHTML, 'utf8');
    console.log('Unformatted HTML written to public/index.html');
  }
};

// Execute the async function
writeFormattedHTML();
