import { renderOpenAIChatState } from '../../../src/core/browser/openai-chat-renderer-core.js';

test('renders an idle chat with its default status and enabled send control', () => {
  const renderedMessages = [];
  const messagesNode = {
    ownerDocument: {
      createElement(tag) {
        return { tag, dataset: {}, textContent: '' };
      },
    },
    replaceChildren(...messages) {
      renderedMessages.splice(0, renderedMessages.length, ...messages);
    },
  };
  const statusNode = { textContent: '', dataset: {} };
  const sendButton = { disabled: true };

  renderOpenAIChatState(
    {
      messages: [{ role: 'assistant', content: 'Ready.' }],
      pending: false,
      error: '',
    },
    messagesNode,
    statusNode,
    sendButton
  );

  expect(renderedMessages).toEqual([
    expect.objectContaining({
      tag: 'li',
      dataset: { role: 'assistant' },
      textContent: 'Ready.',
    }),
  ]);
  expect(statusNode.textContent).toBe(
    'Messages stay in this page until you leave.'
  );
  expect(statusNode.dataset.error).toBe('false');
  expect(sendButton.disabled).toBe(false);

  renderOpenAIChatState(
    {
      messages: [],
      pending: false,
      error: 'The message could not be sent.',
    },
    messagesNode,
    statusNode,
    sendButton
  );

  expect(statusNode.textContent).toBe('The message could not be sent.');
  expect(statusNode.dataset.error).toBe('true');
});
