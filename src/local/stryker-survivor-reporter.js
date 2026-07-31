import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { declareClassPlugin, PluginKind } from '@stryker-mutator/api/plugin';

const REPORT_DIRECTORY = path.resolve('reports/mutation');
const REPORT_PATH = path.join(REPORT_DIRECTORY, 'surviving-mutants.jsonl');

/**
 * Persist surviving mutants as soon as Stryker reports them.
 *
 * JSONL is intentional: every line is independently readable if a long
 * mutation run is interrupted before Stryker's final JSON report is written.
 */
export class SurvivorReporter {
  constructor() {
    mkdirSync(REPORT_DIRECTORY, { recursive: true });
    writeFileSync(REPORT_PATH, '', 'utf8');
  }

  /** @param {Readonly<{ status?: string }>} result */
  onMutantTested(result) {
    if (result.status !== 'Survived') {
      return;
    }

    appendFileSync(REPORT_PATH, `${JSON.stringify(result)}\n`, 'utf8');
  }
}

export const strykerPlugins = [
  declareClassPlugin(PluginKind.Reporter, 'survivor', SurvivorReporter),
];
