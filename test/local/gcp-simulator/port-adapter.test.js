import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

const createServer = jest.fn();
await jest.unstable_mockModule('node:net', () => ({
  default: { createServer },
}));
const { reserveWriterPort } = await import(
  '../../../src/local/gcp-simulator/port-adapter.js'
);

/**
 * Stage the native listener callbacks without opening a socket.
 * @param {unknown} address Native-style address value.
 * @returns {object} Server and callback controls.
 */
function fixture(address) {
  const callbacks = {};
  const server = {
    on: jest.fn((name, listener) => {
      callbacks[name] = listener;
    }),
    listen: jest.fn((_port, _host, ready) => {
      callbacks.ready = ready;
    }),
    address: jest.fn(() => address),
    close: jest.fn(closed => {
      callbacks.closed = closed;
    }),
  };
  createServer.mockReturnValue(server);
  return { server, callbacks };
}

test('resolves only after closing the listener and retains the pre-close port', async () => {
  const f = fixture({ port: 4321 });
  const pending = reserveWriterPort(createAllowEffects());
  let settled = false;
  void pending.then(
    () => {
      settled = true;
    },
    () => {}
  );
  expect(f.server.listen.mock.calls).toEqual([
    [0, '127.0.0.1', expect.any(Function)],
  ]);
  f.callbacks.ready();
  expect(f.server.address).toHaveBeenCalledTimes(1);
  expect(f.server.close).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  expect(settled).toBe(false);
  f.server.address.mockReturnValue(null);
  f.callbacks.closed();
  await expect(pending).resolves.toBe(4321);
});

test.each([null, 'pipe-address'])(
  'rejects unsupported address %j after closing',
  async address => {
    const f = fixture(address);
    const pending = reserveWriterPort(createAllowEffects());
    const rejected = expect(pending).rejects.toThrow(
      'Unable to reserve a writer port'
    );
    f.callbacks.ready();
    f.callbacks.closed();
    await rejected;
    expect(f.server.close).toHaveBeenCalledTimes(1);
  }
);

test('propagates the native listener error without claiming a reserved port', async () => {
  const f = fixture({ port: 1 });
  const pending = reserveWriterPort(createAllowEffects());
  const failure = new Error('listen failed');
  const rejected = expect(pending).rejects.toBe(failure);
  f.callbacks.error(failure);
  await rejected;
  expect(f.server.address).not.toHaveBeenCalled();
  expect(f.server.close).not.toHaveBeenCalled();
});
