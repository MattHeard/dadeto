#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const toysRoot = path.resolve('docs/toys');
const toyDirectories = fs.readdirSync(toysRoot).filter(name => {
  const toyPath = path.join(toysRoot, name);
  return name !== '_template' && fs.statSync(toyPath).isDirectory();
});

const requiredHeadings = [
  '## What this toy does',
  '## Input',
  '## Output',
  '## Behavior',
];
const forbiddenPhrases = [
  'focused toy for exercising',
  'documented behavior',
  'the fields shown above',
];

function fail(toy, message) {
  throw new Error(`${toy}: ${message}`);
}

function extractSchema(markdown, toy) {
  const matches = [...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map(match => match[1])
    .filter(candidate => candidate.includes('"$schema"'));
  if (matches.length !== 1) fail(toy, 'must contain exactly one JSON Schema block');
  try {
    return JSON.parse(matches[0]);
  } catch (error) {
    fail(toy, `JSON Schema is invalid: ${error.message}`);
  }
}

for (const toy of toyDirectories) {
  const manualPath = path.join(toysRoot, toy, 'manual.md');
  const markdown = fs.readFileSync(manualPath, 'utf8');
  for (const heading of requiredHeadings) {
    if (!markdown.includes(heading)) fail(toy, `missing heading ${heading}`);
  }
  for (const phrase of forbiddenPhrases) {
    if (markdown.includes(phrase)) fail(toy, `contains scaffold phrase: ${phrase}`);
  }
  if (/```json\n\{\}\n```/.test(markdown)) fail(toy, 'contains an empty JSON example');
  const schema = extractSchema(markdown, toy);
  if (!schema.type) fail(toy, 'schema must declare type');
  const properties = Object.keys(schema.properties ?? {});
  for (const property of properties) {
    if (/^[A-Z]+\d+$/.test(property) || property === 'setLocalPermanentData') {
      fail(toy, `schema exposes an internal property: ${property}`);
    }
  }
}

const blog = JSON.parse(fs.readFileSync('src/build/blog.json', 'utf8'));
const manuals = blog.posts.flatMap(post =>
  (post.content ?? []).filter(item => item?.type === 'manual')
);
if (manuals.length !== toyDirectories.length) {
  fail('blog manifest', `expected ${toyDirectories.length} manuals, found ${manuals.length}`);
}

const filesystemManuals = toyDirectories.map(toy =>
  fs.readFileSync(path.join(toysRoot, toy, 'manual.md'), 'utf8').trimEnd()
);
for (const markdown of filesystemManuals) {
  if (!manuals.some(manual => manual.markdown?.trimEnd() === markdown)) {
    fail('blog manifest', 'does not contain a filesystem manual verbatim');
  }
}

console.log(`Validated ${toyDirectories.length} toy manuals.`);
