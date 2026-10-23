# OpenAI Chat — Field Guide

The OpenAI Chat toy is available at [/openai-chat/](/openai-chat/) as a beta. The Cloud Function remains unavailable until an operator configures the billing price and Secret Manager key. No OpenAI request is made by the automated tests.

## What this toy does

When enabled and configured, it sends a short conversation through the authenticated DADETO chat function to the server-selected `gpt-6-luna` model. The provider key stays in the Cloud Function. The current server boundary accepts at most 12 messages and 4096 UTF-8 input bytes; it caps output at 256 tokens and charges the configured fixed 2000 EUR-micro operation price.

## Input

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["messages"],
  "properties": {
    "messages": {
      "type": "array",
      "minItems": 1,
      "maxItems": 12,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["role", "content"],
        "properties": {
          "role": { "enum": ["user", "assistant"] },
          "content": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

### Example

```json
{
  "messages": [{ "role": "user", "content": "Give me a concise riddle." }]
}
```

Send a Firebase ID token in `Authorization: Bearer …` and a unique `Idempotency-Key` header. Do not send a model name, provider URL, or output-token limit; the server controls those values.

## Output

### Example

```json
{
  "reply": "What has keys but cannot open locks? A piano."
}
```

Errors return a stable `error` code and an HTTP status. An uncertain provider result may require retrying the same request with the same idempotency key.

## Behavior

- Unauthenticated, invalid, oversized, rate-limited, or underfunded requests are rejected before the provider is called.
- Credits are reserved before a provider call and settled once for a successful response.
- Repeating the same idempotency key does not intentionally dispatch or debit a second operation.
- The feature remains unavailable while either the billing or chat feature flag is disabled.
- Tests use fake provider and billing dependencies; no live call or spend is implied by a passing test.
