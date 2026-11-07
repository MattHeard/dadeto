import { createHash } from 'node:crypto';
import { createLegacyPolicyCases } from '../../../fixtures/logic-thin-legacy-cases.js';
import { nonCoreThinStatusTestOnly } from '../../../../src/core/local/non-core-thin/status.js';
import { getBuildEntrypointPatternFailures } from '../../../../src/core/build/entrypoint-pattern.js';

test('10,306 policy outcomes match the original main implementation', () => {
  const { wrappers, entrypoints } = createLegacyPolicyCases();
  const observations = [];
  for (const source of wrappers) {
    for (const limit of [0, 1, 2, 50]) {
      observations.push(
        nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
          'src/local/example.js',
          source,
          limit
        )
      );
    }
  }
  for (const source of entrypoints) {
    observations.push(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/copy.js'],
        readSource: () => source,
      })
    );
  }
  expect(observations).toHaveLength(10306);
  // Derived from ebc01c0a41, independently compared before recording this value.
  expect(
    createHash('sha256').update(JSON.stringify(observations)).digest('hex')
  ).toBe('e7764243a42350c616a2eeac698b36912fd487f4c112efc3dcd4fe18680957f5');
});
