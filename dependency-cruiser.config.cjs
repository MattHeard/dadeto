/**
 * Baseline dependency-cruiser config for Dadeto.
 * Focus on a narrow acyclic rule while giving future learners a place to grow the policy.
 */
module.exports = {
  forbidden: [
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
        'Keep shared core modules independent from local runner plumbing so the core layer stays reusable.',
      severity: 'error',
      from: {
        path: '^src/core',
      },
      to: {
        path: '^src/local',
      },
    },
    {
      name: 'src-browser-only-core',
      comment:
        'Limit browser-layer dependencies to itself or src/core so layers stay focused.',
      severity: 'warn',
      from: {
        path: '^src/browser',
      },
      to: {
        pathNot: '^src/(browser|core)(?:/|$)',
      },
    },
    {
      name: 'src-build-only-core',
      comment:
        'Keep build helper modules isolated to their own folder or core for clarity.',
      severity: 'warn',
      from: {
        path: '^src/build',
      },
      to: {
        pathNot: '^src/(build|core)(?:/|$)',
      },
    },
    {
      name: 'src-cloud-only-core',
      comment:
        'Keep cloud integration pieces limited to their own directory or src/core.',
      severity: 'warn',
      from: {
        path: '^src/cloud',
      },
      to: {
        pathNot: '^src/(cloud|core)(?:/|$)',
      },
    },
    {
      name: 'src-local-only-core',
      comment:
        'Allow local tooling to depend only on itself or src/core for clearer layering.',
      severity: 'error',
      from: {
        path: '^src/local',
      },
      to: {
        pathNot: '^src/(local|core)(?:/|$)',
      },
    },
    {
      name: 'src-scripts-only-core',
      comment:
        'Keep script helpers scoped to their own folder or src/core to prevent leaks.',
      severity: 'warn',
      from: {
        path: '^src/scripts',
      },
      to: {
        pathNot: '^src/(scripts|core)(?:/|$)',
      },
    },
    {
      name: 'src-core-within-core',
      comment:
        'Avoid core modules reaching outside src/core so the shared layer stays portable.',
      severity: 'warn',
      from: {
        path: '^src/core',
      },
      to: {
        pathNot: '^src/core(?:/|$)',
      },
    },
    {
      name: 'core-browser-no-core-sibling-deps',
      comment:
        'Keep src/core/browser isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: '^src/core/browser/',
      },
      to: {
        path: '^src/core/(build|cloud|local)/',
      },
    },
    {
      name: 'core-build-no-core-sibling-deps',
      comment:
        'Keep src/core/build isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: '^src/core/build/',
      },
      to: {
        path: '^src/core/(browser|cloud|local)/',
      },
    },
    {
      name: 'core-cloud-no-core-sibling-deps',
      comment:
        'Keep src/core/cloud isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: '^src/core/cloud/',
      },
      to: {
        path: '^src/core/(browser|build|local)/',
      },
    },
    {
      name: 'core-local-no-core-sibling-deps',
      comment:
        'Keep src/core/local isolated from the other src/core subdirectories; shared code belongs at src/core root.',
      severity: 'error',
      from: {
        path: '^src/core/local/',
      },
      to: {
        path: '^src/core/(browser|build|cloud)/',
      },
    },
    {
      name: 'core-browser-no-node-modules',
      comment:
        'Prevent src/core and src/browser from depending on node_modules until we stabilize them.',
      severity: 'warn',
      from: {
        path: '^src/(core|browser)',
      },
      to: {
        path: 'node_modules',
      },
    },
    {
      name: 'src-local-no-cloud',
      comment:
        'Keep local tools insulated from cloud integration code so the local runner stays focused.',
      severity: 'warn',
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
    includeOnly: '^src',
    prefix: './',
  },
};
