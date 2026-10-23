import { analyzeAlgZooCoverageCostTrendV1 } from '../../interpretability/algZooCoverageCostAnalysis/index.js';
import { renderAlgZooCoverageCostReportV1 } from '../../interpretability/algZooCoverageCostReport/index.js';

/**
 * Create the saved-pair JSON-to-Markdown command with injected effects.
 * @param {{readFile: (path: string) => string, writeStdout: (text: string) => void, writeStderr: (text: string) => void, setExitCode: (code: number) => void, renderReport?: typeof renderAlgZooCoverageCostReportV1}} deps Local runtime effects.
 * @returns {(args: string[]) => void} Command handler.
 */
export function createAlgZooCoverageCostReportCommandHandle(deps) {
  const renderReport = deps.renderReport ?? renderAlgZooCoverageCostReportV1;
  return function handle(args) {
    if (args.length !== 1) {
      deps.writeStderr(
        'Usage: node src/local/render-algzoo-coverage-cost-report.js <locked-pairs.json>\n'
      );
      deps.setExitCode(2);
      return;
    }

    let input;
    try {
      input = JSON.parse(deps.readFile(args[0]));
    } catch {
      deps.writeStderr('Could not read or parse the locked pair JSON.\n');
      deps.setExitCode(1);
      return;
    }

    const analysis = analyzeAlgZooCoverageCostTrendV1(input);
    if (!analysis.valid) {
      deps.writeStderr(
        `Invalid locked pair input: ${analysis.errors.map(error => error.code).join(', ')}.\n`
      );
      deps.setExitCode(1);
      return;
    }
    const report = renderReport(analysis);
    if (!report.valid) {
      deps.writeStderr(
        `Could not render coverage-cost report: ${report.errors.map(error => error.code).join(', ')}.\n`
      );
      deps.setExitCode(1);
      return;
    }
    deps.writeStdout(report.markdown);
    deps.setExitCode(0);
  };
}
