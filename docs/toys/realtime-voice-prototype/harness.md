# Harness: Realtime Voice Prototype

## Local checks

```bash
node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/realtimeSessionConfig.test.js test/toys/2026-05-07/realtimeVoicePrototype.test.js test/browser/presenters/realtimeVoicePrototype.test.js test/local/openaiRealtimeCalls.test.js test/local/server.realtimeRoute.test.js test/cloud/realtime-call/index.test.js
npm run build
npm run build:cloud
npm run lint
npm test
```

## Manual local relay check

```bash
export OPENAI_API_KEY=sk-...
npm run build
WRITER_PORT=4321 npm run start:writer
```

Open `http://<computer-lan-ip>:4321/index.html#REAL2` on the phone, paste `{"server":"local","localEndpoint":"/api/realtime/call"}`, press Submit, then press Connect.

## Manual cloud relay check

The cloud relay is implemented as the `realtimeCall` Cloud Function from `src/cloud/realtime-call/index.js` and packaged into `infra/cloud-functions/realtime-call` by `npm run build:cloud`.

```bash
npm run build:cloud
terraform -chdir=infra apply -var='openai_api_key=sk-...'
```

After deployment, paste the function HTTPS trigger URL into REAL2 as `cloudEndpoint`:

```json
{"server":"cloud","cloudEndpoint":"https://REGION-PROJECT.cloudfunctions.net/ENV-realtime-call"}
```

Press Submit, confirm the presenter says `Session server: cloud server`, then press Connect.
