import { createOpenAIChatController } from '../../openai-chat-core.js';

/** @typedef {import('../../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ok: boolean, status: number, json: () => Promise<unknown>}} ProviderResponse */
/** @typedef {{getConfig: () => Promise<{openaiChatEnabled?: boolean, openaiChatUrl?: string}>, createIdempotencyKey: () => string}} MudChatDependencies */
/** @typedef {{getToken: () => string|null|Promise<string|null>, signIn: () => Promise<unknown>}} MudIdentityDependencies */
/** @typedef {{run: (permission: AllowEffects, endpoint: string, options: object) => Promise<ProviderResponse>, bind: (handler: (permission: AllowEffects) => Promise<ProviderResponse>) => Promise<ProviderResponse>}} MudEffectDependencies */
/** @typedef {{chat: MudChatDependencies, identity: MudIdentityDependencies, effects: MudEffectDependencies}} DynamicMudOpenAIProviderDependencies */
const MAX_PROMPT_BYTES = 3800;

/**
 * Build provider functions that use the existing DADETO chat endpoint. The
 * server supplied config flag keeps all model requests disabled by default.
 * @param {DynamicMudOpenAIProviderDependencies} deps Injected browser services grouped by responsibility.
 * @returns {{proposeCommand: (input: {command: string, world: object}) => Promise<{intent: string, predictedWorld: unknown}>, buildProgram: (input: {command: string, intent: string, world: object}) => Promise<unknown>}} Safe injected providers.
 */
export function createDynamicMudOpenAIProviders(deps) {
  const { chat, identity, effects } = deps;
  /** @type {Map<string, ReturnType<typeof createOpenAIChatController>>} */
  const retryControllers = new Map();

  /**
   * Ask the fixed-model chat proxy for one JSON-only response.
   * @param {string} prompt Bounded task-specific prompt.
   * @returns {Promise<unknown>} Parsed model response.
   */
  async function requestJson(prompt) {
    if (new TextEncoder().encode(prompt).length > MAX_PROMPT_BYTES)
      throw new Error('The command context exceeds the chat request limit.');

    let controller = retryControllers.get(prompt);
    if (!controller) {
      controller = createOpenAIChatController({
        getEndpoint: async () => {
          const config = await chat.getConfig();
          return config.openaiChatEnabled === true
            ? config.openaiChatUrl || ''
            : '';
        },
        getIdToken: identity.getToken,
        signIn: identity.signIn,
        createIdempotencyKey: chat.createIdempotencyKey,
        bindEffectBoundary: effects.bind,
        postMessage: (...request) => {
          const [permission, endpoint, token, idempotencyKey, messages] =
            request;
          return effects.run(permission, endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({ messages }),
          });
        },
      });
      retryControllers.set(prompt, controller);
    }

    if ((await controller.send(prompt)) !== 'sent')
      throw new Error('The billed chat request did not complete.');
    const reply = controller.getState().messages.at(-1)?.content;
    retryControllers.delete(prompt);
    return JSON.parse(/** @type {string} */ (reply));
  }

  return {
    proposeCommand: async ({ command, world }) => {
      const proposal = await requestJson(
        `Return only one JSON object with exactly "intent" and "predictedWorld". ` +
          `The intent must be a concise description. predictedWorld must be the complete resulting graph after the command. ` +
          `Do not include markdown or executable code. Command and current world: ${JSON.stringify({ command, world })}`
      );
      if (
        !isRecord(proposal) ||
        typeof proposal.intent !== 'string' ||
        !Object.hasOwn(proposal, 'predictedWorld')
      )
        throw new Error('The billed chat proposal had an invalid shape.');
      return {
        intent: proposal.intent,
        predictedWorld: proposal.predictedWorld,
      };
    },
    buildProgram: ({ command, intent, world }) =>
      requestJson(
        `Return only a version 1 JSON program for the requested change. ` +
          `Use {"version":1,"operations":[...]} and only these operation kinds: getNode, findNodes, createNode, setProperty, addRelation, removeRelation, deleteNode, output, broadcast. ` +
          `Operations execute in order. Do not include markdown, executable code, or unknown fields. ` +
          `Command, intent, and current world: ${JSON.stringify({ command, intent, world })}`
      ),
  };
}

/**
 * Check that a parsed JSON value is a non-array object.
 * @param {unknown} value Parsed model response.
 * @returns {value is Record<string, unknown>} Whether the value is an object record.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
