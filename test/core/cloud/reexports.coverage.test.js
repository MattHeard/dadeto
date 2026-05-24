import * as jsonValueHelpers from '../../../src/core/browser/jsonValueHelpers.js';
import * as firestoreHelpers from '../../../src/core/cloud/firestore-helpers.js';
import * as generateStatsAdminConfig from '../../../src/core/cloud/generate-stats/admin-config.js';
import * as generateStatsCommonCore from '../../../src/core/cloud/generate-stats/common-core.js';
import * as getApiKeyCreditCommonCore from '../../../src/core/cloud/get-api-key-credit/common-core.js';
import * as getModerationVariantCors from '../../../src/core/cloud/get-moderation-variant/cors.js';
import * as renderContentsCommonCore from '../../../src/core/cloud/render-contents/common-core.js';
import * as renderVariantCommonCore from '../../../src/core/cloud/render-variant/common-core.js';
import * as submitModerationRatingCommonCore from '../../../src/core/cloud/submit-moderation-rating/common-core.js';
import * as submitNewPageCommonCore from '../../../src/core/cloud/submit-new-page/common-core.js';
import * as submitNewPageHelpers from '../../../src/core/cloud/submit-new-page/helpers.js';
import * as submitNewStoryCommonCore from '../../../src/core/cloud/submit-new-story/common-core.js';

describe('core cloud/browser re-export modules', () => {
  test('re-export wrappers expose expected symbols', () => {
    expect(typeof jsonValueHelpers.parseJsonObject).toBe('function');
    expect(typeof firestoreHelpers.buildPageByNumberQuery).toBe('function');
    expect(typeof firestoreHelpers.buildVariantByNameQuery).toBe('function');
    expect(typeof generateStatsAdminConfig.ensureString).toBe('function');
    expect(typeof generateStatsCommonCore.ensureString).toBe('function');
    expect(typeof getApiKeyCreditCommonCore.ensureString).toBe('function');
    expect(typeof getModerationVariantCors.isAllowedOrigin).toBe('function');
    expect(typeof renderContentsCommonCore.ensureString).toBe('function');
    expect(typeof renderVariantCommonCore.ensureString).toBe('function');
    expect(typeof submitModerationRatingCommonCore.ensureString).toBe(
      'function'
    );
    expect(typeof submitNewPageCommonCore.ensureString).toBe('function');
    expect(typeof submitNewPageHelpers.parseIncomingOption).toBe('function');
    expect(typeof submitNewPageHelpers.findExistingOption).toBe('function');
    expect(typeof submitNewPageHelpers.findExistingPage).toBe('function');
    expect(typeof submitNewStoryCommonCore.ensureString).toBe('function');
  });
});
