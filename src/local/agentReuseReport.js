import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createAgentReuseReportHandle } from '../core/local/agentReuseReport.js';

const handle = createAgentReuseReportHandle();
const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const inputPath = process.argv[2] ?? 'notes/agents/reuse-events.jsonl';
  const result = handle(fs.readFileSync(inputPath, 'utf8'));
  const output = result.exitCode ? process.stderr : process.stdout;
  output.write(`${result.output}\n`);
  process.exitCode = result.exitCode;
}

export { handle };
