#!/usr/bin/env node

// This CLI script demonstrates how to call the generateBlogOuter function from the command line.
// Make sure your package.json has "type": "module" if you're using ES modules.

import { generateBlogOuter } from './src/generator.js';

// Construct a sample blog object
const sampleBlog = {
  posts: [
    { key: "CLIP1", title: "CLI Test Post", content: "This is a command line sample post." }
  ]
};

// Generate the HTML using generateBlogOuter
const outputHTML = generateBlogOuter(sampleBlog);

// Print the generated HTML to the console
console.log(outputHTML);
