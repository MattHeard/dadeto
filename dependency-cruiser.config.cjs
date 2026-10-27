/**
 * Baseline dependency-cruiser config for Dadeto.
 * Focus on a narrow acyclic rule while giving future learners a place to grow the policy.
 */
const logicDirectory = 'src/(?:core|logic/(?:core|boundary))';
const logicRoot = `^${logicDirectory}(?:/|$)`;

module.exports = {
  forbidden: [
    {
      name: 'trusted-core-no-boundary-deps',
      comment:
        'Trusted logic consumes parsed values; boundary parsers may depend on core, never the reverse.',
      severity: 'error',
      from: { path: '^src/logic/core(?:/|$)' },
      to: { path: '^src/logic/boundary(?:/|$)' },
    },
    {
      name: 'local-writer-no-cycles',
      comment:
        'Warn when writer/local helpers become cyclic so layering stays easy to evolve.',
      severity: 'error',
      from: {
        path: '^src/local',
      },
      to: {
        circular: true,
      },
    },
    {
      name: 'core-no-local-deps',
      comment:
        'Keep all logic modules independent from local runner plumbing so the core layer stays reusable.',
      severity: 'error',
      from: {
        path: logicRoot,
      },
      to: {
        path: '^src/local',
      },
    },
    {
      name: 'src-browser-only-core',
      comment:
        'Limit browser-layer dependencies to itself, src/core, or shared environment-neutral adapters.',
      severity: 'error',
      from: {
        path: '^src/browser',
      },
      to: {
        pathNot: '^src/(browser|core|adapters)(?:/|$)|^src/logic/(core|boundary)(?:/|$)|^node_modules(?:/|$)',
      },
    },
    {
      name: 'src-build-only-core',
      comment:
        'Keep build helpers isolated except for shared environment-neutral adapters.',
      severity: 'error',
      from: {
        path: '^src/build',
      },
      to: {
        pathNot: '^src/(build|core|adapters)(?:/|$)|^src/logic/(core|boundary)(?:/|$)|^node_modules(?:/|$)',
      },
    },
    {
      name: 'src-cloud-only-core',
      comment:
        'Keep cloud integration pieces limited to their own directory, src/core, or shared adapters.',
      severity: 'error',
      from: {
        path: '^src/cloud',
      },
      to: {
        pathNot: '^src/(cloud|core|adapters)(?:/|$)|^src/logic/(core|boundary)(?:/|$)|^node_modules(?:/|$)',
      },
    },
    {
      name: 'src-local-only-core',
      comment:
        'Allow local tooling to depend on itself, src/core, or shared environment-neutral adapters.',
      severity: 'error',
      from: {
        path: '^src/local',
      },
      to: {
        pathNot: '^src/(local|core|adapters)(?:/|$)|^src/logic/(core|boundary)(?:/|$)|^node_modules(?:/|$)',
      },
    },
    {
      name: 'src-core-within-core',
      comment:
        'Avoid logic modules reaching outside the supported logic roots so the shared layer stays portable.',
      severity: 'error',
      from: {
        path: logicRoot,
      },
      to: {
        pathNot: logicRoot,
      },
    },
    {
      name: 'src-core-scripts-no-node-builtins',
      comment:
        'Keep all logic free of direct Node built-in imports so executable wiring stays at the outer wrapper layer.',
      severity: 'error',
      from: {
        path: logicRoot,
      },
      to: {
        dependencyTypes: ['core'],
      },
    },
    {
      name: 'core-browser-no-core-sibling-deps',
      comment:
        'Keep src/core/browser isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: `^${logicDirectory}/browser/`,
      },
      to: {
        path: `^${logicDirectory}/(build|cloud|local)/`,
      },
    },
    {
      name: 'core-build-no-core-sibling-deps',
      comment:
        'Keep src/core/build isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: `^${logicDirectory}/build/`,
      },
      to: {
        path: `^${logicDirectory}/(browser|cloud|local)/`,
      },
    },
    {
      name: 'core-cloud-no-core-sibling-deps',
      comment:
        'Keep src/core/cloud isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: `^${logicDirectory}/cloud/`,
      },
      to: {
        path: `^${logicDirectory}/(browser|build|local)/`,
      },
    },
    {
      name: 'core-local-no-core-sibling-deps',
      comment:
        'Keep src/core/local isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: `^${logicDirectory}/local/`,
      },
      to: {
        path: `^${logicDirectory}/(browser|build|cloud)/`,
      },
    },
    {
      name: 'browser-no-node-modules',
      comment:
        'Prevent src/browser from depending on node_modules until we stabilize it.',
      severity: 'error',
      from: {
        path: '^src/browser',
      },
      to: {
        path: 'node_modules',
      },
    },
    {
      name: 'core-no-node-modules',
      comment:
        'Prevent logic from depending on node_modules until we stabilize it.',
      severity: 'error',
      from: {
        path: logicRoot,
      },
      to: {
        path: 'node_modules',
      },
    },
    {
      name: 'src-local-no-cloud',
      comment:
        'Keep local tools insulated from cloud integration code so the local runner stays focused.',
      severity: 'error',
      from: {
        path: '^src/local',
      },
      to: {
        path: '^src/cloud',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    includeOnly: '^(src|scripts|node_modules)',
    prefix: './',
  },
};
