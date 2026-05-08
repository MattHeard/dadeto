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
mkdir -p local-data/certs
mkcert -install
mkcert -key-file local-data/certs/dadeto-local-key.pem -cert-file local-data/certs/dadeto-local.pem localhost 127.0.0.1 <computer-lan-ip>
npm run build
WRITER_HTTPS=1 \
WRITER_TLS_KEY=local-data/certs/dadeto-local-key.pem \
WRITER_TLS_CERT=local-data/certs/dadeto-local.pem \
WRITER_PORT=4321 \
npm run start:writer
```

Install or trust the mkcert root CA on the phone before opening the toy. Open `https://<computer-lan-ip>:4321/index.html#REAL2` on the phone, paste `{"server":"local","localEndpoint":"/api/realtime/call"}`, press Submit, then press Connect.

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
