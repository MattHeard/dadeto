import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(root, 'docs', 'toys');
const sourceRoot = process.env.MANUAL_SOURCE_ROOT || docsRoot;

function sections(markdown) {
  const matches = [...markdown.matchAll(/^## (?!#)(.+)$/gm)];
  return matches.map((match, index) => ({
    title: match[1].trim(),
    body: markdown.slice(match.index + match[0].length, matches[index + 1]?.index ?? markdown.length).trim(),
  }));
}

function findSection(all, names) {
  return all.find((section) => names.includes(section.title.toLowerCase()));
}

function addExample(body, fallback) {
  if (/^### Example$/m.test(body)) return body;
  const fence = body.search(/^```/m);
  if (fence >= 0) return `${body.slice(0, fence).trim()}\n\n### Example\n\n${body.slice(fence).trim()}`;
  return `${body.trim()}\n\n### Example\n\n${fallback}`.trim();
}

function normalize(markdown) {
  const all = sections(markdown);
  const input = findSection(all, ['input', 'input format', 'input formats']);
  const output = findSection(all, ['output', 'output format', 'output formats']);
  const schema = findSection(all, ['json schema', 'schema']);
  if (!input || !output) throw new Error('missing Input or Output section');

  input.title = 'Input';
  output.title = 'Output';
  input.body = addExample(input.body, '```json\n{"example": true}\n```');
  if (!/^### Schema$/m.test(input.body)) {
    const schemaBody = schema?.body || '```json\n{"type":"object"}\n```';
    input.body = `${input.body.trim()}\n\n### Schema\n\n${schemaBody.trim()}`;
  }
  output.body = addExample(output.body, '```json\n{"example": true}\n```');

  const kept = all.filter((section) => section !== schema && section !== input && section !== output);
  const inputIndex = all.indexOf(input);
  const outputIndex = all.indexOf(output);
  kept.splice(kept.findIndex((section) => all.indexOf(section) > inputIndex), 0, input);
  const outputBefore = kept.findIndex((section) => all.indexOf(section) > outputIndex);
  kept.splice(outputBefore < 0 ? kept.length : outputBefore, 0, output);

  const preamble = markdown.slice(0, markdown.search(/^## (?!#)/m)).trim();
  return `${preamble}\n\n${kept.map((section) => `## ${section.title}\n\n${section.body.trim()}`).join('\n\n')}\n`;
}

for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === '_template') continue;
  const target = path.join(docsRoot, entry.name, 'manual.md');
  if (!fs.existsSync(target)) continue;
  const source = path.join(sourceRoot, entry.name, 'manual.md');
  fs.writeFileSync(target, normalize(fs.readFileSync(source, 'utf8')));
}
