import { promises as fs } from 'fs';

import { createCopyToInfraCore } from '../core/cloud/copy.js';
import { createAsyncFsAdapters } from './fs.js';
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from './path.js';

const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir } = resolveProjectDirectories(__dirname);

const pathAdapters = createPathAdapters();
const { join, resolve, relative } = pathAdapters;

const infraDir = resolve(projectRoot, 'infra');
const srcCloudDir = resolve(srcDir, 'cloud');
const infraFunctionsDir = resolve(infraDir, 'cloud-functions');
const srcCoreDir = resolve(srcDir, 'core');
const srcCoreCloudDir = resolve(srcCoreDir, 'cloud');
const srcCoreBrowserDir = resolve(srcCoreDir, 'browser');
const srcCoreBrowserModerationDir = resolve(srcCoreBrowserDir, 'moderation');
const browserDir = resolve(srcDir, 'browser');
const generateStatsGcfSource = join(
  srcCloudDir,
  'generate-stats',
  'generate-stats-gcf.js'
);
const commonGcfSource = join(srcCloudDir, 'common-gcf.js');
const assignModerationJobGcfSource = join(
  srcCloudDir,
  'assign-moderation-job',
  'assign-moderation-job-gcf.js'
);

const functionDirectories = [
  'assign-moderation-job',
  'generate-stats',
  'get-api-key-credit',
  'get-api-key-credit-v2',
  'get-moderation-variant',
  'hide-variant-html',
  'mark-variant-dirty',
  'process-new-page',
  'process-new-story',
  'update-variant-visibility',
  'render-contents',
  'render-variant',
  'report-for-moderation',
  'submit-moderation-rating',
  'submit-new-page',
  'submit-new-story',
];

const directoryCopies = functionDirectories.map(name => ({
  source: join(srcCloudDir, name),
  target: join(infraFunctionsDir, name),
}));

const sharedBrowserFiles = [
  'authedFetch.js',
  'googleAuth.js',
  'moderate.js',
  'loadStaticConfig.js',
  'contentsGoogleAuthModule.js',
  'contentsMenuToggle.js',
  'variantGoogleSignIn.js',
  'variantMenuToggle.js',
  'variantRedirect.js',
  'statsGoogleAuthModule.js',
  'statsTopStories.js',
  'statsMenu.js',
];

const browserFileCopies = sharedBrowserFiles.map(name => ({
  source: join(browserDir, name),
  target: join(infraDir, name),
}));

const corsConfigSource = join(srcCloudDir, 'cors-config.js');

const corsConfigCopies = functionDirectories.map(name => ({
  source: corsConfigSource,
  target: join(infraFunctionsDir, name, 'cors-config.js'),
}));

const firestoreCopies = functionDirectories.map(name => ({
  source: join(srcCloudDir, 'firestore.js'),
  target: join(infraFunctionsDir, name, 'firestore.js'),
}));

const runtimeDepsDir = join(srcCloudDir, 'runtime-deps');
const sharedPackageFiles = ['package.json', 'package-lock.json'];

const packageFileCopies = functionDirectories.flatMap(name =>
  sharedPackageFiles.map(file => ({
    source: join(runtimeDepsDir, file),
    target: join(infraFunctionsDir, name, file),
  }))
);

const adminCoreSource = join(srcCoreBrowserDir, 'admin-core.js');
const adminConfigSource = join(srcCoreDir, 'admin-config.js');

const assignModerationCoreSource = join(
  srcCoreCloudDir,
  'assign-moderation-job',
  'assign-moderation-job-core.js'
);

const cloudCoreSource = join(srcCoreCloudDir, 'cloud-core.js');
const commonCoreSource = join(srcCoreDir, 'commonCore.js');

const generateStatsCoreSource = join(
  srcCoreCloudDir,
  'generate-stats',
  'generate-stats-core.js'
);
const generateStatsVerifyAdminSource = join(
  srcCoreCloudDir,
  'generate-stats',
  'verifyAdmin.js'
);

const submitNewPageCoreSource = join(
  srcCoreCloudDir,
  'submit-new-page',
  'submit-new-page-core.js'
);

const submitNewPageHelpersSource = join(
  srcCoreCloudDir,
  'submit-new-page',
  'helpers.js'
);

const submitModerationRatingCoreSource = join(
  srcCoreCloudDir,
  'submit-moderation-rating',
  'submit-moderation-rating-core.js'
);

const submitNewStoryCoreSource = join(
  srcCoreCloudDir,
  'submit-new-story',
  'submit-new-story-core.js'
);

const getApiKeyCreditCoreSource = join(
  srcCoreCloudDir,
  'get-api-key-credit',
  'get-api-key-credit-core.js'
);
const getApiKeyCreditCreateDbSource = join(
  srcCoreCloudDir,
  'get-api-key-credit-v2',
  'create-db.js'
);
const getApiKeyCreditValidationSource = join(srcCoreDir, 'validation.js');
const getApiKeyCreditGcfSource = join(
  srcCloudDir,
  'get-api-key-credit',
  'get-api-key-credit-gcf.js'
);

const getApiKeyCreditV2CoreSource = join(
  srcCoreCloudDir,
  'get-api-key-credit-v2',
  'get-api-key-credit-v2-core.js'
);
const getApiKeyCreditV2CreateDbSource = join(
  srcCoreCloudDir,
  'get-api-key-credit-v2',
  'create-db.js'
);
const getApiKeyCreditV2SnapshotSource = join(
  srcCoreCloudDir,
  'get-api-key-credit-v2',
  'get-api-key-credit-snapshot.js'
);
const getApiKeyCreditV2GcfSource = join(
  srcCloudDir,
  'get-api-key-credit-v2',
  'get-api-key-credit-v2-gcf.js'
);

const hideVariantHtmlCoreSource = join(
  srcCoreCloudDir,
  'hide-variant-html',
  'hide-variant-html-core.js'
);
const hideVariantHtmlGcfSource = join(
  srcCloudDir,
  'hide-variant-html',
  'hide-variant-html-gcf.js'
);
const markVariantDirtyCoreSource = join(
  srcCoreCloudDir,
  'mark-variant-dirty',
  'mark-variant-dirty-core.js'
);

const markVariantDirtyVerifyAdminSource = join(
  srcCoreCloudDir,
  'mark-variant-dirty',
  'verifyAdmin.js'
);
const processNewPageCoreSource = join(
  srcCoreCloudDir,
  'process-new-page',
  'process-new-page-core.js'
);
const processNewPageGcfSource = join(
  srcCloudDir,
  'process-new-page',
  'process-new-page-gcf.js'
);
const processNewStoryCoreSource = join(
  srcCoreCloudDir,
  'process-new-story',
  'process-new-story-core.js'
);
const processNewStoryGcfSource = join(
  srcCloudDir,
  'process-new-story',
  'process-new-story-gcf.js'
);
const updateVariantVisibilityCoreSource = join(
  srcCoreCloudDir,
  'update-variant-visibility',
  'update-variant-visibility-core.js'
);
const updateVariantVisibilityGcfSource = join(
  srcCloudDir,
  'update-variant-visibility',
  'update-variant-visibility-gcf.js'
);
const getModerationVariantCorsSource = join(
  srcCoreCloudDir,
  'get-moderation-variant',
  'cors.js'
);
const getModerationVariantCoreSource = join(
  srcCoreCloudDir,
  'get-moderation-variant',
  'get-moderation-variant-core.js'
);
const getModerationVariantGcfSource = join(
  srcCloudDir,
  'get-moderation-variant',
  'get-moderation-variant-gcf.js'
);
const renderContentsCoreSource = join(
  srcCoreCloudDir,
  'render-contents',
  'render-contents-core.js'
);
const renderContentsGcfSource = join(
  srcCloudDir,
  'render-contents',
  'render-contents-gcf.js'
);
const renderVariantCoreSource = join(
  srcCoreCloudDir,
  'render-variant',
  'render-variant-core.js'
);
const renderVariantGcfSource = join(
  srcCloudDir,
  'render-variant',
  'render-variant-gcf.js'
);
const reportForModerationCoreSource = join(
  srcCoreCloudDir,
  'report-for-moderation',
  'report-for-moderation-core.js'
);
const reportForModerationGcfSource = join(
  srcCloudDir,
  'report-for-moderation',
  'report-for-moderation-gcf.js'
);

const getApiKeyCreditFunctionDir = join(
  infraFunctionsDir,
  'get-api-key-credit'
);
const getApiKeyCreditCoreFile = join(
  getApiKeyCreditFunctionDir,
  'get-api-key-credit-core.js'
);
const processNewStoryFunctionDir = join(infraFunctionsDir, 'process-new-story');
const processNewStoryCoreFile = join(
  processNewStoryFunctionDir,
  'process-new-story-core.js'
);
const generateStatsFunctionDir = join(infraFunctionsDir, 'generate-stats');
const generateStatsVerifyAdminFile = join(
  generateStatsFunctionDir,
  'verifyAdmin.js'
);

const adminConfigFunctionDirectories = [
  'generate-stats',
  'mark-variant-dirty',
  'render-contents',
];

const adminConfigFunctionCopies = adminConfigFunctionDirectories.map(name => ({
  source: adminConfigSource,
  target: join(infraFunctionsDir, name, 'admin-config.js'),
}));

const firebaseFunctionsCopies = functionDirectories.map(name => ({
  source: join(srcCloudDir, 'firebase-functions.js'),
  target: join(infraFunctionsDir, name, 'firebase-functions.js'),
}));

const individualFileCopies = [
  {
    source: join(browserDir, 'admin.js'),
    target: join(infraDir, 'admin.js'),
  },
  {
    source: adminCoreSource,
    target: join(infraDir, 'admin-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraDir, 'commonCore.js'),
  },
  {
    source: adminConfigSource,
    target: join(infraDir, 'core', 'admin-config.js'),
  },
  {
    source: join(srcCoreBrowserDir, 'browser-core.js'),
    target: join(infraDir, 'core', 'browser', 'browser-core.js'),
  },
  {
    source: join(srcCoreBrowserDir, 'load-static-config-core.js'),
    target: join(infraDir, 'load-static-config-core.js'),
  },
  {
    source: join(srcCoreBrowserModerationDir, 'authedFetch.js'),
    target: join(infraDir, 'core', 'browser', 'moderation', 'authedFetch.js'),
  },
  {
    source: join(srcCloudDir, 'firebase-functions.js'),
    target: join(infraFunctionsDir, 'firebase-functions.js'),
  },
  ...firebaseFunctionsCopies,
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'cloud-core.js'),
  },
  {
    source: assignModerationCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'assign-moderation-job',
      'assign-moderation-job-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'assign-moderation-job',
      'cloud-core.js'
    ),
  },
  {
    source: assignModerationCoreSource,
    target: join(
      infraFunctionsDir,
      'assign-moderation-job',
      'assign-moderation-job-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'assign-moderation-job', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'assign-moderation-job', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'assign-moderation-job', 'common-gcf.js'),
  },
  {
    source: assignModerationJobGcfSource,
    target: join(
      infraFunctionsDir,
      'assign-moderation-job',
      'assign-moderation-job-gcf.js'
    ),
  },
  {
    source: generateStatsGcfSource,
    target: join(infraFunctionsDir, 'generate-stats', 'generate-stats-gcf.js'),
  },
  {
    source: generateStatsCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'generate-stats',
      'generate-stats-core.js'
    ),
  },
  {
    source: generateStatsVerifyAdminSource,
    target: join(infraDir, 'core', 'cloud', 'generate-stats', 'verifyAdmin.js'),
  },
  {
    source: generateStatsCoreSource,
    target: join(infraFunctionsDir, 'generate-stats', 'generate-stats-core.js'),
  },
  {
    source: generateStatsVerifyAdminSource,
    target: join(infraFunctionsDir, 'generate-stats', 'verifyAdmin.js'),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'generate-stats', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'generate-stats', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'generate-stats', 'common-gcf.js'),
  },
  {
    source: submitNewPageCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'submit-new-page',
      'submit-new-page-core.js'
    ),
  },
  {
    source: submitNewPageCoreSource,
    target: join(
      infraFunctionsDir,
      'submit-new-page',
      'submit-new-page-core.js'
    ),
  },
  {
    source: submitNewPageHelpersSource,
    target: join(infraDir, 'core', 'cloud', 'submit-new-page', 'helpers.js'),
  },
  {
    source: submitNewPageHelpersSource,
    target: join(infraFunctionsDir, 'submit-new-page', 'helpers.js'),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'submit-new-page', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'submit-new-page', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'submit-new-page', 'common-gcf.js'),
  },
  {
    source: getApiKeyCreditCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'get-api-key-credit',
      'get-api-key-credit-core.js'
    ),
  },
  {
    source: getApiKeyCreditCreateDbSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'get-api-key-credit',
      'create-db.js'
    ),
  },
  {
    source: getApiKeyCreditCoreSource,
    target: join(
      infraFunctionsDir,
      'get-api-key-credit',
      'get-api-key-credit-core.js'
    ),
  },
  {
    source: getApiKeyCreditCreateDbSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'create-db.js'),
  },
  {
    source: getApiKeyCreditValidationSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'validation.js'),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'common-gcf.js'),
  },
  {
    source: getApiKeyCreditGcfSource,
    target: join(
      infraFunctionsDir,
      'get-api-key-credit',
      'get-api-key-credit-gcf.js'
    ),
  },
  {
    source: getApiKeyCreditV2CoreSource,
    target: join(
      infraFunctionsDir,
      'get-api-key-credit-v2',
      'get-api-key-credit-v2-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit-v2', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit-v2', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'get-api-key-credit-v2', 'common-gcf.js'),
  },
  {
    source: getApiKeyCreditV2GcfSource,
    target: join(
      infraFunctionsDir,
      'get-api-key-credit-v2',
      'get-api-key-credit-v2-gcf.js'
    ),
  },
  {
    source: getApiKeyCreditV2CreateDbSource,
    target: join(infraFunctionsDir, 'get-api-key-credit-v2', 'create-db.js'),
  },
  {
    source: getApiKeyCreditV2SnapshotSource,
    target: join(
      infraFunctionsDir,
      'get-api-key-credit-v2',
      'get-api-key-credit-snapshot.js'
    ),
  },
  {
    source: hideVariantHtmlCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'hide-variant-html',
      'hide-variant-html-core.js'
    ),
  },
  {
    source: hideVariantHtmlCoreSource,
    target: join(
      infraFunctionsDir,
      'hide-variant-html',
      'hide-variant-html-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'hide-variant-html', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'hide-variant-html', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'hide-variant-html', 'common-gcf.js'),
  },
  {
    source: hideVariantHtmlGcfSource,
    target: join(
      infraFunctionsDir,
      'hide-variant-html',
      'hide-variant-html-gcf.js'
    ),
  },
  {
    source: markVariantDirtyCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'mark-variant-dirty',
      'mark-variant-dirty-core.js'
    ),
  },
  {
    source: markVariantDirtyCoreSource,
    target: join(
      infraFunctionsDir,
      'mark-variant-dirty',
      'mark-variant-dirty-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'mark-variant-dirty', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'mark-variant-dirty', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'mark-variant-dirty', 'common-gcf.js'),
  },
  {
    source: join(
      srcCloudDir,
      'mark-variant-dirty',
      'mark-variant-dirty-gcf.js'
    ),
    target: join(
      infraFunctionsDir,
      'mark-variant-dirty',
      'mark-variant-dirty-gcf.js'
    ),
  },
  {
    source: processNewPageCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'process-new-page',
      'process-new-page-core.js'
    ),
  },
  {
    source: processNewPageCoreSource,
    target: join(
      infraFunctionsDir,
      'process-new-page',
      'process-new-page-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'process-new-page', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'process-new-page', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'process-new-page', 'common-gcf.js'),
  },
  {
    source: processNewPageGcfSource,
    target: join(
      infraFunctionsDir,
      'process-new-page',
      'process-new-page-gcf.js'
    ),
  },
  {
    source: processNewStoryCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'process-new-story',
      'process-new-story-core.js'
    ),
  },
  {
    source: processNewStoryCoreSource,
    target: join(
      infraFunctionsDir,
      'process-new-story',
      'process-new-story-core.js'
    ),
  },
  {
    source: processNewPageCoreSource,
    target: join(
      infraFunctionsDir,
      'process-new-story',
      'process-new-page-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'process-new-story', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'process-new-story', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'process-new-story', 'common-gcf.js'),
  },
  {
    source: processNewStoryGcfSource,
    target: join(
      infraFunctionsDir,
      'process-new-story',
      'process-new-story-gcf.js'
    ),
  },
  {
    source: updateVariantVisibilityCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'update-variant-visibility',
      'update-variant-visibility-core.js'
    ),
  },
  {
    source: updateVariantVisibilityCoreSource,
    target: join(
      infraFunctionsDir,
      'update-variant-visibility',
      'update-variant-visibility-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(
      infraFunctionsDir,
      'update-variant-visibility',
      'cloud-core.js'
    ),
  },
  {
    source: commonCoreSource,
    target: join(
      infraFunctionsDir,
      'update-variant-visibility',
      'commonCore.js'
    ),
  },
  {
    source: commonGcfSource,
    target: join(
      infraFunctionsDir,
      'update-variant-visibility',
      'common-gcf.js'
    ),
  },
  {
    source: updateVariantVisibilityGcfSource,
    target: join(
      infraFunctionsDir,
      'update-variant-visibility',
      'update-variant-visibility-gcf.js'
    ),
  },
  {
    source: markVariantDirtyVerifyAdminSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'mark-variant-dirty',
      'verifyAdmin.js'
    ),
  },
  {
    source: markVariantDirtyVerifyAdminSource,
    target: join(infraFunctionsDir, 'mark-variant-dirty', 'verifyAdmin.js'),
  },
  {
    source: markVariantDirtyVerifyAdminSource,
    target: join(
      infraFunctionsDir,
      'generate-stats',
      'mark-variant-dirty-verifyAdmin.js'
    ),
  },
  {
    source: getModerationVariantCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'get-moderation-variant',
      'get-moderation-variant-core.js'
    ),
  },
  {
    source: getModerationVariantCoreSource,
    target: join(
      infraFunctionsDir,
      'get-moderation-variant',
      'get-moderation-variant-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'get-moderation-variant', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'get-moderation-variant', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'get-moderation-variant', 'common-gcf.js'),
  },
  {
    source: getModerationVariantGcfSource,
    target: join(
      infraFunctionsDir,
      'get-moderation-variant',
      'get-moderation-variant-gcf.js'
    ),
  },
  {
    source: getModerationVariantCorsSource,
    target: join(infraFunctionsDir, 'get-moderation-variant', 'cors.js'),
  },
  {
    source: renderContentsCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'render-contents',
      'render-contents-core.js'
    ),
  },
  {
    source: renderContentsCoreSource,
    target: join(
      infraFunctionsDir,
      'render-contents',
      'render-contents-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'render-contents', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'render-contents', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'render-contents', 'common-gcf.js'),
  },
  {
    source: renderContentsGcfSource,
    target: join(
      infraFunctionsDir,
      'render-contents',
      'render-contents-gcf.js'
    ),
  },
  {
    source: renderVariantCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'render-variant',
      'render-variant-core.js'
    ),
  },
  {
    source: renderVariantCoreSource,
    target: join(infraFunctionsDir, 'render-variant', 'render-variant-core.js'),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'render-variant', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'render-variant', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'render-variant', 'common-gcf.js'),
  },
  {
    source: renderVariantGcfSource,
    target: join(infraFunctionsDir, 'render-variant', 'render-variant-gcf.js'),
  },
  {
    source: reportForModerationCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'report-for-moderation',
      'report-for-moderation-core.js'
    ),
  },
  {
    source: reportForModerationCoreSource,
    target: join(
      infraFunctionsDir,
      'report-for-moderation',
      'report-for-moderation-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'report-for-moderation', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'report-for-moderation', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'report-for-moderation', 'common-gcf.js'),
  },
  {
    source: reportForModerationGcfSource,
    target: join(
      infraFunctionsDir,
      'report-for-moderation',
      'report-for-moderation-gcf.js'
    ),
  },
  {
    source: submitModerationRatingCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'submit-moderation-rating',
      'submit-moderation-rating-core.js'
    ),
  },
  {
    source: submitModerationRatingCoreSource,
    target: join(
      infraFunctionsDir,
      'submit-moderation-rating',
      'submit-moderation-rating-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(
      infraFunctionsDir,
      'submit-moderation-rating',
      'cloud-core.js'
    ),
  },
  {
    source: commonCoreSource,
    target: join(
      infraFunctionsDir,
      'submit-moderation-rating',
      'commonCore.js'
    ),
  },
  {
    source: commonGcfSource,
    target: join(
      infraFunctionsDir,
      'submit-moderation-rating',
      'common-gcf.js'
    ),
  },
  {
    source: submitNewStoryCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'submit-new-story',
      'submit-new-story-core.js'
    ),
  },
  {
    source: submitNewStoryCoreSource,
    target: join(
      infraFunctionsDir,
      'submit-new-story',
      'submit-new-story-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'submit-new-story', 'cloud-core.js'),
  },
  {
    source: commonCoreSource,
    target: join(infraFunctionsDir, 'submit-new-story', 'commonCore.js'),
  },
  {
    source: commonGcfSource,
    target: join(infraFunctionsDir, 'submit-new-story', 'common-gcf.js'),
  },
  ...adminConfigFunctionCopies,
  ...browserFileCopies,
  ...firestoreCopies,
  ...corsConfigCopies,
  ...packageFileCopies,
];

const io = createAsyncFsAdapters();

const logger = {
  info: message => console.log(message),
};

const { runCopyToInfra } = createCopyToInfraCore({
  projectRoot,
  path: pathAdapters,
});

/**
 * Format an absolute path so log messages show it relative to the project root.
 * @param {string} targetPath - Absolute path being logged.
 * @returns {string} Relative path suitable for log output.
 */
function formatForLog(targetPath) {
  return relative(projectRoot, targetPath);
}

/**
 * Rewrite an import specifier within a file if the original specifier is found.
 * @param {string} filePath - Absolute path to the file whose contents may change.
 * @param {string} from - The import specifier to search for.
 * @param {string} to - The replacement import specifier.
 * @returns {Promise<void>} Promise that resolves once the file has been updated or skipped.
 */
async function rewriteImport(filePath, from, to) {
  const original = await fs.readFile(filePath, 'utf8');

  if (!original.includes(from)) {
    return;
  }

  const updated = original.replaceAll(from, to);

  if (updated === original) {
    return;
  }

  await fs.writeFile(filePath, updated);
  logger.info(
    `Rewrote ${formatForLog(filePath)} import from "${from}" to "${to}"`
  );
}

await runCopyToInfra({
  directoryCopies,
  individualFileCopies,
  io,
  messageLogger: logger,
});

await Promise.all([
  rewriteImport(
    getApiKeyCreditCoreFile,
    '../../validation.js',
    './validation.js'
  ),
  rewriteImport(
    processNewStoryCoreFile,
    '../process-new-page/process-new-page-core.js',
    './process-new-page-core.js'
  ),
  rewriteImport(
    generateStatsVerifyAdminFile,
    '../cloud-core.js',
    './mark-variant-dirty-verifyAdmin.js'
  ),
  rewriteImport(
    join(infraFunctionsDir, 'mark-variant-dirty', 'mark-variant-dirty-core.js'),
    '../cloud-core.js',
    './cloud-core.js'
  ),
  rewriteImport(
    join(infraFunctionsDir, 'mark-variant-dirty', 'verifyAdmin.js'),
    '../cloud-core.js',
    './cloud-core.js'
  ),
  rewriteImport(
    join(
      infraFunctionsDir,
      'generate-stats',
      'mark-variant-dirty-verifyAdmin.js'
    ),
    '../cloud-core.js',
    './cloud-core.js'
  ),
]);
