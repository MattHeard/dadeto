import { readFile } from 'node:fs/promises';
import { describe, expect, it } from '@jest/globals';

describe('OpenAI chat deployment configuration', () => {
  it('keeps the chat feature disabled by default and coupled to billing', async () => {
    const [variables, terraform] = await Promise.all([
      readFile('infra/variables.tf', 'utf8'),
      readFile('infra/functions-openai-chat.tf', 'utf8'),
    ]);
    expect(variables).toMatch(
      /variable "openai_chat_enabled"\s*\{[^}]*default\s*=\s*false/s
    );
    expect(terraform).toContain(
      'OPENAI_CHAT_ENABLED = tostring(var.openai_chat_enabled && var.billing_enabled)'
    );
    expect(terraform).toContain('key        = "OPENAI_API_KEY"');
    expect(terraform).toContain(
      'secret     = local.runtime_secret_names.openai_api_key'
    );
    expect(terraform).toContain(
      'for_each = var.environment == "prod" ? [1] : []'
    );
  });

  it('publishes the configured function URL and expires idempotency records', async () => {
    const [main, template, terraform] = await Promise.all([
      readFile('infra/main.tf', 'utf8'),
      readFile('infra/config.json.tftpl', 'utf8'),
      readFile('infra/functions-openai-chat.tf', 'utf8'),
    ]);
    expect(main).toMatch(
      /openai_chat_url\s*=\s*google_cloudfunctions2_function\.openai_chat\.service_config\[0\]\.uri/
    );
    expect(template).toContain(
      '"openaiChatUrl": ${jsonencode(openai_chat_url)}'
    );
    expect(terraform).toContain('collection = "openai-chat-results"');
    expect(terraform).toContain('field      = "expiresAt"');
    expect(terraform).toContain('ttl_config {}');
  });
});
