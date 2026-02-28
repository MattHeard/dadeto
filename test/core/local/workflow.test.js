import {
  DEFAULT_SEQUENCE,
  cloneStep,
  extractLevelOneHeading,
  getDraftNumber,
  hasOnlyLevelOneHeading,
  isDraftId,
  normalizeWorkflow,
} from '../../../src/core/local/workflow.js';

describe('local workflow core', () => {
  test('provides the default writing sequence', () => {
    expect(DEFAULT_SEQUENCE.map(step => step.title)).toEqual([
      'Thesis',
      'Syllogistic Argument',
      'Outline',
      'Draft 1',
    ]);
  });

  test('cloneStep returns a copy', () => {
    const original = { id: 'outline', title: 'Outline' };

    expect(cloneStep(original)).toEqual(original);
    expect(cloneStep(original)).not.toBe(original);
  });

  test('recognizes and numbers draft ids', () => {
    expect(isDraftId('draft-4')).toBe(true);
    expect(isDraftId('outline')).toBe(false);
    expect(getDraftNumber({ id: 'draft-12' })).toBe(12);
  });

  test('extracts level-one headings and detects heading-only content', () => {
    expect(extractLevelOneHeading('# Title\n\nBody')).toBe('Title');
    expect(extractLevelOneHeading('No heading')).toBe('');
    expect(hasOnlyLevelOneHeading('')).toBe(false);
    expect(hasOnlyLevelOneHeading('# Title')).toBe(true);
    expect(hasOnlyLevelOneHeading('# Title\n\nBody')).toBe(false);
  });

  test('normalizes workflow defaults and bounds', () => {
    expect(normalizeWorkflow()).toEqual({
      steps: DEFAULT_SEQUENCE,
      activeIndex: 1,
      heading: '',
    });

    expect(
      normalizeWorkflow({
        steps: [{ id: 'draft-1', title: 'Draft 1' }],
        activeIndex: 99,
        heading: '  Heading  ',
      })
    ).toEqual({
      steps: [{ id: 'draft-1', title: 'Draft 1' }],
      activeIndex: 0,
      heading: 'Heading',
    });
  });
});
