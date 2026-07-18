#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderHtmlTemplate } from '../src/core/cloud/html-template.js';

/**
 * Render a checked-in HTML template from a JSON object.
 * @param {string} templatePath Template path.
 * @param {string} dataPath JSON data path.
 * @param {string} outputPath Output HTML path.
 * @returns {string} Output path.
 */
export function renderTemplateFile(templatePath, dataPath, outputPath) {
  const data = JSON.parse(readFileSync(resolve(dataPath), 'utf8'));
  const html = renderHtmlTemplate(
    pathToFileURL(resolve(templatePath)),
    data
  );
  const target = resolve(outputPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  return target;
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const templatePath = getArgument('--template');
  const dataPath = getArgument('--data');
  const outputPath = getArgument('--output');
  if (!templatePath || !dataPath || !outputPath) {
    throw new Error(
      'Usage: node scripts/render-html-template.js --template FILE --data FILE --output FILE'
    );
  }
  console.log(renderTemplateFile(templatePath, dataPath, outputPath));
}
