import { createHash, randomUUID } from 'node:crypto';
import { bindEffectBoundary } from '../allow-effects.js';
import { createAtlasResearchJourneyCore as coreFactory } from '../../core/local/interpretability/atlasResearchJourney.js';
import { createAtomicAtlasResearchStorage } from './atlasResearchStorage.js';

const core = coreFactory({
  createStorage: createAtomicAtlasResearchStorage,
  bindEffect: bindEffectBoundary,
  hashCanonicalSnapshot: value =>
    createHash('sha256').update(value).digest('hex'),
  nowIso: () => new Date().toISOString(),
  randomId: () => `atlas-design-${randomUUID()}`,
});
const handle = (args, overrides) =>
  core.runAtlasResearchJourneyCli(args, overrides);

export { handle as runAtlasResearchJourneyCli };
