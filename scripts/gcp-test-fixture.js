#!/usr/bin/env node
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { ADMIN_UID } from '../src/core/commonCore.js';
import { createRenderContents } from '../src/core/cloud/render-contents/render-contents-core.js';
import { createRenderVariant } from '../src/core/cloud/render-variant/render-variant-core.js';

const runtimeDepsRequire = createRequire(
  new URL('../src/cloud/runtime-deps/package.json', import.meta.url)
);

const { cert, initializeApp } = runtimeDepsRequire('firebase-admin/app');
const { getAuth } = runtimeDepsRequire('firebase-admin/auth');
const { getFirestore } = runtimeDepsRequire('firebase-admin/firestore');
const { Storage } = runtimeDepsRequire('@google-cloud/storage');
const { OAuth2Client } = runtimeDepsRequire('google-auth-library');

const DEFAULT_STORY_TITLE = 'E2E moderation fixture story';
const DEFAULT_FIRST_CONTENT = 'The first seeded page invites the reader forward.';
const DEFAULT_SECOND_CONTENT = 'The second seeded page closes the loop.';
const DEFAULT_OPTION_TEXT = 'Continue to the second page';
const STORY_ID = 'gcp-test-fixture-story';
const FIRST_PAGE_NUMBER = 1;
const SECOND_PAGE_NUMBER = 2;
const FIRST_VARIANT_NAME = 'a';
const SECOND_VARIANT_NAME = 'a';
const TRANSIENT_SEED_ATTEMPTS = 3;
const TRANSIENT_SEED_RETRY_DELAY_MS = 2000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseJsonEnv(name) {
  return JSON.parse(requireEnv(name));
}

function parseOptionalJsonEnv(name) {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  return JSON.parse(value);
}

function createFirebaseAppOptions(projectId) {
  const credentials = parseOptionalJsonEnv('GOOGLE_CREDENTIALS_JSON');
  if (!credentials?.client_email || !credentials?.private_key) {
    return { projectId };
  }

  return {
    credential: cert(credentials),
    projectId,
  };
}

function createStorageClient(projectId) {
  const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (accessToken) {
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: accessToken });
    return new Storage({ projectId, authClient });
  }

  const credentials = parseOptionalJsonEnv('GOOGLE_CREDENTIALS_JSON');
  if (!credentials?.client_email || !credentials?.private_key) {
    return new Storage({ projectId });
  }

  return new Storage({
    projectId,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });
}

function createFirestoreDocumentRefs(db) {
  const storyRef = db.collection('stories').doc(STORY_ID);
  const firstPageRef = storyRef.collection('pages').doc(String(FIRST_PAGE_NUMBER));
  const secondPageRef = storyRef
    .collection('pages')
    .doc(String(SECOND_PAGE_NUMBER));
  const firstVariantRef = firstPageRef.collection('variants').doc(FIRST_VARIANT_NAME);
  const secondVariantRef = secondPageRef
    .collection('variants')
    .doc(SECOND_VARIANT_NAME);

  return {
    storyRef,
    firstPageRef,
    secondPageRef,
    firstVariantRef,
    secondVariantRef,
  };
}

async function exchangeCustomToken(apiKey, customToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to exchange custom token: ${response.status} ${await response.text()}`
    );
  }

  const payload = await response.json();
  if (typeof payload.idToken !== 'string' || payload.idToken.length === 0) {
    throw new Error('Firebase token exchange did not return an idToken');
  }

  return payload.idToken;
}

async function seedFirestore(db) {
  await resetFirestore(db);

  const {
    storyRef,
    firstPageRef,
    secondPageRef,
    firstVariantRef,
    secondVariantRef,
  } = createFirestoreDocumentRefs(db);

  const batch = db.batch();
  batch.set(storyRef, {
    title: DEFAULT_STORY_TITLE,
    rootPage: firstPageRef,
  });
  batch.set(firstPageRef, {
    number: FIRST_PAGE_NUMBER,
  });
  batch.set(secondPageRef, {
    number: SECOND_PAGE_NUMBER,
  });
  batch.set(firstVariantRef, {
    name: FIRST_VARIANT_NAME,
    content: DEFAULT_FIRST_CONTENT,
    authorName: 'Fixture Author',
    visibility: 1,
    dirty: true,
    rand: 0.2,
    // This page is assigned directly below; keep the next assignment focused on
    // the second zero-rated page instead of letting random selection repeat it.
    moderatorReputationSum: 1,
    moderationRatingCount: 1,
  });
  batch.set(secondVariantRef, {
    name: SECOND_VARIANT_NAME,
    content: DEFAULT_SECOND_CONTENT,
    authorName: 'Fixture Author',
    visibility: 1,
    dirty: true,
    rand: 0.8,
    moderatorReputationSum: 0,
    moderationRatingCount: 0,
  });
  batch.set(firstVariantRef.collection('options').doc('continue'), {
    content: DEFAULT_OPTION_TEXT,
    position: 0,
    targetPage: secondPageRef,
  });
  batch.set(db.collection('storyStats').doc(STORY_ID), {
    variantCount: 2,
  });
  batch.set(db.collection('moderators').doc(ADMIN_UID), {
    variant: firstVariantRef.path,
    createdAt: new Date(),
  });
  batch.set(db.collection('payment-customers').doc('cus_e2e_checkout'), {
    apiKeyUuid: 'api-key-e2e-checkout',
  });
  batch.set(db.collection('payment-customers').doc('cus_e2e_mapping'), {
    apiKeyUuid: 'api-key-e2e-mapping',
  });

  await batch.commit();
}

/**
 * Delete every document in the database before seeding.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore database.
 * @returns {Promise<void>} Resolves after all known documents are deleted.
 */
async function resetFirestore(db) {
  await deleteCollections(await db.listCollections());
}

/**
 * Recursively delete the contents of multiple collections.
 * @param {Array<{ listDocuments: () => Promise<Array<{ delete: () => Promise<void>, listCollections: () => Promise<Array<unknown>> }>> }>} collections Firestore collections.
 * @returns {Promise<void>} Resolves after the collections are empty.
 */
async function deleteCollections(collections) {
  for (const collection of collections) {
    await deleteCollection(collection);
  }
}

/**
 * Recursively delete all documents and subcollections in a collection.
 * @param {{ listDocuments: () => Promise<Array<{ delete: () => Promise<void>, listCollections: () => Promise<Array<unknown>> }>> }} collection Firestore collection.
 * @returns {Promise<void>} Resolves after the collection has been cleared.
 */
async function deleteCollection(collection) {
  const docs = await collection.listDocuments();
  for (const doc of docs) {
    await deleteDocument(doc);
  }
}

/**
 * Recursively delete a document and all of its subcollections.
 * @param {{ delete: () => Promise<void>, listCollections: () => Promise<Array<unknown>> }} doc Firestore document.
 * @returns {Promise<void>} Resolves after the document tree is deleted.
 */
async function deleteDocument(doc) {
  await deleteCollections(await doc.listCollections());
  await doc.delete();
}

async function renderSeededContents({
  db,
  projectId,
  staticBucket,
  staticObjectPrefix,
}) {
  const renderContents = createRenderContents({
    db,
    storage: createStorageClient(projectId),
    bucketName: staticBucket,
    objectPrefix: staticObjectPrefix,
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'gcp-test-fixture-token' }),
    }),
    randomUUID,
  });

  await renderContents();
}

function createFixtureFetchResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'gcp-test-fixture-token' }),
  };
}

async function renderSeededStoryPages({
  db,
  projectId,
  staticBucket,
  staticObjectPrefix,
}) {
  const { firstVariantRef, secondVariantRef } = createFirestoreDocumentRefs(db);
  const renderVariant = createRenderVariant({
    db,
    storage: createStorageClient(projectId),
    bucketName: staticBucket,
    objectPrefix: staticObjectPrefix,
    fetchFn: async () => createFixtureFetchResponse(),
    randomUUID,
  });

  await renderVariant(await secondVariantRef.get(), {
    params: { storyId: STORY_ID },
  });
  await renderVariant(await firstVariantRef.get(), {
    params: { storyId: STORY_ID },
  });
}

async function retryTransientSeedStep(stepFn) {
  let lastError;
  for (let attempt = 1; attempt <= TRANSIENT_SEED_ATTEMPTS; attempt += 1) {
    try {
      return await stepFn();
    } catch (error) {
      lastError = error;
      if (!isTransientSeedError(error) || attempt === TRANSIENT_SEED_ATTEMPTS) {
        throw error;
      }

      await delay(TRANSIENT_SEED_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

/**
 * Determine whether a seed step failed for a transient transport/auth reason.
 * @param {unknown} error Failure raised by the seed workflow.
 * @returns {boolean} True when a retry is likely to help.
 */
function isTransientSeedError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Premature close') ||
    message.includes('ERR_STREAM_PREMATURE_CLOSE') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('429')
  );
}

/**
 * Pause briefly before retrying a transient seed step.
 * @param {number} delayMs Wait duration in milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
function delay(delayMs) {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}

async function main() {
  const projectId = requireEnv('PROJECT_ID');
  const databaseId = requireEnv('DATABASE_ID');
  const environment = requireEnv('ENVIRONMENT');
  const staticBucket = requireEnv('TEST_STATIC_BUCKET');
  const staticObjectPrefix = requireEnv('STATIC_OBJECT_PREFIX');
  const webAppConfig = parseJsonEnv('FIREBASE_WEB_APP_CONFIG_JSON');
  const apiKey = webAppConfig.apiKey;

  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('FIREBASE_WEB_APP_CONFIG_JSON must include apiKey');
  }

  const app = initializeApp(createFirebaseAppOptions(projectId));

  const auth = getAuth(app);
  const db = getFirestore(app, databaseId);
  const customToken = await auth.createCustomToken(ADMIN_UID);
  const idToken = await exchangeCustomToken(apiKey, customToken);

  await seedFirestore(db);

  await retryTransientSeedStep(() =>
    renderSeededContents({
      db,
      projectId,
      staticBucket,
      staticObjectPrefix,
    })
  );
  await retryTransientSeedStep(() =>
    renderSeededStoryPages({
      db,
      projectId,
      staticBucket,
      staticObjectPrefix,
    })
  );

  const fixture = {
    idToken,
    storyTitle: DEFAULT_STORY_TITLE,
    contentsPath: `${staticObjectPrefix}index.html`,
    statsPath: `${staticObjectPrefix}stats.html`,
    moderation: {
      firstContent: DEFAULT_FIRST_CONTENT,
      secondContent: DEFAULT_SECOND_CONTENT,
    },
    story: {
      firstPagePath: `/p/${FIRST_PAGE_NUMBER}${FIRST_VARIANT_NAME}.html`,
      secondPagePath: `/p/${SECOND_PAGE_NUMBER}${SECOND_VARIANT_NAME}.html`,
      optionText: DEFAULT_OPTION_TEXT,
    },
    expectedStatsAfterModeration: {
      storyCount: 1,
      pageCount: 2,
      unmoderatedPageCount: 1,
    },
    environment,
    staticBucket,
  };

  process.stdout.write(`${JSON.stringify(fixture)}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
