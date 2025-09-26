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

const fileCopies = {
  sourceDir: srcCloudDir,
  targetDir: infraDir,
  files: ['googleAuth.js', 'moderate.js'],
};

const individualFileCopies = [
  {
    source: join(browserDir, 'admin.js'),
    target: join(infraDir, 'admin.js'),
  },
  {
    source: join(srcCoreCloudDir, 'assign-moderation-job', 'core.js'),
    target: join(infraFunctionsDir, 'assign-moderation-job', 'core.js'),
  },
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
  fileCopies,
  individualFileCopies,
  io,
  messageLogger: logger,
});
