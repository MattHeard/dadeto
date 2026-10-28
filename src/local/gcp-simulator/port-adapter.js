import net from 'node:net';

/**
 * Reserve a native loopback port and close its temporary listener before use.
 * @param {import('../../../types/allow-effects').AllowEffects} permission Invocation permission.
 * @returns {Promise<number>} Reserved port.
 */
export function reserveWriterPort(permission) {
  void permission;
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address !== 'object') {
          reject(new Error('Unable to reserve a writer port'));
          return;
        }
        resolve(address.port);
      });
    });
  });
}
