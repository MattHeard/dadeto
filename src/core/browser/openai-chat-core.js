/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** @typedef {{role: 'user'|'assistant', content: string}} OpenAIChatMessage */
/** @typedef {{messages: OpenAIChatMessage[], pending: boolean, error: string}} OpenAIChatState */
/** @typedef {{ok: boolean, status: number, json: () => Promise<unknown>}} ChatResponse */

/**
 * Create a browser chat controller that retries uncertain sends with the same
 * idempotency key and keeps conversation data in memory only.
 * @param {{getEndpoint: () => Promise<string>, getIdToken: () => string|null|Promise<string|null>, signIn: () => Promise<unknown>, createIdempotencyKey: () => string, bindEffectBoundary: (handler: (permission: AllowEffects) => Promise<ChatResponse>) => Promise<ChatResponse>, postMessage: (permission: AllowEffects, endpoint: string, token: string, idempotencyKey: string, messages: OpenAIChatMessage[]) => Promise<ChatResponse>, onStateChange?: (state: OpenAIChatState) => void}} deps Browser dependencies.
 * @returns {{getState: () => OpenAIChatState, send: (text: string) => Promise<'sent'|'failed'|'rejected'>}} Chat commands and state.
 */
export function createOpenAIChatController(deps) {
  /** @type {OpenAIChatState} */
  let state = { messages: [], pending: false, error: '' };
  /** @type {{content: string, idempotencyKey: string, messages: OpenAIChatMessage[]}|null} */
  let retryAttempt = null;

  /**
   * Publish a partial state update.
   * @param {Partial<OpenAIChatState>} next Updated state values.
   * @returns {void} Publishes a state change.
   */
  function publish(next) {
    state = { ...state, ...next };
    deps.onStateChange?.(getState());
  }

  /** @returns {OpenAIChatState} Current state snapshot. */
  function getState() {
    return {
      ...state,
      messages: state.messages.map(message => ({ ...message })),
    };
  }

  /**
   * Send a user message or retry its uncertain prior attempt.
   * @param {string} text User message.
   * @returns {Promise<'sent'|'failed'|'rejected'>} Send result.
   */
  async function send(text) {
    const content = typeof text === 'string' ? text.trim() : '';
    if (state.pending || !content) return 'rejected';
    if (retryAttempt && retryAttempt.content !== content) {
      publish({ error: 'Retry the previous message before sending another.' });
      return 'rejected';
    }

    const access = await resolveAccess(deps);
    if (!access.endpoint) {
      publish({ error: 'The chat service is not configured.' });
      return 'failed';
    }
    if (!access.token) {
      await deps.signIn();
      publish({ error: 'Sign in to send a message.' });
      return 'failed';
    }
    retryAttempt ??= {
      content,
      idempotencyKey: deps.createIdempotencyKey(),
      messages: [...state.messages.slice(-10), { role: 'user', content }],
    };
    publish({ pending: true, error: '' });
    return submitMessage(deps, access, retryAttempt, publish);
  }

  /**
   * Send one request through the injected permission boundary.
   * @param {typeof deps} dependencies Browser dependencies.
   * @param {{endpoint: string, token: string}} access Authenticated request config.
   * @param {NonNullable<typeof retryAttempt>} attempt Idempotent request.
   * @param {(next: Partial<OpenAIChatState>) => void} update State publisher.
   * @returns {Promise<'sent'|'failed'>} Outcome.
   */
  async function submitMessage(dependencies, access, attempt, update) {
    try {
      const response = await dependencies.bindEffectBoundary(permission =>
        dependencies.postMessage(
          permission,
          access.endpoint,
          access.token,
          attempt.idempotencyKey,
          attempt.messages
        )
      );
      const body = await response.json();
      if (!response.ok) return handleChatError(body, response.status, update);
      const reply = readReply(body);
      if (!reply) {
        update({
          pending: false,
          error: 'The chat response was incomplete. Retry it.',
        });
        return 'failed';
      }
      retryAttempt = null;
      update({
        messages: [...attempt.messages, { role: 'assistant', content: reply }],
        pending: false,
        error: '',
      });
      return 'sent';
    } catch {
      update({
        pending: false,
        error: 'The reply could not be confirmed. Retry the same message.',
      });
      return 'failed';
    }
  }

  /**
   * Resolve the current endpoint and signed-in identity.
   * @param {typeof deps} dependencies Browser dependencies.
   * @returns {Promise<{endpoint: string, token: string, error: string}>} Endpoint and current identity token.
   */
  async function resolveAccess(dependencies) {
    try {
      const [endpoint, token] = await Promise.all([
        dependencies.getEndpoint(),
        dependencies.getIdToken(),
      ]);
      return {
        endpoint: typeof endpoint === 'string' ? endpoint : '',
        token: typeof token === 'string' && token ? token : '',
        error: !endpoint
          ? 'The chat service is not configured.'
          : 'Sign in to send a message.',
      };
    } catch {
      return {
        endpoint: '',
        token: '',
        error: 'The chat service is unavailable.',
      };
    }
  }

  /**
   * Preserve uncertain requests for a same-key retry.
   * @param {unknown} body Error body.
   * @param {number} status HTTP status.
   * @param {(next: Partial<OpenAIChatState>) => void} update State publisher.
   * @returns {'failed'} Error result.
   */
  function handleChatError(body, status, update) {
    const errorCode =
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'chat_unavailable';
    if (isDefiniteFailure(status, errorCode)) retryAttempt = null;
    update({ pending: false, error: describeChatError(errorCode) });
    return 'failed';
  }

  return { getState, send };
}

/**
 * Read the bounded assistant text from an API response.
 * @param {unknown} body Response body.
 * @returns {string|null} Assistant reply.
 */
function readReply(body) {
  return isRecord(body) && typeof body.reply === 'string' && body.reply.trim()
    ? body.reply.trim()
    : null;
}

/**
 * Check whether a value is a non-array object record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} Whether value is a record.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Identify failures known to have no provider side effect.
 * @param {number} status HTTP status.
 * @param {string} error Error code.
 * @returns {boolean} Whether retry can safely use a new key.
 */
function isDefiniteFailure(status, error) {
  return (
    [400, 401, 403, 413, 429].includes(status) ||
    (status === 409 &&
      ['insufficient_credit', 'idempotency_key_conflict'].includes(error)) ||
    (status === 503 &&
      [
        'chat_unavailable',
        'pricing_unavailable',
        'billing_identity_unavailable',
        'rate_limit_unavailable',
      ].includes(error))
  );
}

/**
 * Map a stable server error code to a user-facing message.
 * @param {string} error Stable server error code.
 * @returns {string} User-facing explanation.
 */
function describeChatError(error) {
  if (error === 'insufficient_credit')
    return 'There are not enough credits for this message.';
  if (error === 'rate_limited')
    return 'You have reached the short-term message limit. Try again shortly.';
  if (error === 'operation_pending')
    return 'The previous reply is still being confirmed. Retry this message later.';
  if (error === 'unauthorized') return 'Sign in again to send a message.';
  if (error === 'chat_unavailable') return 'Chat is temporarily unavailable.';
  return 'The reply could not be confirmed. Retry the same message.';
}
