export const SCHEDULER_TOY_PATH =
  'src/core/browser/toys/2026-06-15/conflictAwareProductScheduler.js';

export const SCHEDULER_TEST_PATH =
  'test/toys/2026-06-15/conflictAwareProductScheduler.test.js';

export const OTHER_TOY_PATH = 'src/core/browser/toys/2026-06-15/other.js';

export const SHARED_UI_SURFACE = 'shared-ui';

export const INVALID_JSON_INPUT = '{';

export const NON_RECORD_INPUT = JSON.stringify(['not', 'a', 'record']);

export const OVERLAP_FIXTURE = {
  candidates: [
    {
      id: 'fresh',
      title: 'Fresh Slice',
      productValue: 6,
      learningValue: 3,
      userFeedbackValue: 2,
      expectedTouchSet: [SCHEDULER_TOY_PATH, null],
    },
    {
      id: 'conflicted',
      title: 'Conflicted Slice',
      productValue: 10,
      learningValue: 1,
      userFeedbackValue: 1,
      expectedTouchSet: [SCHEDULER_TOY_PATH, SCHEDULER_TEST_PATH],
      sharedTouchRisk: 1,
      expectedTestRefactorCollision: 1,
      expectedDeploymentRisk: 1,
    },
  ],
  activeWork: [
    {
      id: 'tests',
      touchSet: [SCHEDULER_TEST_PATH],
      reservedSurfaces: [SCHEDULER_TOY_PATH],
    },
  ],
};

export const QUALITY_OVERLAP_FIXTURE = {
  candidates: [
    {
      id: 'quality-overlap',
      productValue: 12,
      learningValue: 0,
      userFeedbackValue: 0,
      expectedTouchSet: [SCHEDULER_TEST_PATH],
      sharedTouchRisk: 1,
      expectedTestRefactorCollision: 1,
      expectedDeploymentRisk: 1,
    },
    {
      id: 'isolated',
      productValue: 9,
      learningValue: 0,
      userFeedbackValue: 0,
      expectedTouchSet: [OTHER_TOY_PATH],
    },
  ],
  activeWork: [
    {
      id: 'quality',
      touchSet: [SCHEDULER_TEST_PATH],
    },
  ],
};

export const DEFAULTS_FIXTURE = {
  candidates: [
    {
      title: 'Untitled Draft',
      expectedTouchSet: [SCHEDULER_TOY_PATH, 7],
    },
  ],
  activeWork: [
    {
      touchSet: [false, SCHEDULER_TOY_PATH],
      reservedSurfaces: [SHARED_UI_SURFACE],
    },
  ],
};

export const PRIMITIVE_FALLBACK_FIXTURE = {
  candidates: [null],
  activeWork: [false],
};

export const TIE_BY_ID_FIXTURE = {
  candidates: [
    {
      id: 'beta',
      productValue: 4,
      learningValue: 1,
      userFeedbackValue: 0,
    },
    {
      id: 'alpha',
      productValue: 4,
      learningValue: 1,
      userFeedbackValue: 0,
    },
  ],
};

export const TIE_BY_TITLE_FIXTURE = {
  candidates: [
    {
      id: 'shared',
      title: 'Zulu Title',
      productValue: 3,
      learningValue: 1,
      userFeedbackValue: 0,
    },
    {
      id: 'shared',
      title: 'Alpha Title',
      productValue: 3,
      learningValue: 1,
      userFeedbackValue: 0,
    },
  ],
};
