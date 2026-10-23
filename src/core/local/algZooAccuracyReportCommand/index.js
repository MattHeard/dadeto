import { renderAlgZooWholeModelAccuracyReportV1 } from '../../interpretability/algZooAccuracyReport/index.js';

/**
 * Create the JSON-to-Markdown command with injected file and process effects.
 * @param {{readFile: (path: string) => string, writeStdout: (text: string) => void, writeStderr: (text: string) => void, setExitCode: (code: number) => void}} deps Local runtime effects.
 * @returns {(args: string[]) => void} Command handler.
 */
export function createAlgZooAccuracyReportCommandHandle(deps) {
  return function handle(args) {
    if (args.length !== 1) {
      deps.writeStderr(
        'Usage: node src/local/render-algzoo-accuracy-report.js <accuracy-report.json>\n'
      );
      deps.setExitCode(2);
      return;
    }
    let report;
    try {
      report = JSON.parse(deps.readFile(args[0]));
    } catch {
      deps.writeStderr('Could not read or parse the accuracy report JSON.\n');
      deps.setExitCode(1);
      return;
    }
    const result = renderAlgZooWholeModelAccuracyReportV1(report);
    if (!result.valid) {
      const codes = result.errors.map(error => error.code).join(', ');
      deps.writeStderr(`Invalid accuracy report: ${codes}.\n`);
      deps.setExitCode(1);
      return;
    }
    deps.writeStdout(result.markdown);
    deps.setExitCode(0);
  };
}
