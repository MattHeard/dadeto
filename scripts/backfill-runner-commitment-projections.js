#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createAllowEffects } from '../src/cloud/allow-effects.js';
import { createRunnerCommitmentProjectionRepository } from '../src/cloud/object-minute-rental-search/runner-commitment-projection-repository.js';
import { backfillRunnerCommitmentProjections } from '../src/cloud/object-minute-rental-search/runner-commitment-projection-backfill.js';

const runtimeDepsRequire = createRequire(
  new URL('../src/cloud/runtime-deps/package.json', import.meta.url)
);
const { applicationDefault, initializeApp } = runtimeDepsRequire(
  'firebase-admin/app'
);
const { FieldPath, getFirestore } = runtimeDepsRequire(
  'firebase-admin/firestore'
);
const projectId = requiredEnv('PROJECT_ID');
const databaseId = process.env.DATABASE_ID ?? '(default)';
const app = initializeApp(
  { credential: applicationDefault(), projectId },
  `runner-commitment-projection-backfill-${databaseId}`
);
const db = getFirestore(app, databaseId);
const repository = createRunnerCommitmentProjectionRepository({ db });
const processed = await backfillRunnerCommitmentProjections(createAllowEffects(), {
  db,
  repository,
  documentIdFieldPath: FieldPath.documentId(),
});

console.log(JSON.stringify({ databaseId, processed, status: 'complete' }));

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing-${name.toLowerCase()}`);
  return value;
}
