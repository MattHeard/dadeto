# OpenAI Chat Harness

## Local Run Instructions

1. Install repository dependencies with `npm install`.
2. Run the pure handler, adapter, and browser controller suites with:
   `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --no-watchman --runTestsByPath test/core/browser/openai-chat-core.test.js test/core/cloud/openai-chat/openai-chat-core.test.js test/core/cloud/openai-chat/openai-chat-adapters.test.js`.
3. Package Cloud Functions with `npm run build:cloud`; the output is generated under `infra/cloud-functions/openai-chat/`.

No local command in this harness contacts OpenAI. Unit tests inject the provider, billing, Firestore, auth, and effect-boundary dependencies.

## Expected Observable Outputs

- Terminal output should include:
  - `Test Suites: 3 passed`
  - `Copied: src/cloud/openai-chat/index.js -> infra/cloud-functions/openai-chat/index.js`
- Artifacts written to:
  - `infra/cloud-functions/openai-chat/` (generated and ignored by Git)
- Exit code:
  - `0`

## Troubleshooting Hooks

- Verbose mode command: rerun the focused Jest command without `--silent`.
- Log location: command output; do not capture credentials or request bodies.
- Cleanup command: generated packaging output is ignored and can be removed with `rm -rf infra/cloud-functions/openai-chat`.

## Operator Setup

Before any controlled smoke, provision `OPENAI_API_KEY` as a Cloud Function Secret Manager runtime secret, ensure the billing snapshot prices `openai-chat-gpt-6-luna-v1` at 2000 EUR micros, and enable both `billing_enabled` and `openai_chat_enabled` only in the reviewed target environment. Provide a dedicated funded test identity. A live provider request can spend credit and call OpenAI; the automated test suite must continue to use fakes.
