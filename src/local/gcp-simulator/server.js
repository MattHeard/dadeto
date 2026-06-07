import { fileURLToPath } from 'node:url';
import { handle } from '../../core/local/gcp-simulator/server.js';

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void handle();
}
