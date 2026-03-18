# Dadeto

Dadeto is a multi-environment JavaScript monorepo that powers three related interfaces:

1. **mattheard.net blog** – a static site generated from `src/build/blog.json`.
2. **Dendrite** – a cloud-backed story/variant workflow with browser admin tooling and Google Cloud Functions.
3. **Local writing tool** – a local-first `/writer/` app served by Express for drafting workflow documents.

The repo is intentionally split so most business logic lives in shared **core** modules, while environment-specific folders provide adapters, entry points, and deployment packaging.

## What this repository actually does

- Generates and publishes the static Matt Heard blog (`npm run build:mattheard-net`).
- Packages browser + core assets for Dendrite static hosting (`npm run build:dendritestories-co-nz`).
- Packages Cloud Function source + shared runtime modules for Dendrite backend deployment (`npm run build:cloud`).
- Runs a local writer server that persists markdown workflow state on disk (`npm run start:writer` or `npm run start:writer:playwright`).

## Architecture boundary (core vs environments)

### Core (shared domain logic)

`src/core/` contains logic meant to be reused across execution environments:

- `src/core/build/` – build pipeline orchestration and reusable build utilities.
- `src/core/browser/` – browser-safe logic that does not own page bootstrapping.
- `src/core/cloud/` – cloud/domain logic used by function wrappers.
- `src/core/local/` – local workflow state rules used by the writer tool.

**Boundary rule:** `src/core/**` should express behavior; environment layers should inject side effects (filesystem, network, Firebase/Firestore SDK, DOM globals, process env, etc.).

### Environment layers

- **Browser environment (`src/browser/`)**
  - Owns browser entry points, DOM wiring, event listeners, and UI composition.
  - Consumes core helpers and browser input/presenter modules.

- **Build environment (`src/build/`)**
  - Owns CLI scripts for generating static output and copying deployable assets.
  - Uses `src/core/build/**` for reusable workflow logic.

- **Cloud environment (`src/cloud/`)**
  - Owns Google Cloud Function wrappers, per-function entry points, and runtime adapters.
  - Delegates request/response/domain behavior to `src/core/cloud/**`.

- **Local environment (`src/local/`)**
  - Owns Express server endpoints and local filesystem persistence adapters.
  - Delegates workflow rules to `src/core/local/workflow.js`.

## Interface map

### 1) mattheard.net blog

- Content source: `src/build/blog.json`
- Static site generation: `src/build/generate.js`
- Public output target: `public/`
- Primary build command: `npm run build:mattheard-net`

This interface is a generated static site with optional interactive browser components.

### 2) Dendrite

Dendrite spans multiple layers:

- Browser/admin assets: `src/browser/`
- Cloud function wrappers: `src/cloud/*`
- Shared cloud logic: `src/core/cloud/*`
- Infra packaging target: `infra/`
- Build commands:
  - `npm run build:dendritestories-co-nz` (copies browser/core assets for infra)
  - `npm run build:cloud` (copies cloud functions + shared modules for deployment)

### 3) Local writing tool

- Server entry point: `src/local/server.js`
- Persistence adapter: `src/local/documentStore.js`
- Shared workflow logic: `src/core/local/workflow.js`
- Local data path (default): `local-data/writer-workflow/`
- Start command: `npm run start:writer`
- Playwright-friendly start command: `npm run start:writer:playwright`

The local writer exposes REST endpoints under `/api/writer/*` and serves a browser app at `/writer/`.

## Repository structure

- `src/` – source code for all environments + shared core.
- `public/` – generated/static output artifacts.
- `infra/` – Terraform and deployment packaging targets.
- `test/` – Jest and e2e test suites.
- `reports/` – generated quality reports.

## Common commands

- `npm install` – install dependencies.
- `npm test` – run Jest with coverage.
- `npm run lint` – run ESLint/Prettier checks.
- `npm run build:mattheard-net` – build mattheard.net static output.
- `npm run build:dendritestories-co-nz` – package Dendrite static assets.
- `npm run build:cloud` – package Dendrite cloud functions.
- `npm run start:writer` – run local writing server.
- `npm run start:writer:playwright` – run local writing server for Playwright/base-URL smoke workflows.

## Deployment notes

- Dendrite infrastructure is managed via Terraform under `infra/` and GitHub Actions workflows.
- E2E Playwright coverage is intended for cloud execution (Cloud Run Jobs), not local execution.

## License

All content is authored by Matt Heard and is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), unless otherwise noted.
