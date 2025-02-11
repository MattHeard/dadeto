#!/usr/bin/env node

// This CLI script demonstrates how to call the generateBlogOuter function from the command line.
// Make sure your package.json has "type": "module" if you're using ES modules.

import { generateBlogOuter } from './src/generator.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';

// Construct a sample blog object
const blog = require('./src/blog.json');

// Generate the HTML using generateBlogOuter
const outputHTML = generateBlogOuter(blog);

// Write the generated HTML to a file
fs.writeFileSync('public/index.2025-02.html', outputHTML, 'utf8');
