import {
  aggregateReuseNotes,
  createAgentReuseReportHandle,
  parseReuseNotes,
} from '../../../src/core/local/agentReuseReport.js';

const validRecord = {
  schemaVersion: 1,
  taskId: 'toy-123',
  feature: 'A small toy',
  reusedModules: ['src/core/browser/game/shared/renderer.js'],
  consideredButRejected: [
    {
      modulePath: 'src/core/browser/game/shared/input.js',
      reason: 'Its state contract did not fit.',
    },
  ],
  integrationFriction: [
    {
      category: 'api',
      modulePath: 'src/core/browser/game/shared/renderer.js',
      detail: 'The helper was private.',
    },
  ],
  newModules: ['src/core/browser/game/example/renderer.js'],
  reuseEstimate: {
    fraction: null,
    rationale: 'Unknown without a capability inventory.',
  },
  sourceNote: 'notes/agents/example.md',
};

describe('parseReuseNotes', () => {
  it('accepts a valid record and blank lines', () => {
    expect(parseReuseNotes(`\n${JSON.stringify(validRecord)}\n`)).toEqual({
      records: [validRecord],
      errors: [],
    });
  });

  it('reports malformed JSON and invalid friction categories', () => {
    const invalid = {
      ...validRecord,
      integrationFriction: [
        { category: 'hard', modulePath: null, detail: 'No category.' },
      ],
    };
    const result = parseReuseNotes(`nope\n${JSON.stringify(invalid)}`);

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch('invalid JSON');
    expect(result.errors[1]).toMatch('known category');
  });

  it('accepts all friction categories and an unknown reuse estimate', () => {
    const record = {
      ...validRecord,
      integrationFriction: [
        {
          category: 'discoverability',
          modulePath: 'src/core/shared.js',
          detail: 'Hard to find.',
        },
        {
          category: 'missing-capability',
          modulePath: null,
          detail: 'No suitable parser exists.',
        },
      ],
      reuseEstimate: { fraction: null, rationale: 'Unknown.' },
    };

    expect(parseReuseNotes(JSON.stringify(record)).errors).toEqual([]);
  });

  it('accepts numeric estimates and rejects an array record', () => {
    const record = {
      ...validRecord,
      reuseEstimate: {
        fraction: 0.5,
        rationale: 'Half of the required capabilities were reused.',
      },
    };

    expect(parseReuseNotes(`[]\n${JSON.stringify(record)}`).errors).toContain(
      'Line 1: expected an object'
    );
    expect(parseReuseNotes(JSON.stringify(record)).errors).toEqual([]);
  });

  it('rejects invalid record fields and malformed list entries', () => {
    const record = {
      ...validRecord,
      schemaVersion: 2,
      taskId: '',
      feature: 5,
      reusedModules: ['../outside.js', null],
      newModules: ['/absolute.js', ''],
      consideredButRejected: [null, { modulePath: '/outside.js', reason: '' }],
      integrationFriction: [
        {},
        null,
        { category: 'api', modulePath: 'src/core/view.js', detail: 5 },
      ],
      reuseEstimate: { fraction: 2, rationale: '' },
    };
    const result = parseReuseNotes(JSON.stringify(record));

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(11);
  });

  it('rejects non-object values and non-array fields', () => {
    const record = {
      ...validRecord,
      reusedModules: null,
      newModules: null,
      consideredButRejected: null,
      integrationFriction: null,
      reuseEstimate: null,
    };
    const result = parseReuseNotes(`null\n${JSON.stringify(record)}`);

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(6);
  });

  it('rejects estimates with non-numeric or negative fractions', () => {
    const stringFraction = {
      ...validRecord,
      reuseEstimate: { fraction: 'half', rationale: 'Not numeric.' },
    };
    const negativeFraction = {
      ...validRecord,
      reuseEstimate: { fraction: -0.1, rationale: 'Out of range.' },
    };

    expect(parseReuseNotes(JSON.stringify(stringFraction)).errors).toHaveLength(
      1
    );
    expect(
      parseReuseNotes(JSON.stringify(negativeFraction)).errors
    ).toHaveLength(1);
  });
});

describe('aggregateReuseNotes', () => {
  it('counts friction categories and links evidence notes', () => {
    const report = aggregateReuseNotes([validRecord]);

    expect(report).toContain('| api | 1 |');
    expect(report).toContain('[A small toy](notes/agents/example.md)');
    expect(report).toContain('| discoverability | 0 |');
    expect(report).toContain('| missing-capability | 0 |');
  });

  it('uses the latest append-only record for a task', () => {
    const updated = {
      ...validRecord,
      integrationFriction: [
        {
          category: 'missing-capability',
          modulePath: null,
          detail: 'No suitable component existed.',
        },
      ],
    };
    const report = aggregateReuseNotes([validRecord, updated]);

    expect(report).toContain('| api | 0 |');
    expect(report).toContain('| missing-capability | 1 |');
  });

  it('reports zero counts for empty data and entries without friction', () => {
    expect(aggregateReuseNotes([])).toContain('| discoverability | 0 |');
    expect(
      aggregateReuseNotes([{ ...validRecord, integrationFriction: [] }])
    ).toContain('| api | 0 |');
  });
});

describe('createAgentReuseReportHandle', () => {
  it('formats validation failures and successful reports', () => {
    const handle = createAgentReuseReportHandle();

    expect(handle('bad json')).toEqual({
      exitCode: 1,
      output: expect.stringContaining('invalid JSON'),
    });
    expect(handle(JSON.stringify(validRecord))).toEqual({
      exitCode: 0,
      output: expect.stringContaining('| api | 1 |'),
    });
  });
});
