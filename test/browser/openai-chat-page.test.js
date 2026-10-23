import { describe, expect, it, jest } from '@jest/globals';

const allowEffects = Object.freeze({ allow: true });
const initGoogleSignIn = jest.fn();
const getIdToken = jest.fn().mockResolvedValue('firebase-id-token');
const loadStaticConfig = jest
  .fn()
  .mockResolvedValue({ openaiChatUrl: 'https://chat.example/handler' });
const effectFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ reply: 'A concise answer.' }),
});

jest.unstable_mockModule('../../src/browser/allow-effects.js', () => ({
  bindEffectBoundary: handler => handler(allowEffects),
  createEffectFetchFn: () => effectFetch,
}));
jest.unstable_mockModule('../../src/browser/googleAuth.js', () => ({
  getIdToken,
  initGoogleSignIn,
}));
jest.unstable_mockModule('../../src/browser/loadStaticConfig.js', () => ({
  loadStaticConfig,
}));

const { startOpenAIChatPage } = await import('../../src/browser/openaiChat.js');

/**
 * Build the minimum DOM surface used by the chat page.
 * @returns {{documentObj: object, nodes: Record<string, any>, listeners: Map<string, Function>}} Fake page elements and listener registry.
 */
function createPageDocument() {
  const listeners = new Map();
  const form = {
    addEventListener: jest.fn((type, handler) => listeners.set(type, handler)),
    removeEventListener: jest.fn(type => listeners.delete(type)),
  };
  const input = { value: '  hello  ' };
  const sendButton = { disabled: false };
  const messages = {
    ownerDocument: { createElement: () => ({ dataset: {}, textContent: '' }) },
    replaceChildren: jest.fn(),
  };
  const status = { textContent: '', dataset: {} };
  const nodes = {
    '#chat-form': form,
    '#message-input': input,
    '#send-button': sendButton,
    '#messages': messages,
    '#chat-status': status,
  };
  return {
    documentObj: { querySelector: selector => nodes[selector] ?? null },
    nodes,
    listeners,
  };
}

describe('startOpenAIChatPage', () => {
  it('sends through the permission-aware DADETO endpoint and renders the reply', async () => {
    const { documentObj, nodes, listeners } = createPageDocument();
    const dispose = startOpenAIChatPage({
      documentObj,
      windowObj: { crypto: { randomUUID: () => 'request-key' } },
    });
    const preventDefault = jest.fn();

    await listeners.get('submit')({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(initGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(effectFetch).toHaveBeenCalledWith(
      allowEffects,
      'https://chat.example/handler',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer firebase-id-token',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'request-key',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hello' }],
        }),
      })
    );
    expect(nodes['#messages'].replaceChildren).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dataset: { role: 'user' },
        textContent: 'hello',
      }),
      expect.objectContaining({
        dataset: { role: 'assistant' },
        textContent: 'A concise answer.',
      })
    );
    expect(nodes['#message-input'].value).toBe('');
    dispose();
    expect(nodes['#chat-form'].removeEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function)
    );
  });
});
