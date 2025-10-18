import { createCopyToInfraCore } from '../core/cloud/copy.js';
import { createAsyncFsAdapters } from '../node/fs.js';
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from '../node/path.js';

const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir } = resolveProjectDirectories(__dirname);

const pathAdapters = createPathAdapters();
const { join, resolve } = pathAdapters;

const infraDir = resolve(projectRoot, 'infra');
const srcCloudDir = resolve(srcDir, 'cloud');
const infraFunctionsDir = resolve(infraDir, 'cloud-functions');
const browserDir = resolve(srcDir, 'browser');
const srcCoreCloudDir = resolve(srcDir, 'core', 'cloud');
const srcCoreBrowserDir = resolve(srcDir, 'core', 'browser');

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

const sharedBrowserFiles = ['googleAuth.js', 'moderate.js', 'loadStaticConfig.js'];

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
  })),
);

const adminCoreSource = join(srcCoreBrowserDir, 'admin', 'core.js');

const assignModerationCoreSource = join(
  srcCoreCloudDir,
  'assign-moderation-job',
  'core.js',
);

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
    source: join(browserDir, 'load-static-config-core.js'),
    target: join(infraDir, 'load-static-config-core.js'),
  },
  {
    source: assignModerationCoreSource,
    target: join(
      infraDir,
      'core',
      'cloud',
      'assign-moderation-job',
      'core.js'
    ),
  },
  {
    source: assignModerationCoreSource,
    target: join(infraFunctionsDir, 'assign-moderation-job', 'core.js'),
  },
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
