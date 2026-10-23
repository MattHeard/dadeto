# MUD1 — Dynamic MUD: Safe Command Core

Play the first scene at [/dynamic-mud/](/dynamic-mud/). The Rain Causeway understands `look`, `ring the bell`, and `open the floodgate`. Ring the bell to get the ferry's answer, then open the gate. When the authenticated, credit-billed chat feature is enabled, an unfamiliar command is proposed and built as a finite DSL program, then dry-run and validated before it can affect the world. The page warns that unfamiliar commands may use account credits. The browser and test environments keep model actions disabled unless both billing and chat are explicitly enabled.

## What this toy does

This prototype includes a small playable scene over a bounded graph-command language and pure transaction interpreter. Known actions always run locally without a model. Unknown commands use the existing DADETO chat proxy only when the public configuration reports that billing and chat are both enabled; the proxy authenticates the user and charges the configured operation price before contacting OpenAI. There is no persistence or multiplayer network.

## Input

Pass a version 1 program and a graph world to `executeMudProgram(world, program)`. Commands run in array order against a private snapshot. Supported commands inspect or change nodes and relations, or produce output/broadcast intents. A missing reference or invalid command rejects the whole transaction.

### Example

```json
{
  "version": 1,
  "operations": [
    { "kind": "getNode", "id": "player" },
    { "kind": "setProperty", "id": "door", "property": "open", "value": true },
    { "kind": "output", "text": "The door opens." }
  ]
}
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "operations"],
  "properties": {
    "version": { "const": 1 },
    "operations": { "type": "array", "maxItems": 32, "items": { "type": "object" } }
  },
  "additionalProperties": false
}
```

## Output

Successful execution returns a new graph snapshot, ordered command results, and output/broadcast intents. An error returns the untouched input world. Intents are descriptions only; the core does not send messages or invoke external effects.

### Example

```json
{
  "ok": true,
  "world": { "nodes": [{ "id": "door", "type": "door", "properties": { "open": true } }], "relations": [] },
  "results": [{ "id": "door", "type": "door", "properties": { "open": true } }, null],
  "emissions": [{ "kind": "output", "text": "The door opens." }]
}
```

## Behavior

Run `npx jest --runInBand test/core/browser/game/dynamicMud.test.js`. The interpreter accepts only its finite AST, safe identifiers, bounded JSON-like values, and worlds of at most 256 nodes and relations. It rejects arbitrary source text and executable values. Changes are atomic: if any operation fails, no earlier change is returned. Deleting a node also removes its attached relations. The world supplied by the caller is never mutated.
