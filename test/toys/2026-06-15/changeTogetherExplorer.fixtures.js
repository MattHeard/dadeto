export const INVALID_JSON_INPUT = '{';

export const NON_RECORD_INPUT = JSON.stringify([]);

export const NON_ARRAY_CHANGESETS_FIXTURE = {
  changeSets: null,
};

export const COCHANGE_FIXTURE = {
  changeSets: [
    {
      id: 'commit-1',
      files: ['src/a.js', 'src/b.js', 'src/b.js'],
    },
    {
      id: 'commit-2',
      files: ['src/a.js', 'src/c.js'],
    },
    {
      id: 'commit-3',
      files: ['src/a.js'],
    },
    {
      id: 'commit-4',
      files: ['src/a.js', 'src/b.js'],
    },
    {
      id: 'commit-5',
      files: ['src/b.js', 'src/c.js'],
    },
  ],
};

export const FALLBACK_FIXTURE = {
  changeSets: [
    false,
    {
      files: [null, 'src/solo.js', 7],
    },
  ],
};

export const TIE_FIXTURE = {
  changeSets: [
    {
      id: 'beta',
      files: ['src/b.js', 'src/c.js'],
    },
    {
      id: 'alpha',
      files: ['src/a.js', 'src/d.js'],
    },
  ],
};

export const PARTNER_COUNT_TIE_FIXTURE = {
  changeSets: [
    {
      id: 'alpha-1',
      files: ['src/a.js', 'src/b.js'],
    },
    {
      id: 'alpha-2',
      files: ['src/a.js', 'src/b.js'],
    },
    {
      id: 'beta-1',
      files: ['src/c.js', 'src/d.js'],
    },
    {
      id: 'beta-2',
      files: ['src/c.js', 'src/e.js'],
    },
  ],
};
