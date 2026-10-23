/** @typedef {{messages: Array<{role: string, content: string}>, pending: boolean, error: string}} ChatState */

/**
 * Render an in-memory chat state into the page's message and status controls.
 * @param {ChatState} state Current controller state.
 * @param {any} messagesNode Message list element.
 * @param {any} statusNode Status element.
 * @param {any} sendButton Submit button.
 * @returns {void} Updates visible chat state.
 */
export function renderOpenAIChatState(
  state,
  messagesNode,
  statusNode,
  sendButton
) {
  messagesNode.replaceChildren(
    ...state.messages.map(message => {
      const item = messagesNode.ownerDocument.createElement('li');
      item.dataset.role = message.role;
      item.textContent = message.content;
      return item;
    })
  );
  statusNode.textContent = state.pending
    ? 'Waiting for the reply…'
    : state.error || 'Messages stay in this page until you leave.';
  statusNode.dataset.error = state.error ? 'true' : 'false';
  sendButton.disabled = state.pending;
}
