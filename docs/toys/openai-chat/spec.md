# OpenAI Chat Proxy

## Summary

- Toy name: OpenAI Chat Proxy
- Owner: DADETO
- Last updated: 2026-10-23

## Problem Statement

Provide a small authenticated chat experience that can call one server-selected OpenAI model through DADETO's existing billing protocol. The browser never receives the provider credential or selects the model.

## Boundary

The browser sends a bounded conversation to a Firebase-authenticated Cloud Function. The function normalizes input, applies a per-user limit, confirms a credit reservation, calls an injected model client, and settles the charge idempotently. Firestore and HTTP adapters own their effects outside the pure request handler.

## Scope

- In scope: fixed-model text chat, bounded messages and output, Firebase authentication, billing reservation and settlement, duplicate-request protection, per-user rate limiting, a static browser surface, mocked provider tests, and operator setup documentation.
- Out of scope: streaming, persistent conversation history, arbitrary tools or URLs, user-selected models, image/audio input, and claims based on a live provider call unless a controlled smoke is approved and completed.

## Actors and Interfaces

- Primary actors: a signed-in DADETO user and the DADETO chat function.
- Inputs: at most 12 user/assistant messages, at most 4096 UTF-8 input bytes total, and a required idempotency key.
- Outputs: one assistant reply bounded to 256 model output tokens and 8192 UTF-8 bytes, or a stable error response.

## Assumptions and Constraints

- Billing and `openai_chat_enabled` must both be enabled; the latter defaults to false.
- `OPENAI_API_KEY` is supplied only to the Cloud Function from Secret Manager.
- The active pricing snapshot must define `openai-chat-gpt-6-luna-v1` at exactly 2000 EUR micros per request.
- A successful request may reserve and settle credits. Tests use injected provider and billing fakes; they make no paid API calls.
- An uncertain provider outcome retains its idempotency key and is not automatically retried with a new key.

## Dependencies

- Internal dependencies: Firebase ID-token verification, DADETO billing runtime, AllowEffects, Firestore, static config, and the existing site build.
- External dependencies: OpenAI Responses API and a Secret Manager secret version configured by an operator before enabling the function.
