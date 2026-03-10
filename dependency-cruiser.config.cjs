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
      severity: 'warn',
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
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    includeOnly: '^src',
    prefix: './',
  },
};
