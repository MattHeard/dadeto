#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createAllowEffects } from '../src/cloud/allow-effects.js';
import { createRunnerCommitmentProjectionRepository } from '../src/cloud/object-minute-rental-search/runner-commitment-projection-repository.js';

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
const allowEffects = createAllowEffects();
let cursor;
let processed = 0;

for (;;) {
  let query = db
    .collection('runner_assignments')
    .orderBy(FieldPath.documentId())
    .limit(100);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  if (page.empty) break;
  for (const assignment of page.docs) {
    await repository.refresh(allowEffects, { assignmentId: assignment.id });
    processed += 1;
  }
  cursor = page.docs.at(-1);
}

console.log(JSON.stringify({ databaseId, processed, status: 'complete' }));

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing-${name.toLowerCase()}`);
  return value;
}
