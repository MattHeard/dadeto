import { createOpenAIChatController } from '../core/browser/openai-chat-core.js';
import { renderOpenAIChatState } from '../core/browser/openai-chat-renderer-core.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';
import { getIdToken, initGoogleSignIn } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';

const effectFetch = createEffectFetchFn(globalThis.fetch.bind(globalThis));

export function startOpenAIChatPage({ documentObj, windowObj }) {
  const form = documentObj.querySelector('#chat-form');
  const input = documentObj.querySelector('#message-input');
  const sendButton = documentObj.querySelector('#send-button');
  const messages = documentObj.querySelector('#messages');
  const status = documentObj.querySelector('#chat-status');
  if (!form || !input || !sendButton || !messages || !status) return () => {};

  const controller = createOpenAIChatController({
    getEndpoint: () =>
      loadStaticConfig().then(config => config.openaiChatUrl || ''),
    getIdToken,
    signIn: () => initGoogleSignIn({}),
    createIdempotencyKey: () => windowObj.crypto.randomUUID(),
    bindEffectBoundary,
    postMessage: (permission, endpoint, token, idempotencyKey, history) =>
      effectFetch(permission, endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ messages: history }),
      }),
    onStateChange: state =>
      renderOpenAIChatState(state, messages, status, sendButton),
  });

  const submit = async event => {
    event.preventDefault();
    const result = await controller.send(input.value);
    if (result === 'sent') input.value = '';
  };
  form.addEventListener('submit', submit);
  initGoogleSignIn({});
  return () => form.removeEventListener('submit', submit);
}
