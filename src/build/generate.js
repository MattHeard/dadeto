#!/usr/bin/env node

// This CLI script demonstrates how to call the generateBlogOuter function from the command line.
// Make sure your package.json has "type": "module" if you're using ES modules.

import { createRequire } from 'module';
import fs from 'fs';
import prettier from 'prettier';

import { generateBlogOuter } from './generator.js';
import { createWriteFormattedHtml } from '../core/build/buildCore.js';

const require = createRequire(import.meta.url);

// Construct a sample blog object
const blog = require('../blog.json');

const writeFormattedHtml = createWriteFormattedHtml({
  generateHtml: generateBlogOuter,
  resolveConfig: prettier.resolveConfig,
  formatHtml: prettier.format,
  writeFile: fs.writeFileSync,
  logInfo: console.log,
  logError: console.error,
});

writeFormattedHtml({
  blog,
  configPath: './.prettierrc',
  outputPath: 'public/index.html',
  encoding: 'utf8',
  parser: 'html',
});
