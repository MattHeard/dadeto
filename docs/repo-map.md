# Repository Map

## Top-level subsystem inventory

| Subsystem | Purpose | Primary paths |
| --- | --- | --- |
| Shared core domain | Cross-environment business logic and reusable orchestration | `src/core/` |
| Browser app layer | UI bootstrapping, event wiring, and browser adapters for site + toys | `src/browser/`, `public/browser/` |
| Build and generation | Static generation and deployment copy pipelines | `src/build/`, `src/scripts/` |
| Cloud function layer | Google Cloud Function wrappers + runtime integration | `src/cloud/`, `infra/browser/functions/` |
| Local writer runtime | Local-first writing workflow server and persistence | `src/local/` |
| Test and quality | Unit/e2e tests and quality report artifacts | `test/`, `e2e/`, `reports/` |
| Deployment + infra | Terraform, packaging, and automation workflow definitions | `infra/`, `.github/workflows/`, `docker/` |
| Generated/public outputs | Static publish targets and dated snapshots | `public/` |
| Repo learning memory | Agent notes and project tracking records | `notes/agents/`, `.beads/`, `tracking/` |

## Key paths and entry points

- `README.md` — project intent and cross-environment architecture boundary.
- `package.json` — canonical command registry for build, test, lint, deploy packaging, and runtime scripts.
- `src/build/generate.js` — static blog generation entry point.
- `src/build/copy.js` and `src/build/copy-dendrite.js` — static asset copy pipelines.
- `src/build/copy-cloud.js` — cloud deployment packaging entry point.
- `src/local/server.js` — local writer Express server entry point.
- `src/cloud/*.js` — cloud function wrapper entry points.
- `src/browser/` — browser bootstrapping and composition layer.
- `src/core/` — shared behavior surface for build/browser/cloud/local contexts.
- `test/` — Jest suites grouped by subsystem.
- `e2e/` — Playwright cloud-executed end-to-end scenarios.

## Command-to-subsystem mapping

| Command | Subsystem focus | Primary impact |
| --- | --- | --- |
| `npm test` | Test + core/runtime integrity | Runs Jest suite with coverage over `src/**` via `test/**`.
| `npm run lint` | Quality gates + style health | ESLint/Prettier sweep with output in `reports/lint/lint.txt`.
| `npm run build` / `npm run build:mattheard-net` | Build pipeline + static blog | Generates/copies blog output into `public/`.
| `npm run build:dendritestories-co-nz` | Dendrite browser packaging | Copies browser/core artifacts for static Dendrite deploy.
| `npm run build:cloud` | Cloud function packaging | Assembles cloud deploy payload from cloud + shared modules.
| `npm run start` | Static serving | Serves generated `public/` output for local inspection.
| `npm run start:writer` / `npm run start:writer:playwright` | Local writer runtime | Runs Express writer server with filesystem-backed state.
| `npm run test:e2e` | Cloud E2E validation | Executes Playwright suite intended for cloud/CI execution.
| `npm run duplication` | Architecture hygiene | Runs duplication analysis (`jscpd`) across repo sources.
