import {
  aggregateReuseNotes,
  createAgentReuseReportHandle,
  parseAgentReuseReportArguments,
  parseEligibleTaskIds,
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

describe('parseAgentReuseReportArguments', () => {
  it('supports default and explicit input paths with an optional manifest', () => {
    expect(parseAgentReuseReportArguments([])).toEqual({
      inputPath: 'notes/agents/reuse-events.jsonl',
      eligibleTasksPath: undefined,
    });
    expect(
      parseAgentReuseReportArguments([
        'events.jsonl',
        '--eligible-tasks',
        'eligible.json',
      ])
    ).toEqual({
      inputPath: 'events.jsonl',
      eligibleTasksPath: 'eligible.json',
    });
    expect(
      parseAgentReuseReportArguments(['--eligible-tasks', 'eligible.json'])
    ).toEqual({
      inputPath: 'notes/agents/reuse-events.jsonl',
      eligibleTasksPath: 'eligible.json',
    });
  });

  it('rejects missing manifest paths, repeated paths, and unknown options', () => {
    expect(parseAgentReuseReportArguments(['--eligible-tasks'])).toEqual({
      inputPath: 'notes/agents/reuse-events.jsonl',
      error: '--eligible-tasks requires a JSON manifest path.',
    });
    expect(
      parseAgentReuseReportArguments(['--eligible-tasks', '--other'])
    ).toMatchObject({
      error: '--eligible-tasks requires a JSON manifest path.',
    });
    expect(
      parseAgentReuseReportArguments([
        '--eligible-tasks',
        'one.json',
        '--eligible-tasks',
        'two.json',
      ])
    ).toMatchObject({ error: 'Use --eligible-tasks only once.' });
    expect(parseAgentReuseReportArguments(['--other'])).toMatchObject({
      error: 'Unknown option: --other',
    });
    expect(
      parseAgentReuseReportArguments(['one.json', 'two.json'])
    ).toMatchObject({ error: 'Provide only one reuse-events JSONL path.' });
  });
});

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
      sourceNote: '../outside.md',
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
    expect(result.errors).toHaveLength(12);
    expect(result.errors).toContain(
      'Line 1: sourceNote must be a repository-relative path'
    );
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

describe('parseEligibleTaskIds', () => {
  it('normalizes unique task IDs and rejects malformed manifests', () => {
    expect(parseEligibleTaskIds('[" task-1 ","task-2"]')).toEqual({
      taskIds: ['task-1', 'task-2'],
      errors: [],
    });
    expect(parseEligibleTaskIds('not json').errors[0]).toMatch('invalid JSON');
    expect(parseEligibleTaskIds('{"taskIds":[]}').errors).toContain(
      'Eligibility manifest: expected an array of task IDs'
    );
    expect(parseEligibleTaskIds('["",3,"task-1","task-1"]').errors).toEqual([
      'Eligibility manifest: item 1 must be a non-empty task ID',
      'Eligibility manifest: item 2 must be a non-empty task ID',
      'Eligibility manifest: duplicate task ID task-1',
    ]);
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

  it('reports unknown eligibility without a manifest', () => {
    const report = aggregateReuseNotes([validRecord]);

    expect(report).toContain('| Latest valid reuse events | 1 |');
    expect(report).toContain('| Superseded historical events | 0 |');
    expect(report).toContain('| Eligible task list | unknown (not provided) |');
    expect(report).toContain('| Eligible tasks missing events | unknown |');
  });

  it('compares eligible tasks with latest events and source-note evidence', () => {
    const updatedRecord = {
      ...validRecord,
      sourceNote: 'notes/agents/current.md',
    };
    const missingNoteRecord = {
      ...validRecord,
      taskId: 'missing-note',
      sourceNote: 'notes/agents/missing.md',
    };
    const uncheckedNoteRecord = {
      ...validRecord,
      taskId: 'unchecked-note',
      sourceNote: 'notes/agents/unchecked.md',
    };
    const report = aggregateReuseNotes(
      [validRecord, updatedRecord, missingNoteRecord, uncheckedNoteRecord],
      {
        eligibleTaskIds: [
          validRecord.taskId,
          'missing-note',
          'unchecked-note',
          'no-event',
        ],
        sourceNoteExists: sourceNotePath => {
          if (sourceNotePath.endsWith('current.md')) return true;
          if (sourceNotePath.endsWith('missing.md')) return false;
          throw new Error('Could not inspect source note');
        },
      }
    );

    expect(report).toContain('| Latest valid reuse events | 3 |');
    expect(report).toContain('| Superseded historical events | 1 |');
    expect(report).toContain('| Eligible tasks with latest valid event | 3 |');
    expect(report).toContain('| Eligible tasks missing events | 1 |');
    expect(report).toContain('| Eligible event source notes found | 1 |');
    expect(report).toContain('| Eligible event source notes missing | 1 |');
    expect(report).toContain('| Eligible event source notes unchecked | 1 |');
  });

  it('marks source-note checks unknown when no lookup is provided', () => {
    const report = aggregateReuseNotes([validRecord], {
      eligibleTaskIds: [validRecord.taskId],
    });

    expect(report).toContain('| Eligible event source notes unchecked | 1 |');
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

  it('rejects an invalid eligible-task manifest', () => {
    const handle = createAgentReuseReportHandle();

    expect(handle(JSON.stringify(validRecord), '{').exitCode).toBe(1);
    expect(handle(JSON.stringify(validRecord), '{').output).toMatch(
      'Eligibility manifest: invalid JSON'
    );
  });

  it('checks source-note existence through an injected lookup', () => {
    const handle = createAgentReuseReportHandle({
      sourceNoteExists: sourceNotePath =>
        sourceNotePath === validRecord.sourceNote,
    });
    const result = handle(
      JSON.stringify(validRecord),
      JSON.stringify([validRecord.taskId])
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(
      '| Eligible event source notes found | 1 |'
    );
  });
});
