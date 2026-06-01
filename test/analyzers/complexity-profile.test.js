import escomplex from 'typhonjs-escomplex';
import {
  createComplexityProfileHandle,
  compareComplexityProfiles,
} from '../../src/core/build/complexity-profile.js';

const { buildComplexityProfile } = createComplexityProfileHandle({
  analyzer: escomplex,
  readSource: () => '',
  stdout: {
    write() {},
  },
  argv: ['node', 'script.js', 'before.js', 'after.js'],
});

describe('complexity profile comparator', () => {
  test('reports improvement even when a slice still has over-threshold methods', () => {
    const baseline = `
function captureButtons(items) {
  return items.filter(item => {
    if (item.a && item.b) {
      return true;
    }
    if (item.c || item.d) {
      return true;
    }
    return item.e ? item.f : item.g;
  });
}
`;

    const current = `
function captureButtons(items) {
  return items.filter(item => {
    if (item.a && item.b) {
      return true;
    }
    return item.c || item.d;
  });
}

function chooseCandidate(item) {
  if (item.e) {
    return item.f;
  }
  return item.g || item.h;
}
`;

    const baselineProfile = buildComplexityProfile(baseline, { threshold: 2 });
    const currentProfile = buildComplexityProfile(current, { threshold: 2 });
    const comparison = compareComplexityProfiles(
      baselineProfile,
      currentProfile
    );

    expect(baselineProfile.summary.warningCount).toBe(1);
    expect(currentProfile.summary.warningCount).toBe(2);
    expect(comparison.assessment.warningCount).toBe('worse');
    expect(comparison.assessment.peakCyclomatic).toBe('improved');
    expect(comparison.assessment.totalExcess).toBe('improved');
    expect(comparison.delta).toEqual({
      warningCount: 1,
      peakCyclomatic: -2,
      totalExcess: -1,
    });
  });

  test('filters the profile to a line slice', () => {
    const source = `
function outsideSlice() {
  if (a) {
    return true;
  }
  return false;
}

function insideSlice(value) {
  if (value.a) {
    return true;
  }
  if (value.b || value.c) {
    return true;
  }
  return value.d ? value.e : value.f;
}
`;

    const profile = buildComplexityProfile(source, {
      threshold: 2,
      lineRange: { start: 8, end: 17 },
    });

    expect(profile.methods).toHaveLength(1);
    expect(profile.methods[0]).toMatchObject({
      name: 'insideSlice',
      cyclomatic: 5,
      excess: 3,
    });
  });

  test('rejects invalid sources and line ranges', () => {
    expect(() => buildComplexityProfile(null)).toThrow(
      'source must be a string'
    );
    expect(() =>
      buildComplexityProfile('function noop() {}', {
        lineRange: { start: '4', end: '2' },
      })
    ).toThrow('Invalid line range: 4:2');
  });

  test('sorts tied methods by line number and reports unchanged deltas', () => {
    const source = `
function first(value) {
  if (value) return true;
  return false;
}
function second(value) {
  if (value) return true;
  return false;
}
`;

    const profile = buildComplexityProfile(source);
    const comparison = compareComplexityProfiles(profile, profile);

    expect(profile.threshold).toBe(2);
    expect(profile.methods.map(method => method.name)).toEqual([
      'first',
      'second',
    ]);
    expect(comparison.assessment).toEqual({
      warningCount: 'unchanged',
      peakCyclomatic: 'unchanged',
      totalExcess: 'unchanged',
    });
  });

  test('runs the CLI handle with injected file readers', () => {
    const writes = [];
    const handle = createComplexityProfileHandle({
      analyzer: {
        analyzeModule() {
          return {
            methods: [
              {
                name: 'fake',
                lineStart: 1,
                lineEnd: 1,
                cyclomatic: 3,
              },
            ],
          };
        },
      },
      readSource: filePath => `source:${filePath}`,
      stdout: {
        write: output => writes.push(output),
      },
      argv: [
        'node',
        'src/build/complexity-profile.js',
        '--threshold',
        '2',
        '--lines',
        '1:1',
        'before.js',
        'after.js',
      ],
    });

    handle.runFromCli();

    expect(JSON.parse(writes[0])).toMatchObject({
      baselinePath: 'before.js',
      currentPath: 'after.js',
      profileOptions: {
        threshold: 2,
        lineRange: { start: 1, end: 1 },
      },
    });
  });

  test('sorts zero-excess methods by cyclomatic score before line number', () => {
    const handle = createComplexityProfileHandle({
      analyzer: {
        analyzeModule() {
          return {
            methods: [
              {
                name: 'simpler',
                lineStart: 1,
                lineEnd: 1,
                cyclomatic: 1,
              },
              {
                name: 'threshold',
                lineStart: 2,
                lineEnd: 2,
                cyclomatic: 2,
              },
            ],
          };
        },
      },
      readSource: () => '',
      stdout: {
        write() {},
      },
      argv: ['node', 'script.js', 'before.js', 'after.js'],
    });

    expect(handle.buildComplexityProfile('source').methods).toEqual([
      expect.objectContaining({ name: 'threshold' }),
      expect.objectContaining({ name: 'simpler' }),
    ]);
  });

  test('reports CLI argument failures', () => {
    const handle = createComplexityProfileHandle({
      analyzer: {
        analyzeModule() {
          return { methods: [] };
        },
      },
      readSource: () => '',
      stdout: {
        write() {},
      },
      argv: ['node', 'script.js', '--threshold', '0', 'a.js', 'b.js'],
    });

    expect(() => handle.runFromCli()).toThrow('Invalid threshold: 0');

    const missingArgsHandle = createComplexityProfileHandle({
      analyzer: {
        analyzeModule() {
          return { methods: [] };
        },
      },
      readSource: () => '',
      stdout: {
        write() {},
      },
      argv: ['node', 'script.js', 'a.js'],
    });

    expect(() => missingArgsHandle.runFromCli()).toThrow(
      'Usage: node src/build/complexity-profile.js'
    );
  });

  test('reports invalid missing line range ends from CLI args', () => {
    const handle = createComplexityProfileHandle({
      analyzer: {
        analyzeModule() {
          return { methods: [] };
        },
      },
      readSource: () => '',
      stdout: {
        write() {},
      },
      argv: [
        'node',
        'script.js',
        '--lines',
        undefined,
        'before.js',
        'after.js',
      ],
    });

    expect(() => handle.runFromCli()).toThrow('Invalid line range: :undefined');
  });
});
