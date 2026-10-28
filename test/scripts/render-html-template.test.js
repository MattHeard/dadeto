import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderTemplateFile } from '../../scripts/render-html-template.js';

test('the local renderer reads template/data and creates the requested output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-template-cli-'));
  try {
    const template = path.join(root, 'template.html');
    const data = path.join(root, 'data.json');
    const output = path.join(root, 'nested/result.html');
    fs.writeFileSync(template, '<main>{{name}} {{name}}</main>');
    fs.writeFileSync(
      data,
      JSON.stringify({ name: '$& α <strong>Ada</strong>' })
    );
    expect(renderTemplateFile(template, data, output)).toBe(output);
    expect(fs.readFileSync(output, 'utf8')).toBe(
      '<main>$& α <strong>Ada</strong> $& α <strong>Ada</strong></main>'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a template read failure preserves an existing output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-template-cli-'));
  try {
    const data = path.join(root, 'data.json');
    const output = path.join(root, 'result.html');
    fs.writeFileSync(data, '{}');
    fs.writeFileSync(output, 'preserved');
    expect(() =>
      renderTemplateFile(path.join(root, 'missing.html'), data, output)
    ).toThrow();
    expect(fs.readFileSync(output, 'utf8')).toBe('preserved');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cloud packaging checks drift before assembling deployment sources', () => {
  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(manifest.scripts['build:cloud']).toBe(
    'npm run cloud:templates:check && node src/build/copy-cloud.js'
  );
});
