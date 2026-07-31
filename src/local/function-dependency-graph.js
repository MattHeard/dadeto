import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { buildFunctionDependencyGraph } from '../core/scripts/function-dependency-graph-core.js';

const root = path.resolve('src/core');
const files = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile() && full.endsWith('.js')) files.push({ path: path.relative('.', full), source: fs.readFileSync(full, 'utf8') });
  }
}
collect(root);
const graph = buildFunctionDependencyGraph({ files, parse });
const output = path.resolve('reports/function-dependency-graph.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(graph, null, 2)}\n`);
console.log(`Wrote ${graph.nodes.length} functions, ${graph.edges.length} direct edges, and ${graph.ignoredCalls.length} ignored injected calls to ${output}`);
