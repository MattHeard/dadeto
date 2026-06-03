import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';
import { exchangeRealtimeCallSdp } from './openaiRealtimeCalls.js';
import { formatListenErrorMessage } from './serverMessages.js';
import { getWriterUrl, isWriterRequestLogEnabled } from '../core/local/server.js';
import { getNonCoreThinStatus } from './non-core-thin/status.js';
import { renderNonCoreThinDashboard } from './non-core-thin/dashboard.js';
import { createLocalApp } from './createLocalApp.js';
import { createWriterServer } from './createWriterServer.js';
import { createLocalServerRuntime } from '../core/local/run.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const writerDir = path.join(publicDir, 'writer');
const port = Number.parseInt(process.env.WRITER_PORT ?? '4321', 10);
const store = createDocumentStore({
  workflowPath: process.env.WRITER_WORKFLOW_PATH,
  legacyDocumentPath: process.env.WRITER_LEGACY_DOCUMENT_PATH,
});

const handle = createLocalServerRuntime({
  createLocalApp,
  createWriterServer,
  formatListenErrorMessage,
  getWriterUrl,
  isWriterRequestLogEnabled,
}).runLocalServer;

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  handle({ env: process.env, port, store, publicDir, writerDir, exchangeRealtimeCallSdp, getNonCoreThinStatus, renderNonCoreThinDashboard });
}
