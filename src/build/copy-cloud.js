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
const { join, resolve } = pathAdapters;

const infraDir = resolve(projectRoot, 'infra');
const srcCloudDir = resolve(srcDir, 'cloud');
const infraFunctionsDir = resolve(infraDir, 'cloud-functions');
const srcCoreDir = resolve(srcDir, 'core');
const srcCoreCloudDir = resolve(srcCoreDir, 'cloud');
const srcCoreBrowserDir = resolve(srcCoreDir, 'browser');
const srcCoreBrowserModerationDir = resolve(srcCoreBrowserDir, 'moderation');
const srcCoreAuthDir = resolve(srcCoreDir, 'auth');
const browserDir = resolve(srcDir, 'browser');
const sharedGcfSource = join(srcCloudDir, 'gcf.js');

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
  'prod-update-variant-visibility',
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

const firebaseAppCopies = functionDirectories.map(name => ({
  source: join(srcCloudDir, 'firebaseApp.js'),
  target: join(infraFunctionsDir, name, 'firebaseApp.js'),
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

const adminCoreSource = join(srcCoreBrowserDir, 'admin', 'core.js');
const adminConfigSource = join(srcCoreDir, 'admin-config.js');

const assignModerationCoreSource = join(
  srcCoreCloudDir,
  'assign-moderation-job',
  'assign-moderation-job-core.js'
);

const cloudCoreSource = join(srcCoreCloudDir, 'cloud-core.js');

const generateStatsCoreSource = join(
  srcCoreCloudDir,
  'generate-stats',
  'generate-stats-core.js'
);

const submitNewPageCoreSource = join(
  srcCoreCloudDir,
  'submit-new-page',
  'core.js'
);

const reportForModerationHandlerSource = join(
  srcCoreCloudDir,
  'report-for-moderation',
  'handler.js'
);

const getApiKeyCreditCoreSource = join(
  srcCoreCloudDir,
  'get-api-key-credit',
  'core.js'
);

const getApiKeyCreditV2CoreSource = join(
  srcCoreCloudDir,
  'get-api-key-credit-v2',
  'core.js'
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

const hideVariantHtmlCoreSource = join(
  srcCoreCloudDir,
  'hide-variant-html',
  'core.js'
);

const markVariantDirtyVerifyAdminSource = join(
  srcCoreCloudDir,
  'mark-variant-dirty',
  'verifyAdmin.js'
);
const getModerationVariantCorsSource = join(
  srcCoreCloudDir,
  'get-moderation-variant',
  'cors.js'
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
    source: adminConfigSource,
    target: join(infraDir, 'core', 'admin-config.js'),
  },
  {
    source: join(srcCoreAuthDir, 'googleSignOut.js'),
    target: join(infraDir, 'core', 'auth', 'googleSignOut.js'),
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
    source: sharedGcfSource,
    target: join(infraFunctionsDir, 'assign-moderation-job', 'gcf.js'),
  },
  {
    source: sharedGcfSource,
    target: join(infraFunctionsDir, 'generate-stats', 'gcf.js'),
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
    source: generateStatsCoreSource,
    target: join(
      infraFunctionsDir,
      'generate-stats',
      'generate-stats-core.js'
    ),
  },
  {
    source: cloudCoreSource,
    target: join(infraFunctionsDir, 'generate-stats', 'cloud-core.js'),
  },
  {
    source: submitNewPageCoreSource,
    target: join(infraFunctionsDir, 'submit-new-page', 'core.js'),
  },
  {
    source: reportForModerationHandlerSource,
    target: join(infraFunctionsDir, 'report-for-moderation', 'handler.js'),
  },
  {
    source: getApiKeyCreditCoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit', 'core.js'),
  },
  {
    source: getApiKeyCreditV2CoreSource,
    target: join(infraFunctionsDir, 'get-api-key-credit-v2', 'core.js'),
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
    target: join(infraFunctionsDir, 'hide-variant-html', 'core.js'),
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
    source: getModerationVariantCorsSource,
    target: join(infraFunctionsDir, 'get-moderation-variant', 'cors.js'),
  },
  ...adminConfigFunctionCopies,
  ...browserFileCopies,
  ...firebaseAppCopies,
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

await runCopyToInfra({
  directoryCopies,
  individualFileCopies,
  io,
  messageLogger: logger,
});
