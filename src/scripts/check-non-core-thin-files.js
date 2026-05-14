import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('non-core-thin-exemptions.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const maxLines = config.maxLines;
const exemptions = new Set(Object.keys(config.exemptions));

function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (fullPath === path.join('src', 'core')) {
      return [];
    }
    if (entry.isDirectory()) {
      return listJsFiles(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      return [fullPath.replaceAll(path.sep, '/')];
    }
    return [];
  });
}

function countLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

const files = listJsFiles('src');
const fileSet = new Set(files);
const staleExemptions = [...exemptions].filter(filePath => !fileSet.has(filePath));
const violations = files
  .map(filePath => ({ filePath, lines: countLines(filePath) }))
  .filter(({ filePath, lines }) => lines > maxLines && !exemptions.has(filePath));

if (staleExemptions.length || violations.length) {
  staleExemptions.forEach(filePath => {
    console.error(`Stale non-core thin exemption: ${filePath}`);
  });
  violations.forEach(({ filePath, lines }) => {
    console.error(`${filePath} has ${lines} lines; max non-core size is ${maxLines}.`);
  });
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${files.length} non-core JS files; ${exemptions.size} baseline exemptions; max ${maxLines} lines.`
  );
}
