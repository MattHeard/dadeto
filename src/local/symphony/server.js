import { createSymphonyApp } from './app.js';
import { bootstrapSymphony } from './bootstrap.js';
import { formatSymphonyListenErrorMessage } from '../serverMessages.js';

const port = Number.parseInt(process.env.SYMPHONY_PORT ?? '4322', 10);
const { status, statusStore } = await bootstrapSymphony();
const app = createSymphonyApp({
  initialStatus: status,
  statusStore,
});

const server = app.listen(port, () => {
  console.log(`symphony server listening on http://localhost:${port}/api/symphony/status`);
});

server.on('error', (error) => {
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    console.error(formatSymphonyListenErrorMessage(port));
    process.exitCode = 1;
    return;
  }

  throw error;
});
