import { z } from 'zod';
import {
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
} from '../core/interpretability/interpretability.js';
import { runAtlasResearchJourneyCli } from './interpretability/atlasResearchJourney.js';

const evidenceGraphSchemasV1 = createInterpretabilitySchemasV1(z);
const identityGraphSchemasV2 = createInterpretabilitySchemasV2(z);
const result = await runAtlasResearchJourneyCli(process.argv.slice(2), {
  schemas: { evidenceGraphSchemasV1, identityGraphSchemasV2 },
});
const output = `${JSON.stringify(result.result, null, 2)}\n`;
if (result.exitCode === 0) process.stdout.write(output);
else process.stderr.write(output);
process.exitCode = result.exitCode;
