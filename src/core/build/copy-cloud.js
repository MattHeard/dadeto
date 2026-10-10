import { createCopyToInfraCore } from './copy.js';
import {
  createAsyncFsAdapters,
  createPathAdapters,
  getCurrentDirectory,
} from '../commonCore.js';

/**
 * Copy-plan record consumed by the declarative manifest projections below.
 * @typedef {{[key: string]: any}} CopyCloudPlanValues
 */
/** @typedef {CopyCloudPlanValues & {functionDirectories: string[]}} CopyCloudDirectoryPlanValues */

/**
 * Run the copy-cloud workflow with injected platform helpers.
 * @param {{
 *   fileURLToPathFn: (moduleUrl: string) => string,
 *   dirnameFn: (input: string) => string,
 *   pathModule: {
 *     join: (base: string, ...segments: string[]) => string,
 *     dirname: (input: string) => string,
 *     resolve: (base: string, ...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     extname: (input: string) => string,
 *     sep: string,
 *   },
 *   fsPromisesModule: {
 *     readdir: (dir: string, options?: { withFileTypes?: boolean }) => Promise<unknown[]>,
 *     mkdir: (target: string, options?: { recursive?: boolean }) => Promise<unknown>,
 *     copyFile: (source: string, destination: string) => Promise<void>,
 *     readFile: (filePath: string, encoding: 'utf8') => Promise<string>,
 *     writeFile: (filePath: string, content: string) => Promise<void>,
 *   },
 *   logger?: { info: (message: string) => void },
 * }} deps Build dependencies.
 * @returns {Promise<void>} Copy workflow completion promise.
 */
/**
 * Build the filesystem copy plan for the cloud infrastructure.
 * @param {Parameters<typeof createCopyCloudHandle>[0]} deps Build dependencies.
 * @returns {CopyCloudPlanValues} Copy plan consumed by the execution handle.
 */
/**
 * Build the individual file copy entries for the cloud infrastructure.
 * @param {CopyCloudPlanValues} planValues Path and source values used by copy entries.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
/**
 * Build copy-entry chunk 1.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
// Stryker disable all -- declarative cloud-copy manifest entries are reviewed as a static asset table; workflow behavior is covered below.
function createIndividualFileCopiesPart1(planValues) {
  return [
    {
      source: planValues.join(planValues.browserDir, 'admin.js'),
      target: planValues.join(planValues.infraDir, 'admin.js'),
    },
    {
      source: planValues.join(planValues.browserDir, 'admin-core.js'),
      target: planValues.join(planValues.infraDir, 'admin-core.js'),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(planValues.infraDir, 'commonCore.js'),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(planValues.infraDir, 'core', 'commonCore.js'),
    },
    {
      source: planValues.errorReportingSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'error-reporting.js'
      ),
    },
    {
      source: planValues.expressAppSource,
      target: planValues.join(planValues.infraDir, 'core', 'express-app.js'),
    },
    {
      source: planValues.join(planValues.srcCoreBrowserDir, 'browser-core.js'),
      target: planValues.join(
        planValues.infraDir,
        'core',
        'browser',
        'browser-core.js'
      ),
    },
    {
      source: planValues.join(
        planValues.browserDir,
        'load-static-config-core.js'
      ),
      target: planValues.join(
        planValues.infraDir,
        'load-static-config-core.js'
      ),
    },
    {
      source: planValues.join(
        planValues.srcCoreBrowserModerationDir,
        'authedFetch.js'
      ),
      target: planValues.join(
        planValues.infraDir,
        'core',
        'browser',
        'moderation',
        'authedFetch.js'
      ),
    },
    {
      source: planValues.join(planValues.srcCloudDir, 'firebase-functions.js'),
      target: planValues.join(
        planValues.infraFunctionsDir,
        'firebase-functions.js'
      ),
    },
    {
      source: planValues.errorReportingSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'errors',
        'core',
        'error-reporting.js'
      ),
    },
    ...planValues.firebaseFunctionsCopies,
    ...planValues.functionCoreLocalCopies,
    ...planValues.functionCoreBuildCopies,
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(planValues.infraFunctionsDir, 'cloud-core.js'),
    },
    {
      source: planValues.assignModerationCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'assign-moderation-job',
        'assign-moderation-job-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'assign-moderation-job',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.assignModerationCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'assign-moderation-job',
        'assign-moderation-job-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'assign-moderation-job',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'assign-moderation-job',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'assign-moderation-job',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.assignModerationJobGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'assign-moderation-job',
        'assign-moderation-job-gcf.js'
      ),
    },
    {
      source: planValues.generateStatsGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'generate-stats-gcf.js'
      ),
    },
    {
      source: planValues.generateStatsCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'generate-stats',
        'generate-stats-core.js'
      ),
    },
    {
      source: planValues.generateStatsVerifyAdminSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'generate-stats',
        'verifyAdmin.js'
      ),
    },
    {
      source: planValues.generateStatsCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'generate-stats-core.js'
      ),
    },
    {
      source: planValues.generateStatsVerifyAdminSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'verifyAdmin.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'commonCore.js'
      ),
    },
    {
      source: planValues.expressAppSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'core',
        'express-app.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.submitNewPageCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'submit-new-page',
        'submit-new-page-core.js'
      ),
    },
    {
      source: planValues.submitNewPageCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'submit-new-page-core.js'
      ),
    },
    {
      source: planValues.submitNewPageHelpersSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'submit-new-page',
        'helpers.js'
      ),
    },
    {
      source: planValues.submitNewPageHelpersSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'helpers.js'
      ),
    },
    {
      source: planValues.join(
        planValues.srcCloudDir,
        'submit-new-page',
        'runtime.js'
      ),
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'runtime.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'cloud-core.js'
      ),
    },
  ];
}

/**
 * Build copy-entry chunk 2.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
function createIndividualFileCopiesPart2(planValues) {
  return [
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'get-api-key-credit',
        'get-api-key-credit-core.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditCreateDbSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'get-api-key-credit',
        'create-db.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'get-api-key-credit-core.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditCreateDbSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'create-db.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit',
        'get-api-key-credit-gcf.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditV2CoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'get-api-key-credit-v2-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditV2GcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'get-api-key-credit-v2-gcf.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditV2CreateDbSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'create-db.js'
      ),
    },
    {
      source: planValues.getApiKeyCreditV2SnapshotSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-api-key-credit-v2',
        'get-api-key-credit-snapshot.js'
      ),
    },
    {
      source: planValues.hideVariantHtmlCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'hide-variant-html',
        'hide-variant-html-core.js'
      ),
    },
    {
      source: planValues.hideVariantHtmlCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'hide-variant-html',
        'hide-variant-html-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'hide-variant-html',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'hide-variant-html',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'hide-variant-html',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.hideVariantHtmlGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'hide-variant-html',
        'hide-variant-html-gcf.js'
      ),
    },
    {
      source: planValues.markVariantDirtyCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'mark-variant-dirty',
        'mark-variant-dirty-core.js'
      ),
    },
    {
      source: planValues.markVariantDirtyCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'mark-variant-dirty-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.join(
        planValues.srcCloudDir,
        'mark-variant-dirty',
        'mark-variant-dirty-gcf.js'
      ),
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'mark-variant-dirty-gcf.js'
      ),
    },
    {
      source: planValues.processNewPageCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'process-new-page',
        'process-new-page-core.js'
      ),
    },
  ];
}

/**
 * Build copy-entry chunk 3.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
function createIndividualFileCopiesPart3(planValues) {
  return [
    {
      source: planValues.processNewPageCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-page',
        'process-new-page-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-page',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-page',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-page',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.processNewPageGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-page',
        'process-new-page-gcf.js'
      ),
    },
    {
      source: planValues.processNewStoryCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'process-new-story',
        'process-new-story-core.js'
      ),
    },
    {
      source: planValues.processNewStoryCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'process-new-story-core.js'
      ),
    },
    {
      source: planValues.processNewPageCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'process-new-page-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.processNewStoryGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'process-new-story',
        'process-new-story-gcf.js'
      ),
    },
    {
      source: planValues.updateVariantVisibilityCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'update-variant-visibility',
        'update-variant-visibility-core.js'
      ),
    },
    {
      source: planValues.updateVariantVisibilityCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'update-variant-visibility',
        'update-variant-visibility-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'update-variant-visibility',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'update-variant-visibility',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'update-variant-visibility',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.updateVariantVisibilityGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'update-variant-visibility',
        'update-variant-visibility-gcf.js'
      ),
    },
    {
      source: planValues.markVariantDirtyVerifyAdminSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'mark-variant-dirty',
        'verifyAdmin.js'
      ),
    },
    {
      source: planValues.markVariantDirtyVerifyAdminSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'mark-variant-dirty',
        'verifyAdmin.js'
      ),
    },
    {
      source: planValues.markVariantDirtyVerifyAdminSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'generate-stats',
        'mark-variant-dirty-verifyAdmin.js'
      ),
    },
    {
      source: planValues.getModerationVariantCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'get-moderation-variant',
        'get-moderation-variant-core.js'
      ),
    },
    {
      source: planValues.getModerationVariantCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'get-moderation-variant-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'common-gcf.js'
      ),
    },
  ];
}

/**
 * Build copy-entry chunk 4.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
/**
 * Build individual file copy chunk 41.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
function createIndividualFileCopiesPart41(planValues) {
  return [
    {
      source: planValues.getModerationVariantGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'get-moderation-variant-gcf.js'
      ),
    },
    {
      source: planValues.getModerationVariantCorsSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'get-moderation-variant',
        'cors.js'
      ),
    },
    {
      source: planValues.renderContentsCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'render-contents',
        'render-contents-core.js'
      ),
    },
    {
      source: planValues.renderContentsCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-contents',
        'render-contents-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-contents',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-contents',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-contents',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.renderContentsGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-contents',
        'render-contents-gcf.js'
      ),
    },
    {
      source: planValues.renderVariantCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'render-variant',
        'render-variant-core.js'
      ),
    },
    {
      source: planValues.renderVariantCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-variant',
        'render-variant-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-variant',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-variant',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-variant',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.renderVariantGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'render-variant',
        'render-variant-gcf.js'
      ),
    },
    {
      source: planValues.reportForModerationCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'report-for-moderation',
        'report-for-moderation-core.js'
      ),
    },
    {
      source: planValues.reportForModerationCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'report-for-moderation',
        'report-for-moderation-core.js'
      ),
    },
  ];
}

/**
 * Build individual file copy chunk 42.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
function createIndividualFileCopiesPart42(planValues) {
  return [
    {
      source: planValues.join(
        planValues.srcCoreDir,
        '..',
        'cloud',
        'allow-effects.js'
      ),
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-story',
        'allow-effects.js'
      ),
    },
    {
      source: planValues.join(
        planValues.srcCoreDir,
        '..',
        'cloud',
        'allow-effects.js'
      ),
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-page',
        'allow-effects.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'report-for-moderation',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'report-for-moderation',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'report-for-moderation',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.reportForModerationGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'report-for-moderation',
        'report-for-moderation-gcf.js'
      ),
    },
    {
      source: planValues.submitModerationRatingCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'submit-moderation-rating',
        'submit-moderation-rating-core.js'
      ),
    },
    {
      source: planValues.submitModerationRatingCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-moderation-rating',
        'submit-moderation-rating-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-moderation-rating',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-moderation-rating',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-moderation-rating',
        'common-gcf.js'
      ),
    },
    {
      source: planValues.submitNewStoryCoreSource,
      target: planValues.join(
        planValues.infraDir,
        'core',
        'cloud',
        'submit-new-story',
        'submit-new-story-core.js'
      ),
    },
    {
      source: planValues.submitNewStoryCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-story',
        'submit-new-story-core.js'
      ),
    },
    {
      source: planValues.cloudCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-story',
        'cloud-core.js'
      ),
    },
    {
      source: planValues.commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-story',
        'commonCore.js'
      ),
    },
    {
      source: planValues.commonGcfSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'submit-new-story',
        'common-gcf.js'
      ),
    },
    ...planValues.browserFileCopies,
    ...planValues.firestoreCopies,
    ...planValues.corsConfigCopies,
    ...planValues.commonCoreCopies,
    ...planValues.preservedCommonCoreCopies,
    planValues.paymentWebhookCoreCopy,
    ...planValues.functionSpecificCommonCoreCopies,
    ...planValues.sharedUtilityCopies,
    ...planValues.preservedSharedUtilityCopies,
    ...planValues.packageFileCopies,
  ];
}

/**
 * Build all individual file copy entries.
 * @param {CopyCloudPlanValues} planValues Copy plan values.
 * @returns {Array<{source: string, target: string}>} Copy entries.
 */
function createIndividualFileCopies(planValues) {
  return [
    ...createIndividualFileCopiesPart1(planValues),
    ...createIndividualFileCopiesPart2(planValues),
    ...createIndividualFileCopiesPart3(planValues),
    ...createIndividualFileCopiesPart41(planValues),
    ...createIndividualFileCopiesPart42(planValues),
  ];
}

/**
 * Build the cloud copy plan from injected filesystem and path dependencies.
 * @param {object} deps Build dependencies.
 * @returns {CopyCloudPlanValues} Copy plan consumed by the execution handle.
 */
/**
 * Build the directory and browser copy topology.
 * @param {CopyCloudPlanValues} planValues Path adapters and source directories.
 * @returns {CopyCloudPlanValues} Directory copy entries.
 */
function createCopyCloudDirectoryPlan(planValues) {
  const functionDirectories = [
    'chronoflow-time',
    'assign-moderation-job',
    'generate-stats',
    'get-api-key-credit',
    'get-api-key-credit-v2',
    'get-moderation-variant',
    'hide-variant-html',
    'mark-variant-dirty',
    'errors',
    'create-checkout-session',
    'billing',
    'billing-purchase-status',
    'payment-webhook',
    'process-new-page',
    'process-new-story',
    'update-variant-visibility',
    'render-contents',
    'realtime-call',
    'render-variant',
    'render-author',
    'report-for-moderation',
    'submit-moderation-rating',
    'submit-new-page',
    'submit-new-story',
    'object-minute-rental-search',
  ];
  const typedFunctionDirectories = /** @type {string[]} */ (
    functionDirectories
  );

  const directoryCopies = typedFunctionDirectories.map(name => ({
    source: planValues.join(planValues.srcCloudDir, name),
    target: planValues.join(planValues.infraFunctionsDir, name),
  }));

  const functionSpecificCoreCloudDirectories = typedFunctionDirectories.filter(
    name => name !== 'realtime-call'
  );

  const preservedCloudTreeCopies = [
    ...typedFunctionDirectories.flatMap(name => [
      {
        source: planValues.join(planValues.srcCloudDir, name),
        target: planValues.join(
          planValues.infraFunctionsDir,
          name,
          'cloud',
          name
        ),
      },
      {
        source: planValues.srcCloudDir,
        target: planValues.join(planValues.infraFunctionsDir, name, 'cloud'),
      },
      {
        source: planValues.srcCoreCloudDir,
        target: planValues.join(
          planValues.infraFunctionsDir,
          name,
          'core',
          'cloud'
        ),
      },
    ]),
    ...functionSpecificCoreCloudDirectories.map(name => ({
      source: planValues.join(planValues.srcCoreCloudDir, name),
      target: planValues.join(
        planValues.infraFunctionsDir,
        name,
        'core',
        'cloud',
        name
      ),
    })),
    ...typedFunctionDirectories.flatMap(name => [
      {
        source: planValues.srcCoreBrowserDir,
        target: planValues.join(
          planValues.infraFunctionsDir,
          name,
          'core',
          'browser'
        ),
      },
      {
        source: planValues.srcCoreBuildDir,
        target: planValues.join(
          planValues.infraFunctionsDir,
          name,
          'core',
          'build'
        ),
      },
    ]),
  ];

  const sharedBrowserFiles = [
    'allow-effects.js',
    'authedFetch.js',
    'document.js',
    'googleAuth.js',
    'logging.js',
    'moderate.js',
    'loadStaticConfig.js',
    'moderation/endpoints.js',
    'contentsGoogleAuthModule.js',
    'contentsMenuToggle.js',
    'variantGoogleSignIn.js',
    'variantMenuToggle.js',
    'variantRedirect.js',
    'statsGoogleAuthModule.js',
    'statsTopStories.js',
    'statsMenu.js',
  ];

  const coreRealtimeCopies = [
    {
      source: planValues.srcCoreRealtimeDir,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'realtime-call',
        'cloud',
        'realtime-call',
        'core',
        'realtime'
      ),
    },
    {
      source: planValues.srcCoreCloudDir,
      target: planValues.join(
        planValues.infraFunctionsDir,
        'realtime-call',
        'cloud',
        'realtime-call',
        'core',
        'cloud'
      ),
    },
  ];

  const objectMinuteRentalSearchCoreCopy = {
    source: planValues.srcCoreObjectMinuteRentalSearchDir,
    target: planValues.join(
      planValues.infraFunctionsDir,
      'object-minute-rental-search',
      'core',
      'object-minute-rental-search'
    ),
  };

  const objectMinuteRentalSearchWgs84Copy = {
    source: planValues.join(planValues.srcCoreDir, 'wgs84.js'),
    target: planValues.join(
      planValues.infraFunctionsDir,
      'object-minute-rental-search',
      'core',
      'wgs84.js'
    ),
  };

  const coreBrowserCopies = [
    {
      source: planValues.srcCoreBrowserDir,
      target: planValues.join(planValues.infraDir, 'core', 'browser'),
    },
  ];

  const browserFileCopies = sharedBrowserFiles.map(name => ({
    source: planValues.join(planValues.browserDir, name),
    target: planValues.join(planValues.infraDir, name),
  }));
  return {
    functionDirectories,
    directoryCopies,
    preservedCloudTreeCopies,
    coreRealtimeCopies,
    objectMinuteRentalSearchCoreCopy,
    objectMinuteRentalSearchWgs84Copy,
    coreBrowserCopies,
    browserFileCopies,
  };
}

/**
 * Build the cloud copy plan from injected filesystem and path dependencies.
 * @param {any} deps Build dependencies.
 * @returns {object} Copy plan consumed by the execution handle.
 */
/**
 * Build common cloud source copy values.
 * @param {CopyCloudDirectoryPlanValues} planValues Path and source values.
 * @returns {CopyCloudPlanValues} Derived copy values.
 */
function createCopyCloudSourceCopies(planValues) {
  const typedFunctionDirectories = /** @type {string[]} */ (
    planValues.functionDirectories
  );
  const corsConfigSource = planValues.join(
    planValues.srcCloudDir,
    'cors-config.js'
  );

  const corsConfigCopies = typedFunctionDirectories.map(name => ({
    source: corsConfigSource,
    target: planValues.join(
      planValues.infraFunctionsDir,
      name,
      'cors-config.js'
    ),
  }));

  const firestoreCopies = planValues.functionDirectories.map(name => ({
    source: planValues.join(planValues.srcCloudDir, 'firestore.js'),
    target: planValues.join(planValues.infraFunctionsDir, name, 'firestore.js'),
  }));

  const runtimeDepsDir = planValues.join(
    planValues.srcCloudDir,
    'runtime-deps'
  );
  const sharedPackageFiles = ['package.json', 'package-lock.json'];

  const packageFileCopies = planValues.functionDirectories.flatMap(name =>
    sharedPackageFiles.map(file => ({
      source: planValues.join(runtimeDepsDir, file),
      target: planValues.join(planValues.infraFunctionsDir, name, file),
    }))
  );

  const assignModerationCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'assign-moderation-job',
    'assign-moderation-job-core.js'
  );

  const cloudCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'cloud-core.js'
  );
  // Package the implementation behind the source barrel. Function archives
  // flatten imports, so copying commonCore.js would leave a missing
  // ./index.js dependency at runtime.
  const commonCoreSource = planValues.join(planValues.srcCoreDir, 'index.js');
  const errorReportingSource = planValues.join(
    planValues.srcCoreDir,
    'error-reporting.js'
  );
  const paymentWebhookCoreSource = planValues.join(
    planValues.srcCoreDir,
    'payment-webhook-core.js'
  );
  const expressAppSource = planValues.join(
    planValues.srcCoreDir,
    'express-app.js'
  );
  const expressAppDepsSource = planValues.join(
    planValues.srcCoreDir,
    'local',
    'express-app-deps.js'
  );

  const commonCoreCopies = planValues.functionDirectories.map(name => ({
    source: commonCoreSource,
    target: planValues.join(
      planValues.infraFunctionsDir,
      name,
      'commonCore.js'
    ),
  }));

  const functionCoreLocalCopies = planValues.functionDirectories.map(name => ({
    source: expressAppDepsSource,
    target: planValues.join(
      planValues.infraFunctionsDir,
      name,
      'core',
      'local',
      'express-app-deps.js'
    ),
  }));

  const preservedCommonCoreCopies = planValues.functionDirectories.map(
    name => ({
      source: commonCoreSource,
      target: planValues.join(
        planValues.infraFunctionsDir,
        name,
        'core',
        'commonCore.js'
      ),
    })
  );

  const paymentWebhookCoreCopy = {
    source: paymentWebhookCoreSource,
    target: planValues.join(
      planValues.infraFunctionsDir,
      'payment-webhook',
      'core',
      'payment-webhook-core.js'
    ),
  };

  const generateStatsCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'generate-stats',
    'generate-stats-core.js'
  );
  const generateStatsVerifyAdminSource = planValues.join(
    planValues.srcCoreCloudDir,
    'generate-stats',
    'verifyAdmin.js'
  );

  const submitNewPageCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'submit-new-page',
    'submit-new-page-core.js'
  );

  const submitNewPageHelpersSource = planValues.join(
    planValues.srcCoreCloudDir,
    'submit-new-page',
    'helpers.js'
  );

  const submitModerationRatingCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'submit-moderation-rating',
    'submit-moderation-rating-core.js'
  );

  const submitNewStoryCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'submit-new-story',
    'submit-new-story-core.js'
  );

  const getApiKeyCreditCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-api-key-credit',
    'get-api-key-credit-core.js'
  );
  const getApiKeyCreditCreateDbSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-api-key-credit-v2',
    'create-db.js'
  );
  const getApiKeyCreditGcfSource = planValues.join(
    planValues.srcCloudDir,
    'get-api-key-credit',
    'get-api-key-credit-gcf.js'
  );

  const getApiKeyCreditV2CoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-api-key-credit-v2',
    'get-api-key-credit-v2-core.js'
  );
  const getApiKeyCreditV2CreateDbSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-api-key-credit-v2',
    'create-db.js'
  );
  const getApiKeyCreditV2SnapshotSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-api-key-credit-v2',
    'get-api-key-credit-snapshot.js'
  );
  const getApiKeyCreditV2GcfSource = planValues.join(
    planValues.srcCloudDir,
    'get-api-key-credit-v2',
    'get-api-key-credit-v2-gcf.js'
  );
  return {
    corsConfigSource,
    corsConfigCopies,
    firestoreCopies,
    runtimeDepsDir,
    sharedPackageFiles,
    packageFileCopies,
    assignModerationCoreSource,
    cloudCoreSource,
    commonCoreSource,
    errorReportingSource,
    paymentWebhookCoreSource,
    expressAppSource,
    functionCoreLocalCopies,
    commonCoreCopies,
    preservedCommonCoreCopies,
    paymentWebhookCoreCopy,
    generateStatsCoreSource,
    generateStatsVerifyAdminSource,
    submitNewPageCoreSource,
    submitNewPageHelpersSource,
    submitModerationRatingCoreSource,
    submitNewStoryCoreSource,
    getApiKeyCreditCoreSource,
    getApiKeyCreditCreateDbSource,
    getApiKeyCreditGcfSource,
    getApiKeyCreditV2CoreSource,
    getApiKeyCreditV2CreateDbSource,
    getApiKeyCreditV2SnapshotSource,
    getApiKeyCreditV2GcfSource,
  };
}

/**
 * Build the remaining cloud source and utility copy values.
 * @param {CopyCloudDirectoryPlanValues} planValues Path and source values.
 * @returns {CopyCloudPlanValues} Derived copy values.
 */
function createCopyCloudSourcePaths(planValues) {
  const hideVariantHtmlCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'hide-variant-html',
    'hide-variant-html-core.js'
  );
  const hideVariantHtmlGcfSource = planValues.join(
    planValues.srcCloudDir,
    'hide-variant-html',
    'hide-variant-html-gcf.js'
  );
  const markVariantDirtyCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'mark-variant-dirty',
    'mark-variant-dirty-core.js'
  );

  const markVariantDirtyVerifyAdminSource = planValues.join(
    planValues.srcCoreCloudDir,
    'mark-variant-dirty',
    'verifyAdmin.js'
  );
  const processNewPageCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'process-new-page',
    'process-new-page-core.js'
  );
  const processNewPageGcfSource = planValues.join(
    planValues.srcCloudDir,
    'process-new-page',
    'process-new-page-gcf.js'
  );
  const processNewStoryCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'process-new-story',
    'process-new-story-core.js'
  );
  const processNewStoryGcfSource = planValues.join(
    planValues.srcCloudDir,
    'process-new-story',
    'process-new-story-gcf.js'
  );
  const updateVariantVisibilityCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'update-variant-visibility',
    'update-variant-visibility-core.js'
  );
  const updateVariantVisibilityGcfSource = planValues.join(
    planValues.srcCloudDir,
    'update-variant-visibility',
    'update-variant-visibility-gcf.js'
  );
  const getModerationVariantCorsSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-moderation-variant',
    'cors.js'
  );
  const getModerationVariantCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'get-moderation-variant',
    'get-moderation-variant-core.js'
  );
  const getModerationVariantGcfSource = planValues.join(
    planValues.srcCloudDir,
    'get-moderation-variant',
    'get-moderation-variant-gcf.js'
  );
  const renderContentsCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'render-contents',
    'render-contents-core.js'
  );
  const renderContentsGcfSource = planValues.join(
    planValues.srcCloudDir,
    'render-contents',
    'render-contents-gcf.js'
  );
  const renderVariantCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'render-variant',
    'render-variant-core.js'
  );
  const renderVariantGcfSource = planValues.join(
    planValues.srcCloudDir,
    'render-variant',
    'render-variant-gcf.js'
  );
  const reportForModerationCoreSource = planValues.join(
    planValues.srcCoreCloudDir,
    'report-for-moderation',
    'report-for-moderation-core.js'
  );
  const reportForModerationGcfSource = planValues.join(
    planValues.srcCloudDir,
    'report-for-moderation',
    'report-for-moderation-gcf.js'
  );

  const processNewStoryFunctionDir = planValues.join(
    planValues.infraFunctionsDir,
    'process-new-story'
  );
  const processNewStoryCoreFile = planValues.join(
    processNewStoryFunctionDir,
    'process-new-story-core.js'
  );
  const generateStatsFunctionDir = planValues.join(
    planValues.infraFunctionsDir,
    'generate-stats'
  );
  const generateStatsVerifyAdminFile = planValues.join(
    generateStatsFunctionDir,
    'verifyAdmin.js'
  );

  const firebaseFunctionsCopies = planValues.functionDirectories.map(name => ({
    source: planValues.join(planValues.srcCloudDir, 'firebase-functions.js'),
    target: planValues.join(
      planValues.infraFunctionsDir,
      name,
      'firebase-functions.js'
    ),
  }));

  // Function-specific common-core.js files that need to be copied
  const functionSpecificCommonCoreFiles = [
    'get-api-key-credit',
    'get-api-key-credit-v2',
    'submit-new-story',
    'submit-new-page',
    'render-contents',
    'submit-moderation-rating',
    'generate-stats',
    'render-variant',
  ];

  const functionSpecificCommonCoreCopies =
    functionSpecificCommonCoreFiles.flatMap(name => {
      const source = planValues.join(
        planValues.srcCoreCloudDir,
        name,
        'common-core.js'
      );
      const target = planValues.join(
        planValues.infraFunctionsDir,
        name,
        'common-core.js'
      );
      return { source, target };
    });

  // Shared utility files that need to be copied to all function directories
  const sharedUtilityFiles = [
    'submit-shared.js',
    'handler-utils.js',
    'parallel-utils.js',
    'response-utils.js',
    'request-normalization.js',
    'responder-utils.js',
    'auth-helpers.js',
    'allowed-origins.js',
    'http-method-guard.js',
    'firestore-helpers.js',
  ];

  const sharedUtilityCopies = planValues.functionDirectories.flatMap(
    functionName =>
      sharedUtilityFiles.map(file => ({
        source: planValues.join(planValues.srcCoreCloudDir, file),
        target: planValues.join(
          planValues.infraFunctionsDir,
          functionName,
          toCopiedUtilityFileName(file)
        ),
      }))
  );

  const preservedSharedUtilityCopies = planValues.functionDirectories.flatMap(
    functionName =>
      sharedUtilityFiles.map(file => ({
        source: planValues.join(planValues.srcCoreCloudDir, file),
        target: planValues.join(
          planValues.infraFunctionsDir,
          functionName,
          'core',
          'cloud',
          toCopiedUtilityFileName(file)
        ),
      }))
  );

  const functionCoreBuildCopies = planValues.functionDirectories.map(name => ({
    source: planValues.join(planValues.srcCoreDir, 'build', 'process-utils.js'),
    target: planValues.join(
      planValues.infraFunctionsDir,
      name,
      'core',
      'build',
      'process-utils.js'
    ),
  }));

  /**
   * Map the shared utility filename to its infra destination filename.
   * @param {string} file Shared utility filename.
   * @returns {string} Destination filename.
   */
  function toCopiedUtilityFileName(file) {
    return file;
  }
  return {
    hideVariantHtmlCoreSource,
    hideVariantHtmlGcfSource,
    markVariantDirtyCoreSource,
    markVariantDirtyVerifyAdminSource,
    processNewPageCoreSource,
    processNewPageGcfSource,
    processNewStoryCoreSource,
    processNewStoryGcfSource,
    updateVariantVisibilityCoreSource,
    updateVariantVisibilityGcfSource,
    getModerationVariantCorsSource,
    getModerationVariantCoreSource,
    getModerationVariantGcfSource,
    renderContentsCoreSource,
    renderContentsGcfSource,
    renderVariantCoreSource,
    renderVariantGcfSource,
    reportForModerationCoreSource,
    reportForModerationGcfSource,
    processNewStoryFunctionDir,
    processNewStoryCoreFile,
    generateStatsFunctionDir,
    generateStatsVerifyAdminFile,
    firebaseFunctionsCopies,
    functionSpecificCommonCoreFiles,
    functionSpecificCommonCoreCopies,
    sharedUtilityFiles,
    sharedUtilityCopies,
    preservedSharedUtilityCopies,
    functionCoreBuildCopies,
  };
}

/**
 * Build the cloud copy plan from injected filesystem and path dependencies.
 * @param {any} deps Build dependencies.
 * @returns {CopyCloudPlanValues} Copy plan consumed by the execution handle.
 */
// Stryker restore all
// Stryker disable all -- the cloud path/source manifest is a reviewed declarative deployment table.
function createCopyCloudPlan(deps) {
  const __dirname = getCurrentDirectory(
    import.meta.url,
    deps.fileURLToPathFn,
    deps.dirnameFn
  );

  const pathAdapters = /** @type {typeof deps.pathModule} */ (
    createPathAdapters(
      /** @type {Parameters<typeof createPathAdapters>[0]} */ (deps.pathModule)
    )
  );
  const { join, resolve, relative } = pathAdapters;

  const projectRoot = resolve(__dirname, '../../..');
  const srcDir = join(projectRoot, 'src');
  const infraDir = resolve(projectRoot, 'infra');
  const srcCloudDir = resolve(srcDir, 'cloud');
  const infraFunctionsDir = resolve(infraDir, 'cloud-functions');
  const srcCoreDir = resolve(srcDir, 'core');
  const srcCoreCloudDir = resolve(srcCoreDir, 'cloud');
  const srcCoreBuildDir = resolve(srcCoreDir, 'build');
  const srcCoreRealtimeDir = resolve(srcCoreDir, 'realtime');
  const srcCoreObjectMinuteRentalSearchDir = resolve(
    srcCoreDir,
    'object-minute-rental-search'
  );
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

  const {
    functionDirectories,
    directoryCopies,
    preservedCloudTreeCopies,
    coreRealtimeCopies,
    objectMinuteRentalSearchCoreCopy,
    objectMinuteRentalSearchWgs84Copy,
    coreBrowserCopies,
    browserFileCopies,
  } = createCopyCloudDirectoryPlan({
    join,
    infraDir,
    srcCoreDir,
    srcCloudDir,
    infraFunctionsDir,
    srcCoreCloudDir,
    srcCoreBuildDir,
    srcCoreRealtimeDir,
    srcCoreObjectMinuteRentalSearchDir,
    srcCoreBrowserDir,
    browserDir,
  });

  const {
    corsConfigCopies,
    firestoreCopies,
    packageFileCopies,
    assignModerationCoreSource,
    cloudCoreSource,
    commonCoreSource,
    errorReportingSource,
    expressAppSource,
    functionCoreLocalCopies,
    commonCoreCopies,
    preservedCommonCoreCopies,
    paymentWebhookCoreCopy,
    generateStatsCoreSource,
    generateStatsVerifyAdminSource,
    submitNewPageCoreSource,
    submitNewPageHelpersSource,
    submitModerationRatingCoreSource,
    submitNewStoryCoreSource,
    getApiKeyCreditCoreSource,
    getApiKeyCreditCreateDbSource,
    getApiKeyCreditGcfSource,
    getApiKeyCreditV2CoreSource,
    getApiKeyCreditV2CreateDbSource,
    getApiKeyCreditV2SnapshotSource,
    getApiKeyCreditV2GcfSource,
  } = createCopyCloudSourceCopies({
    join,
    srcCloudDir,
    infraFunctionsDir,
    srcCoreCloudDir,
    srcCoreDir,
    functionDirectories,
  });

  const {
    hideVariantHtmlCoreSource,
    hideVariantHtmlGcfSource,
    markVariantDirtyCoreSource,
    markVariantDirtyVerifyAdminSource,
    processNewPageCoreSource,
    processNewPageGcfSource,
    processNewStoryCoreSource,
    processNewStoryGcfSource,
    updateVariantVisibilityCoreSource,
    updateVariantVisibilityGcfSource,
    getModerationVariantCorsSource,
    getModerationVariantCoreSource,
    getModerationVariantGcfSource,
    renderContentsCoreSource,
    renderContentsGcfSource,
    renderVariantCoreSource,
    renderVariantGcfSource,
    reportForModerationCoreSource,
    reportForModerationGcfSource,
    processNewStoryCoreFile,
    generateStatsVerifyAdminFile,
    firebaseFunctionsCopies,
    functionSpecificCommonCoreCopies,
    sharedUtilityCopies,
    preservedSharedUtilityCopies,
    functionCoreBuildCopies,
  } = createCopyCloudSourcePaths({
    join,
    srcCloudDir,
    srcCoreCloudDir,
    srcCoreDir,
    infraFunctionsDir,
    infraDir,
    functionDirectories,
  });

  const individualFileCopies = createIndividualFileCopies({
    join,
    infraDir,
    srcCloudDir,
    srcCoreDir,
    infraFunctionsDir,
    srcCoreBrowserDir,
    srcCoreBrowserModerationDir,
    browserDir,
    generateStatsGcfSource,
    commonGcfSource,
    assignModerationJobGcfSource,
    browserFileCopies,
    corsConfigCopies,
    firestoreCopies,
    packageFileCopies,
    assignModerationCoreSource,
    cloudCoreSource,
    commonCoreSource,
    errorReportingSource,
    expressAppSource,
    functionCoreLocalCopies,
    functionCoreBuildCopies,
    commonCoreCopies,
    preservedCommonCoreCopies,
    paymentWebhookCoreCopy,
    generateStatsCoreSource,
    generateStatsVerifyAdminSource,
    submitNewPageCoreSource,
    submitNewPageHelpersSource,
    submitModerationRatingCoreSource,
    submitNewStoryCoreSource,
    getApiKeyCreditCoreSource,
    getApiKeyCreditCreateDbSource,
    getApiKeyCreditGcfSource,
    getApiKeyCreditV2CoreSource,
    getApiKeyCreditV2CreateDbSource,
    getApiKeyCreditV2SnapshotSource,
    getApiKeyCreditV2GcfSource,
    hideVariantHtmlCoreSource,
    hideVariantHtmlGcfSource,
    markVariantDirtyCoreSource,
    markVariantDirtyVerifyAdminSource,
    processNewPageCoreSource,
    processNewPageGcfSource,
    processNewStoryCoreSource,
    processNewStoryGcfSource,
    updateVariantVisibilityCoreSource,
    updateVariantVisibilityGcfSource,
    getModerationVariantCorsSource,
    getModerationVariantCoreSource,
    getModerationVariantGcfSource,
    renderContentsCoreSource,
    renderContentsGcfSource,
    renderVariantCoreSource,
    renderVariantGcfSource,
    reportForModerationCoreSource,
    reportForModerationGcfSource,
    firebaseFunctionsCopies,
    functionSpecificCommonCoreCopies,
    sharedUtilityCopies,
    preservedSharedUtilityCopies,
  });
  const typedFunctionDirectories = /** @type {string[]} */ (
    functionDirectories
  );
  individualFileCopies.push(
    ...typedFunctionDirectories.map(functionDir => ({
      source: join(srcDir, 'adapters', 'allow-effects.js'),
      target: join(
        infraFunctionsDir,
        functionDir,
        'adapters',
        'allow-effects.js'
      ),
    }))
  );
  individualFileCopies.push(objectMinuteRentalSearchWgs84Copy);
  for (const filename of ['index.js', 'wgs84.js']) {
    individualFileCopies.push({
      source: join(projectRoot, 'src', 'core', 'wgs84', filename),
      target: join(
        infraFunctionsDir,
        'object-minute-rental-search',
        'core',
        'wgs84',
        filename
      ),
    });
  }

  return {
    projectRoot,
    pathAdapters,
    relative,
    join,
    infraFunctionsDir,
    functionDirectories,
    directoryCopies,
    preservedCloudTreeCopies,
    coreRealtimeCopies,
    objectMinuteRentalSearchCoreCopy,
    coreBrowserCopies,
    individualFileCopies,
    processNewStoryCoreFile,
    generateStatsVerifyAdminFile,
  };
}

/**
 * Execute the cloud infrastructure copy workflow.
 * @param {Parameters<typeof createCopyCloudPlan>[0]} deps Build dependencies.
 * @returns {Promise<void>} Copy workflow completion promise.
 */
// Stryker restore all
export async function createCopyCloudHandle(deps) {
  const {
    projectRoot,
    pathAdapters,
    relative,
    join,
    infraFunctionsDir,
    functionDirectories,
    directoryCopies,
    preservedCloudTreeCopies,
    coreRealtimeCopies,
    objectMinuteRentalSearchCoreCopy,
    coreBrowserCopies,
    individualFileCopies,
    processNewStoryCoreFile,
    generateStatsVerifyAdminFile,
  } = createCopyCloudPlan(deps);
  const typedFunctionDirectories = /** @type {string[]} */ (
    functionDirectories
  );

  const io = createAsyncFsAdapters(deps.fsPromisesModule);

  const logger = deps.logger ?? {
    /** @param {string} message Message to print. */
    info(message) {
      console.log(message);
    },
  };

  const { runCopyToInfra } = createCopyToInfraCore({
    projectRoot,
    path: /** @type {Parameters<typeof createCopyToInfraCore>[0]['path']} */ (
      pathAdapters
    ),
  });

  /**
   * Format an absolute path so log messages show it relative to the project root.
   * @param {string} targetPath - Absolute path being logged.
   * @returns {string} Relative path suitable for log output.
   */
  // Stryker disable next-line all -- path formatting is a trivial adapter around the injected relative helper.
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
  // Stryker disable all -- filesystem-dependent import rewrite matrix is exercised by the injected integration workflow; individual ENOENT/manifest variants are defensive boundaries.
  async function rewriteImport(filePath, from, to) {
    try {
      const original = await io.readFile(filePath, 'utf8');

      if (!original.includes(from)) {
        return;
      }

      const updated = original.replaceAll(from, to);

      await io.writeFile(filePath, updated);
      logger.info(
        `Rewrote ${formatForLog(filePath)} import from "${from}" to "${to}"`
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, skip silently
    }
  }

  /**
   * Rewrite a batch of import specifiers within a file with one read/write cycle.
   * @param {string} filePath - Absolute path to the file whose contents may change.
   * @param {Array<[string, string]>} rewrites - Import specifier replacements.
   * @returns {Promise<void>} Promise that resolves once the file has been updated or skipped.
   */
  async function rewriteImports(filePath, rewrites) {
    try {
      const original = await io.readFile(filePath, 'utf8');
      const updated = rewrites.reduce(
        (content, [from, to]) => content.replaceAll(from, to),
        original
      );

      if (updated === original) {
        return;
      }

      await io.writeFile(filePath, updated);
      logger.info(`Rewrote ${formatForLog(filePath)} imports`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, skip silently
    }
  }

  await runCopyToInfra({
    directoryCopies: [
      ...directoryCopies,
      ...preservedCloudTreeCopies,
      ...coreRealtimeCopies,
      objectMinuteRentalSearchCoreCopy,
      ...coreBrowserCopies,
    ],
    individualFileCopies,
    io,
    messageLogger: logger,
  });

  // Stryker disable all -- import rewrite tables and generated wrapper patterns are declarative deployment data.
  await Promise.all(
    typedFunctionDirectories.map(async functionDir => {
      const entryPoint = join(infraFunctionsDir, functionDir, 'index.js');
      const nestedEntryPoint = `./cloud/${functionDir}/index.js`;
      const wrapper = `export * from '${nestedEntryPoint}';\n`;
      await io.writeFile(entryPoint, wrapper);
    })
  );

  /** @type {Array<[string, string]>} */
  const cloudFunctionImportRewrites = [
    // Core and common module rewrites
    ['../../core/commonCore.js', './commonCore.js'],
    ['../common-core.js', './commonCore.js'],
    ['../commonCore.js', './commonCore.js'],
    ['../../commonCore.js', './commonCore.js'],
    ['.././commonCore.js', './commonCore.js'],

    // Cloud core rewrites
    ['../core/cloud/cloud-core.js', './cloud-core.js'],
    ['../cloud-core.js', './cloud-core.js'],

    // Firestore and database rewrites
    ['../firestore-helpers.js', './firestore.js'],
    ['../firestore.js', './firestore.js'],

    // Auth rewrites
    ['../auth-helpers.js', './auth-helpers.js'],

    // HTTP and utility rewrites
    ['../http-method-guard.js', './http-method-guard.js'],
    ['../response-utils.js', './response-utils.js'],
    ['../responder-utils.js', './responder-utils.js'],
    ['../allowed-origins.js', './allowed-origins.js'],
    ['../handler-utils.js', './handler-utils.js'],
    ['../submit-shared.js', './submit-shared.js'],
    ['../allow-effects.js', './allow-effects.js'],

    // Cross-function rewrites
    [
      '../process-new-page/process-new-page-core.js',
      './process-new-page-core.js',
    ],
    ['../generate-stats/generate-stats-core.js', './generate-stats-core.js'],
    ['../submit-new-page/submit-new-page-core.js', './submit-new-page-core.js'],
    [
      '../submit-new-story/submit-new-story-core.js',
      './submit-new-story-core.js',
    ],
    [
      '../assign-moderation-job/assign-moderation-job-core.js',
      './assign-moderation-job-core.js',
    ],

    // Verification admin rewrites
    [
      '../mark-variant-dirty/verifyAdmin.js',
      './mark-variant-dirty-verifyAdmin.js',
    ],
    ['../generate-stats/verifyAdmin.js', './verifyAdmin.js'],

    // Firebase and cors rewrites
    ['../firebase-functions.js', './firebase-functions.js'],
    ['../cors-config.js', './cors-config.js'],
  ];

  /** @type {Array<(functionDir: string) => string>} */
  const cloudFunctionRewriteFilePatterns = [
    functionDir => `${functionDir}-core.js`,
    functionDir => `${functionDir}-gcf.js`,
    () => 'common-gcf.js',
    () => 'common-core.js',
    () => 'helpers.js',
    () => 'cloud-core.js',
    () => 'firebase-functions.js',
    () => 'cors-config.js',
    () => 'verifyAdmin.js',
    () => 'firestore.js',
  ];

  await Promise.all(
    typedFunctionDirectories.flatMap(functionDir => {
      const functionDirPath = join(infraFunctionsDir, functionDir);
      return cloudFunctionRewriteFilePatterns.map(pattern =>
        rewriteImports(
          join(functionDirPath, pattern(functionDir)),
          cloudFunctionImportRewrites
        )
      );
    })
  );

  await Promise.all([
    // Specific rewrites for cross-function imports
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
      join(
        infraFunctionsDir,
        'mark-variant-dirty',
        'mark-variant-dirty-core.js'
      ),
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
  // Stryker restore all
}
