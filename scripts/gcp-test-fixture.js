#!/usr/bin/env node
import { createRequire } from 'node:module';
import { ADMIN_UID } from '../src/core/commonCore.js';

const runtimeDepsRequire = createRequire(
  new URL('../src/cloud/runtime-deps/package.json', import.meta.url)
);

const { cert, initializeApp } = runtimeDepsRequire('firebase-admin/app');
const { getAuth } = runtimeDepsRequire('firebase-admin/auth');
const { getFirestore } = runtimeDepsRequire('firebase-admin/firestore');

const DEFAULT_STORY_TITLE = 'E2E moderation fixture story';
const DEFAULT_FIRST_CONTENT = 'The first seeded page invites the reader forward.';
const DEFAULT_SECOND_CONTENT = 'The second seeded page closes the loop.';
const DEFAULT_OPTION_TEXT = 'Continue to the second page';
const STORY_ID = 'gcp-test-fixture-story';
const FIRST_PAGE_NUMBER = 1;
const SECOND_PAGE_NUMBER = 2;
const FIRST_VARIANT_NAME = 'a';
const SECOND_VARIANT_NAME = 'a';

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

async function postJson(url, idToken, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    throw new Error(
      `Request to ${url} failed: ${response.status} ${await response.text()}`
    );
  }
}

async function seedFirestore(db) {
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
    content: DEFAULT_FIRST_CONTENT,
    authorName: 'Fixture Author',
    visibility: 1,
    rand: 0.2,
    moderatorReputationSum: 0,
    moderationRatingCount: 0,
  });
  batch.set(secondVariantRef, {
    content: DEFAULT_SECOND_CONTENT,
    authorName: 'Fixture Author',
    visibility: 1,
    rand: 0.8,
    moderatorReputationSum: 0,
    moderationRatingCount: 0,
  });
  batch.set(firstVariantRef.collection('options').doc('continue'), {
    content: DEFAULT_OPTION_TEXT,
    targetPage: secondPageRef,
  });
  batch.set(db.collection('storyStats').doc(STORY_ID), {
    variantCount: 2,
  });
  batch.set(db.collection('moderators').doc(ADMIN_UID), {
    variant: firstVariantRef,
    createdAt: new Date(),
  });

  await batch.commit();
}

async function main() {
  const projectId = requireEnv('PROJECT_ID');
  const databaseId = requireEnv('DATABASE_ID');
  const environment = requireEnv('ENVIRONMENT');
  const staticBucket = requireEnv('TEST_STATIC_BUCKET');
  const staticObjectPrefix = requireEnv('STATIC_OBJECT_PREFIX');
  const webAppConfig = parseJsonEnv('FIREBASE_WEB_APP_CONFIG_JSON');
  const markVariantDirtyUrl = requireEnv('MARK_VARIANT_DIRTY_URL');
  const triggerRenderContentsUrl = requireEnv('TRIGGER_RENDER_CONTENTS_URL');
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

  await postJson(markVariantDirtyUrl, idToken, {
    page: FIRST_PAGE_NUMBER,
    variant: FIRST_VARIANT_NAME,
  });
  await postJson(markVariantDirtyUrl, idToken, {
    page: SECOND_PAGE_NUMBER,
    variant: SECOND_VARIANT_NAME,
  });
  await postJson(triggerRenderContentsUrl, idToken, {});

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
