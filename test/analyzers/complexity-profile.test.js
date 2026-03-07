import {
  buildComplexityProfile,
  compareComplexityProfiles,
} from '../../src/build/complexity-profile.js';

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
});
