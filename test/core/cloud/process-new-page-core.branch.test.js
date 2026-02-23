import { processNewPageTestUtils } from '../../../src/core/cloud/process-new-page/process-new-page-core.js';

describe('processNewPageTestUtils', () => {
  test('routeViaDirect returns null when directPageNumber is not integer', async () => {
    await expect(
      processNewPageTestUtils.routeViaDirect({
        db: {},
        directPageNumber: undefined,
        snapshot: {},
      })
    ).resolves.toBeNull();
  });

  test('extractSubmissionData returns empty object when snapshot missing data', () => {
    const fakeSnapshot = { data: () => null };
    expect(processNewPageTestUtils.extractSubmissionData(fakeSnapshot)).toEqual({});
  });

  test('isSubmissionProcessed returns true when flagged', () => {
    expect(processNewPageTestUtils.isSubmissionProcessed({ processed: true })).toBe(true);
  });

  test('resolveRandomGenerator falls back when missing', () => {
    expect(typeof processNewPageTestUtils.resolveRandomGenerator(undefined)).toBe(
      'function'
    );
  });

  test('resolvePageDepth defaults to zero', () => {
    expect(processNewPageTestUtils.resolvePageDepth(undefined)).toBe(0);
  });

  test('extractVariantRefFromOption returns null when option lacks parents', () => {
    expect(
      processNewPageTestUtils.extractVariantRefFromOption({ parent: null })
    ).toBeNull();
  });

  test('extractPageRefFromVariant returns null when no parent', () => {
    expect(
      processNewPageTestUtils.extractPageRefFromVariant({ parent: null })
    ).toBeNull();
  });

  test('extractStoryRefFromPageRef returns null for missing parent', () => {
    expect(
      processNewPageTestUtils.extractStoryRefFromPageRef({ parent: null })
    ).toBeNull();
  });

  test('resolveStoryRefFromOption handles null optionRef', () => {
    expect(processNewPageTestUtils.resolveStoryRefFromOption(null)).toEqual({
      variantRef: null,
      pageRef: null,
      storyRef: null,
    });
  });

  test('extractAndValidateStoryRef returns null when no storyRef', () => {
    const optionSnap = { ref: { parent: null }, data: () => ({}) };
    expect(
      processNewPageTestUtils.extractAndValidateStoryRef(optionSnap)
    ).toBeNull();
  });

  test('ensureOptionSnapshotRef attaches ref when missing', () => {
    const optionRef = {};
    const snap = { ref: null };
    expect(processNewPageTestUtils.ensureOptionSnapshotRef(snap, optionRef)).toBe(
      snap
    );
    expect(snap.ref).toBe(optionRef);
  });

  test('resolveStoryRefOrEmpty returns fallback when undefined', () => {
    expect(processNewPageTestUtils.resolveStoryRefOrEmpty(null)).toEqual({});
  });
});
  test('ensureOptionSnapshotRef keeps existing ref when present', () => {
    const optionRef = {};
    const snap = { ref: optionRef };
    expect(processNewPageTestUtils.ensureOptionSnapshotRef(snap, {})).toBe(snap);
    expect(snap.ref).toBe(optionRef);
  });
