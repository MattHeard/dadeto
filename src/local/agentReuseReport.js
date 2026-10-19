import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  createAgentReuseReportHandle,
  parseAgentReuseReportArguments,
} from '../core/local/agentReuseReport.js';

const handle = createAgentReuseReportHandle({
  sourceNoteExists: sourceNotePath => fs.existsSync(sourceNotePath),
});
const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const argumentsResult = parseAgentReuseReportArguments(
    process.argv.slice(2)
  );
  if (argumentsResult.error) {
    process.stderr.write(`${argumentsResult.error}\n`);
    process.exitCode = 1;
  } else {
    try {
      const content = fs.readFileSync(argumentsResult.inputPath, 'utf8');
      const eligibleTasksContent = argumentsResult.eligibleTasksPath
        ? fs.readFileSync(argumentsResult.eligibleTasksPath, 'utf8')
        : undefined;
      const result = handle(content, eligibleTasksContent);
      const output = result.exitCode ? process.stderr : process.stdout;
      output.write(`${result.output}\n`);
      process.exitCode = result.exitCode;
    } catch (error) {
      process.stderr.write(`Could not read report input: ${error.message}\n`);
      process.exitCode = 1;
    }
  }
}

export { handle };
