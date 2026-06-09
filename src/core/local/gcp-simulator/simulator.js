import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ADMIN_UID } from '../../commonCore.js';
import { createFakeFieldValue, createFakeFirestore } from './fake-firestore.js';
import { FakeStorage } from './fake-storage.js';
import { createProcessNewStoryHandler } from '../../process-new-story-core.js';
import { createProcessNewPageHandler } from '../../process-new-page-core.js';
import {
  createHandleSubmit,
  parseIncomingOption,
} from '../../submit-new-page-core.js';
import { createRenderContents } from '../../render-contents-core.js';
import {
  createRenderVariant,
  createHandleVariantWrite,
} from '../../render-variant-core.js';
import { createGenerateStatsCore } from '../../generate-stats-core.js';
import { createSubmitNewStoryResponder } from '../../submit-new-story-core.js';
import { getAuthorizationHeader } from '../../submit-shared.js';

const DEFAULT_STORY_TITLE = 'E2E moderation fixture story';
const DEFAULT_FIRST_CONTENT =
  'The first seeded page invites the reader forward.';
const DEFAULT_SECOND_CONTENT = 'The second seeded page closes the loop.';
const DEFAULT_OPTION_TEXT = 'Continue to the second page';
const STORY_ID = 'gcp-test-fixture-story';
const FIRST_PAGE_NUMBER = 1;
const SECOND_PAGE_NUMBER = 2;
const FIRST_VARIANT_NAME = 'a';
const SECOND_VARIANT_NAME = 'a';
const LOCAL_ID_TOKEN = 'local-admin-token';

/**
 * Build the local GCP simulator used by Playwright and local tests.
 * @param {{
 *   baseUrl?: string,
 *   bucketName?: string,
 *   projectId?: string,
 *   publicDir?: string,
 * }} [options] Simulator options.
 * @returns {Promise<object>} Simulator instance.
 */
export async function createLocalGcpSimulator(options = {}) {
  const {
    baseUrl = 'http://127.0.0.1:4321',
    bucketName = 'local-static',
    projectId = 'local-project',
    publicDir = path.resolve('public'),
  } = options;

  return createLocalGcpSimulatorRuntime({
    baseUrl,
    bucketName,
    projectId,
    publicDir,
  });
}

/**
 * Create the simulator config object.
 * @param {string} baseUrl Base URL.
 * @param {string} bucketName Bucket name.
 * @param {string} projectId Project id.
 * @returns {{
 *   submitNewStoryUrl: string,
 *   submitNewPageUrl: string,
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }} Config object.
 */
function createSimulatorConfig(baseUrl, bucketName, projectId) {
  return {
    submitNewStoryUrl: `${baseUrl}/__sim/submit-new-story`,
    submitNewPageUrl: `${baseUrl}/__sim/submit-new-page`,
    getModerationVariantUrl: `${baseUrl}/__sim/get-moderation-variant`,
    assignModerationJobUrl: `${baseUrl}/__sim/assign-moderation-job`,
    submitModerationRatingUrl: `${baseUrl}/__sim/submit-moderation-rating`,
    triggerRenderContentsUrl: `${baseUrl}/__sim/trigger-render-contents`,
    markVariantDirtyUrl: `${baseUrl}/__sim/mark-variant-dirty`,
    generateStatsUrl: `${baseUrl}/__sim/generate-stats`,
    bucketName,
    projectId,
  };
}

/**
 * Create the seed manifest for the fixture story.
 * @param {string} bucketName Bucket name.
 * @returns {object} Seed manifest.
 */
function createSeedManifest(bucketName) {
  return {
    idToken: LOCAL_ID_TOKEN,
    storyTitle: DEFAULT_STORY_TITLE,
    contentsPath: '/index.html',
    statsPath: '/stats.html',
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
    environment: 'local',
    staticBucket: bucketName,
  };
}

/**
 * Create a cleanup function for the simulator storage root.
 * @param {string} storageRoot Temporary storage root.
 * @returns {() => Promise<void>} Cleanup function.
 */
function createClear(storageRoot) {
  return async () => {
    await rm(storageRoot, { recursive: true, force: true });
  };
}

/**
 * Build the local GCP simulator runtime.
 * @param {{
 *   baseUrl: string,
 *   bucketName: string,
 *   projectId: string,
 *   publicDir: string,
 * }} config Simulator configuration.
 * @returns {Promise<object>} Simulator instance.
 */
async function createLocalGcpSimulatorRuntime(config) {
  const { baseUrl, bucketName, projectId, publicDir } = config;
  const state = await buildSimulatorState({
    baseUrl,
    bucketName,
    projectId,
    publicDir,
  });
  return buildSimulatorApi(state);
}

/**
 * Build the exported simulator API from state.
 * @param {object} state Simulator state.
 * @returns {object} Simulator instance.
 */
function buildSimulatorApi(state) {
  return state;
}

/**
 * Build simulator state and handlers.
 * @param {{
 *   baseUrl: string,
 *   bucketName: string,
 *   projectId: string,
 *   publicDir: string,
 * }} config Simulator configuration.
 * @returns {Promise<object>} Simulator state.
 */
async function buildSimulatorState(config) {
  const { baseUrl, bucketName, projectId, publicDir } = config;
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), 'dadeto-gcp-sim-'));
  const storage = new FakeStorage({ rootDir: storageRoot });
  const fieldValue = createFakeFieldValue();
  const db = createFakeFirestore({ onCommit: dispatchCommittedWrites });
  const fetchFn = createLocalFetchStub();

  const renderContents = createRenderContents({
    db,
    storage,
    fetchFn,
    randomUUID,
    bucketName,
    objectPrefix: '',
    projectId,
  });

  const renderVariant = createRenderVariant({
    db,
    storage,
    fetchFn,
    randomUUID,
    bucketName,
    objectPrefix: '',
    projectId,
  });

  const handleVariantWrite = createHandleVariantWrite({
    renderVariant,
    getDeleteSentinel: () => fieldValue.delete(),
    db,
  });

  const verifyStatsIdToken = async token => createAuthResult(token, true);
  const verifySubmitNewPageIdToken = async token =>
    createAuthResult(token, false);
  const verifySubmitNewStoryIdToken = async token =>
    createAuthResult(token, false);

  const generateStatsCore = createGenerateStatsCore({
    db,
    auth: {
      verifyIdToken: verifyStatsIdToken,
    },
    storage,
    fetchFn,
    env: {
      GOOGLE_CLOUD_PROJECT: projectId,
      GCLOUD_PROJECT: projectId,
      DENDRITE_ENVIRONMENT: 't-local',
      PLAYWRIGHT_ORIGIN: baseUrl,
      STATIC_BUCKET_NAME: bucketName,
    },
    cryptoModule: { randomUUID },
    console,
  });

  const processNewStory = createProcessNewStoryHandler({
    db,
    fieldValue,
    randomUUID,
    random: createRandomSource,
  });

  const processNewPage = createProcessNewPageHandler({
    db,
    fieldValue,
    randomUUID,
    random: createRandomSource,
  });

  const submitNewPage = createHandleSubmit({
    verifyIdToken: verifySubmitNewPageIdToken,
    randomUUID,
    saveSubmission: async (id, submission) => {
      await db.collection('pageFormSubmissions').doc(id).set(submission);
    },
    serverTimestamp: () => new Date(),
    parseIncomingOption,
    findExistingOption: async option => {
      const optionPath = await findExistingOptionPath(option);
      return optionPath;
    },
    findExistingPage: async pageNumber => {
      const pagePath = await findExistingPagePath(pageNumber);
      return pagePath;
    },
  });

  const submitNewStory = createSubmitNewStoryResponder({
    verifyIdToken: verifySubmitNewStoryIdToken,
    saveSubmission: async (id, submission) => {
      await db.collection('storyFormSubmissions').doc(id).set(submission);
    },
    randomUUID,
    getServerTimestamp: () => new Date(),
  });

  const testUtils = {
    resolveTargetPageNumber,
    extractParams,
    matchesTrigger,
    parseOptionLookup,
    findExistingPagePath,
    findExistingOptionPath,
    createSnapshot,
    createSnapshots,
    createLocalFetchStub,
    createRandomSource,
    generateStatsVerifyIdToken: verifyStatsIdToken,
    submitNewPageVerifyIdToken: verifySubmitNewPageIdToken,
    submitNewStoryVerifyIdToken: verifySubmitNewStoryIdToken,
  };

  const triggerRegistry = [];
  const triggerRegistrationsByEvent = {
    onCreate: [
      {
        pathPattern: 'storyFormSubmissions/{subId}',
        handler: processNewStory,
      },
      {
        pathPattern: 'pageFormSubmissions/{subId}',
        handler: processNewPage,
      },
      {
        pathPattern: 'stories/{storyId}',
        handler: renderContents,
      },
      {
        pathPattern: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
        handler: renderVariant,
      },
    ],
    onWrite: [
      {
        pathPattern: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
        handler: handleVariantWrite,
      },
    ],
  };
  registerTriggerRegistrationsByEvent(triggerRegistrationsByEvent);

  await seedFixture();

  return buildSimulatorApi({
    baseUrl,
    bucketName,
    projectId,
    publicDir,
    storageRoot,
    db,
    storage,
    fieldValue,
    submitNewStory,
    generateStatsCore,
    renderContents,
    renderVariant,
    handleVariantWrite,
    getConfig: () => createSimulatorConfig(baseUrl, bucketName, projectId),
    getSeedManifest: () => createSeedManifest(bucketName),
    testUtils,
    verifyIdToken: async token => createAuthResult(token, true),
    clear: createClear(storageRoot),
    dispatchCommittedWrites,
    routes: buildRoutes(),
  });

  /**
   * Dispatch committed Firestore writes to the registered triggers.
   * @param {Array<{ path: string, before?: unknown, after?: unknown }>} records
   *   Changed documents.
   * @returns {Promise<void>} Nothing.
   */
  async function dispatchCommittedWrites(records) {
    for (const record of records) {
      await dispatchRecord(record);
    }
  }

  /**
   * Dispatch a single committed Firestore write to matching triggers.
   * @param {{ path: string, before?: unknown, after?: unknown }} record Changed document.
   * @returns {Promise<void>} Nothing.
   */
  async function dispatchRecord(record) {
    const snapshots = createSnapshots(record.path, record.before, record.after);
    const isCreate = !record.before && record.after;
    const isWrite = Boolean(record.before || record.after);

    for (const trigger of triggerRegistry) {
      if (!shouldDispatchTrigger(trigger, record.path, isCreate, isWrite)) {
        continue;
      }

      const context = {
        params: extractParams(trigger.pathPattern, record.path),
      };
      await dispatchTrigger(trigger, snapshots, context);
    }
  }

  /**
   * Register a trigger handler for a Firestore path pattern.
   * @param {string} pathPattern Firestore path pattern.
   * @param {'onCreate' | 'onWrite'} eventName Trigger event name.
   * @param {(snapshot: unknown, context: { params: Record<string, string> }) => Promise<void>} handler
   *   Trigger handler.
   * @returns {void}
   */
  function registerTrigger(pathPattern, eventName, handler) {
    triggerRegistry.push({ pathPattern, eventName, handler });
  }

  /**
   * Register all trigger registrations grouped by event.
   * @param {Record<string, Array<{ pathPattern: string, handler: (snapshot: unknown, context: { params: Record<string, string> }) => Promise<void> }>>} triggerRegistrationsByEvent
   *   Trigger registrations grouped by event.
   * @returns {void}
   */
  function registerTriggerRegistrationsByEvent(triggerRegistrationsByEvent) {
    for (const [eventName, registrations] of Object.entries(
      triggerRegistrationsByEvent
    )) {
      for (const registration of registrations) {
        registerTrigger(
          registration.pathPattern,
          eventName,
          registration.handler
        );
      }
    }
  }

  /**
   * Seed the simulator with the fixture story graph.
   * @returns {Promise<void>} Nothing.
   */
  async function seedFixture() {
    const storyRef = db.collection('stories').doc(STORY_ID);
    const firstPageRef = storyRef
      .collection('pages')
      .doc(String(FIRST_PAGE_NUMBER));
    const secondPageRef = storyRef
      .collection('pages')
      .doc(String(SECOND_PAGE_NUMBER));
    const firstVariantRef = firstPageRef
      .collection('variants')
      .doc(FIRST_VARIANT_NAME);
    const secondVariantRef = secondPageRef
      .collection('variants')
      .doc(SECOND_VARIANT_NAME);

    await db
      .batch()
      .set(storyRef, {
        title: DEFAULT_STORY_TITLE,
        rootPage: firstPageRef,
      })
      .set(firstPageRef, {
        number: FIRST_PAGE_NUMBER,
      })
      .set(secondPageRef, {
        number: SECOND_PAGE_NUMBER,
      })
      .set(firstVariantRef, {
        name: FIRST_VARIANT_NAME,
        content: DEFAULT_FIRST_CONTENT,
        authorName: 'Fixture Author',
        visibility: 1,
        dirty: true,
        rand: 0.2,
        moderatorReputationSum: 1,
        moderationRatingCount: 1,
      })
      .set(secondVariantRef, {
        name: SECOND_VARIANT_NAME,
        content: DEFAULT_SECOND_CONTENT,
        authorName: 'Fixture Author',
        visibility: 1,
        dirty: true,
        rand: 0.8,
        moderatorReputationSum: 0,
        moderationRatingCount: 0,
      })
      .set(firstVariantRef.collection('options').doc('continue'), {
        content: DEFAULT_OPTION_TEXT,
        position: 0,
        targetPage: secondPageRef,
      })
      .set(db.collection('storyStats').doc(STORY_ID), {
        variantCount: 2,
      })
      .set(db.collection('moderators').doc(ADMIN_UID), {
        variant: firstVariantRef.path,
        createdAt: new Date(),
      })
      .commit();
  }

  /**
   * Build before/after snapshots for a write event.
   * @param {string} pathValue Document path.
   * @param {unknown} before Previous document value.
   * @param {unknown} after Next document value.
   * @returns {{ before: unknown, after: unknown }} Snapshot pair.
   */
  function createSnapshots(pathValue, before, after) {
    return {
      before: createSnapshot(pathValue, before),
      after: createSnapshot(pathValue, after),
    };
  }

  /**
   * Build a snapshot-like object for a path and payload.
   * @param {string} pathValue Document path.
   * @param {unknown} data Document payload.
   * @returns {unknown} Snapshot object.
   */
  function createSnapshot(pathValue, data) {
    if (data === undefined) {
      const ref = db.doc(pathValue);
      return {
        exists: false,
        id: ref.id,
        ref,
        data: () => undefined,
      };
    }

    return db.__resolveDocumentSnapshot(pathValue);
  }

  /**
   * Test whether a path matches a trigger pattern.
   * @param {string} pathPattern Trigger pattern.
   * @param {string} pathValue Actual path.
   * @returns {boolean} Whether the pattern matches.
   */
  function matchesTrigger(pathPattern, pathValue) {
    return Boolean(extractParams(pathPattern, pathValue));
  }

  /**
   * Extract trigger params from a matching path.
   * @param {string} pathPattern Trigger pattern.
   * @param {string} pathValue Actual path.
   * @returns {Record<string, string> | null} Trigger params or null.
   */
  function extractParams(pathPattern, pathValue) {
    const patternSegments = split(pathPattern);
    const pathSegments = split(pathValue);
    if (patternSegments.length !== pathSegments.length) {
      return null;
    }

    const params = {};
    for (let index = 0; index < patternSegments.length; index += 1) {
      const patternSegment = patternSegments[index];
      const pathSegment = pathSegments[index];
      if (isParam(patternSegment)) {
        params[patternSegment.slice(1, -1)] = pathSegment;
        continue;
      }

      if (patternSegment !== pathSegment) {
        return null;
      }
    }

    return params;
  }

  /**
   * Split a path into trimmed segments.
   * @param {string} value Path string.
   * @returns {string[]} Path segments.
   */
  function split(value) {
    return String(value).replace(/^\/+/, '').replace(/\/+$/, '').split('/');
  }

  /**
   * Check whether a segment is a trigger parameter.
   * @param {string} segment Path segment.
   * @returns {boolean} True when the segment is a parameter.
   */
  function isParam(segment) {
    return segment.startsWith('{') && segment.endsWith('}');
  }

  /**
   * Build the simulator routes.
   * @returns {Record<string, (request: unknown) => Promise<{ status: number, body?: unknown }>>} Route map.
   */
  function buildRoutes() {
    return {
      submitNewStory: async request => handleSubmitNewStory(request),
      submitNewPage: async request => handleSubmitNewPage(request),
      getModerationVariant: async request =>
        handleGetModerationVariant(request),
      assignModerationJob: async request => handleAssignModerationJob(request),
      submitModerationRating: async request =>
        handleSubmitModerationRating(request),
      triggerRenderContents: async request =>
        handleTriggerRenderContents(request),
      markVariantDirty: async request => handleMarkVariantDirty(request),
      generateStats: async request => handleGenerateStats(request),
    };
  }

  /**
   * Run the submit-new-story route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleSubmitNewStory(request) {
    const response = await submitNewStory(request);
    return response;
  }

  /**
   * Run the submit-new-page route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleSubmitNewPage(request) {
    return submitNewPage(request);
  }

  /**
   * Run the get-moderation-variant route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleGetModerationVariant(request) {
    const uid = resolveUid(request);
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    const moderatorSnap = await db.collection('moderators').doc(uid).get();
    const variantPath = moderatorSnap.data()?.variant;
    if (typeof variantPath !== 'string' || !variantPath) {
      return { status: 404, body: 'Variant not found' };
    }

    const variantSnap = await db.doc(variantPath).get();
    if (!variantSnap.exists) {
      return { status: 404, body: 'Variant not found' };
    }

    return buildModerationVariantResponse(variantSnap);
  }

  /**
   * Run the assign-moderation-job route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleAssignModerationJob(request) {
    const uid = resolveUid(request);
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    const current = await db.collection('moderators').doc(uid).get();
    const currentPath = current.data()?.variant;

    const candidates = await db
      .collectionGroup('variants')
      .where('moderatorReputationSum', '==', 0)
      .get();
    const fallbacks = await db
      .collectionGroup('variants')
      .where('moderatorReputationSum', '==', null)
      .get();
    const all = [...candidates.docs, ...fallbacks.docs];
    const chosen = all.find(doc => doc.ref.path !== currentPath) ?? null;

    if (!chosen) {
      return { status: 404, body: 'Variant not found' };
    }

    await db.collection('moderators').doc(uid).set({
      variant: chosen.ref.path,
      createdAt: new Date(),
    });

    return { status: 201, body: { ok: true } };
  }

  /**
   * Run the submit-moderation-rating route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleSubmitModerationRating(request) {
    const uid = resolveUid(request);
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    const approval = parseApprovalFlag(request?.body);
    if (approval === null) {
      return { status: 400, body: 'Missing or invalid isApproved' };
    }

    const moderatorSnap = await db.collection('moderators').doc(uid).get();
    const variantPath = moderatorSnap.data()?.variant;
    if (typeof variantPath !== 'string' || !variantPath) {
      return { status: 404, body: 'Variant not found' };
    }

    const variantRef = db.doc(variantPath);
    const variantSnap = await variantRef.get();
    const { currentScore, currentCount } = resolveModerationTotals(
      variantSnap.data()
    );
    let scoreDelta = -1;
    if (approval) {
      scoreDelta = 1;
    }
    await variantRef.update({
      moderatorReputationSum: currentScore + scoreDelta,
      moderationRatingCount: currentCount + 1,
    });

    await db.collection('moderators').doc(uid).update({
      variant: fieldValue.delete(),
    });

    return { status: 200, body: { ok: true } };
  }

  /**
   * Re-run content rendering for all known stories.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleTriggerRenderContents() {
    const storiesSnap = await db.collection('stories').get();
    for (const storyDoc of storiesSnap.docs) {
      await renderContents(storyDoc, { params: { storyId: storyDoc.id } });
    }
    return { status: 200, body: { ok: true } };
  }

  /**
   * Run the mark-variant-dirty route handler.
   * @param {unknown} request Incoming request object.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleMarkVariantDirty(request) {
    const body = request?.body || {};
    const pageNumber = Number(body.pageNumber);
    const variantName = String(body.variantName || '');
    if (!Number.isInteger(pageNumber) || !variantName) {
      return { status: 400, body: 'Missing pageNumber or variantName' };
    }

    const pageSnap = await db
      .collectionGroup('pages')
      .where('number', '==', pageNumber)
      .limit(1)
      .get();
    if (pageSnap.empty) {
      return { status: 404, body: 'Page not found' };
    }

    const variantSnap = await pageSnap.docs[0].ref
      .collection('variants')
      .where('name', '==', variantName)
      .limit(1)
      .get();
    if (variantSnap.empty) {
      return { status: 404, body: 'Variant not found' };
    }

    await variantSnap.docs[0].ref.update({ dirty: true });
    return { status: 200, body: { ok: true } };
  }

  /**
   * Run stats generation for the seeded fixture.
   * @returns {Promise<{ status: number, body?: unknown }>} Route response.
   */
  async function handleGenerateStats() {
    await generateStatsCore.generate();
    return { status: 200, body: { ok: true } };
  }

  /**
   * Resolve the authenticated user id from a request.
   * @param {unknown} request Incoming request object.
   * @returns {string | null} Authenticated user id or null.
   */
  function resolveUid(request) {
    const header = getAuthorizationHeader(request);
    if (!header) {
      return null;
    }

    return ADMIN_UID;
  }

  /**
   * Resolve a target page number from a page reference-like object.
   * @param {{ path?: string } | null | undefined} targetPage Target page reference.
   * @returns {number | undefined} Target page number when available.
   */
  function resolveTargetPageNumber(targetPage) {
    if (!targetPage || typeof targetPage.path !== 'string') {
      return undefined;
    }

    const match = targetPage.path.match(/\/pages\/(\d+)$/);
    if (!match) {
      return undefined;
    }

    return Number(match[1]);
  }

  /**
   * Find a page document path for a page number.
   * @param {number} pageNumber Page number to look up.
   * @returns {Promise<string | null>} Matching page path or null.
   */
  async function findExistingPagePath(pageNumber) {
    const pageSnap = await db
      .collectionGroup('pages')
      .where('number', '==', pageNumber)
      .limit(1)
      .get();
    if (pageSnap.empty) {
      return null;
    }

    return pageSnap.docs[0].ref.path;
  }

  /**
   * Find an option document path for a submission option.
   * @param {unknown} option Option descriptor.
   * @returns {Promise<string | null>} Matching option path or null.
   */
  async function findExistingOptionPath(option) {
    const typed = parseOptionLookup(option);
    if (!typed) {
      return null;
    }

    const pagePath = await findExistingPagePath(typed.pageNumber);
    if (!pagePath) {
      return null;
    }

    const pageRef = db.doc(pagePath);
    const variantSnap = await pageRef
      .collection('variants')
      .where('name', '==', typed.variantName)
      .limit(1)
      .get();
    if (variantSnap.empty) {
      return null;
    }

    const optionSnap = await variantSnap.docs[0].ref
      .collection('options')
      .where('position', '==', typed.optionNumber)
      .limit(1)
      .get();
    if (optionSnap.empty) {
      return null;
    }

    return optionSnap.docs[0].ref.path;
  }
}

/**
 * Create a local fetch stub for the simulator.
 * @returns {() => Promise<{ ok: boolean, status: number, json: () => Promise<{ access_token: string }>, text: () => Promise<string> }>} Fetch stub.
 */
function createLocalFetchStub() {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => {
      const payload = {};
      Object.defineProperty(payload, 'access_token', {
        value: 'local-access-token',
        enumerable: true,
      });
      return payload;
    },
    text: async () => '',
  });
}

/**
 * Create a local random source without calling Math.random directly.
 * @returns {() => number} Random number generator.
 */
function createRandomSource() {
  return () => {
    const sample = randomUUID().replace(/-/g, '').slice(0, 8);
    const value = Number.parseInt(sample, 16);
    return value / 0xffffffff;
  };
}

/**
 * Build a fake auth result from a token presence check.
 * @param {string | undefined} token Token value.
 * @param {boolean} includeToken Whether to include the token in the response.
 * @returns {{ uid: string | null, token?: string }} Auth result.
 */
function createAuthResult(token, includeToken) {
  if (!token) {
    return { uid: null };
  }

  if (includeToken) {
    return { uid: ADMIN_UID, token };
  }

  return { uid: ADMIN_UID };
}

/**
 * Load moderation options for the simulator response.
 * @param {{ collection: (name: string) => { get: () => Promise<{ docs: Array<{ data: () => { content?: string, position?: number, targetPage?: { path?: string } } }> }> } }} variantRef Variant reference.
 * @returns {Promise<Array<{ content: string | undefined, targetPageNumber: number | undefined }>>} Options.
 */
async function loadModerationOptions(variantRef) {
  const optionsSnap = await variantRef.collection('options').get();
  return optionsSnap.docs
    .slice()
    .sort(
      (left, right) =>
        (left.data().position ?? 0) - (right.data().position ?? 0)
    )
    .map(doc => ({
      content: doc.data().content,
      targetPageNumber: getTargetPageNumber(doc.data().targetPage),
    }));
}

/**
 * Check whether a trigger should receive a record.
 * @param {{ pathPattern: string, eventName: 'onCreate' | 'onWrite' }} trigger Trigger definition.
 * @param {string} pathValue Record path.
 * @param {boolean} isCreate Whether the record is a create event.
 * @param {boolean} isWrite Whether the record is a write event.
 * @returns {boolean} Whether the trigger should run.
 */
function shouldDispatchTrigger(trigger, pathValue, isCreate, isWrite) {
  if (!pathMatchesTrigger(trigger.pathPattern, pathValue)) {
    return false;
  }

  if (trigger.eventName === 'onCreate' && !isCreate) {
    return false;
  }

  if (trigger.eventName === 'onWrite' && !isWrite) {
    return false;
  }

  return true;
}

/**
 * Check whether a path matches a trigger pattern.
 * @param {string} pathPattern Trigger pattern.
 * @param {string} pathValue Actual path.
 * @returns {boolean} Whether the path matches.
 */
function pathMatchesTrigger(pathPattern, pathValue) {
  const patternSegments = String(pathPattern)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/');
  const pathSegments = String(pathValue)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/');
  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (patternSegment.startsWith('{') && patternSegment.endsWith('}')) {
      continue;
    }

    if (patternSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

/**
 * Dispatch a prepared snapshot pair to a trigger.
 * @param {{ eventName: 'onCreate' | 'onWrite', handler: (snapshot: unknown, context: { params: Record<string, string> }) => Promise<void> }} trigger Trigger definition.
 * @param {{ before: unknown, after: unknown }} snapshots Snapshot pair.
 * @param {{ params: Record<string, string> }} context Trigger context.
 * @returns {Promise<void>} Nothing.
 */
async function dispatchTrigger(trigger, snapshots, context) {
  if (trigger.eventName === 'onCreate') {
    await trigger.handler(snapshots.after, context);
    return;
  }

  await trigger.handler(
    {
      before: snapshots.before,
      after: snapshots.after,
    },
    context
  );
}

/**
 * Build the moderation-variant response.
 * @param {{ ref: { parent: { parent: { get: () => Promise<{ data: () => { title?: string }, id: string }> } }, collection: (name: string) => { get: () => Promise<{ docs: Array<{ data: () => { content?: string, position?: number, targetPage?: { path?: string } } }> }> } }, data: () => { authorName?: string, author?: string, content?: string } }} variantSnap Variant snapshot.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function buildModerationVariantResponse(variantSnap) {
  const variantData = variantSnap.data();
  const pageRef = variantSnap.ref.parent.parent;
  const pageSnap = await pageRef.get();
  const storyRef = pageRef.parent.parent;
  const storySnap = await storyRef.get();
  const options = await loadModerationOptions(variantSnap.ref);

  return {
    status: 200,
    body: {
      title: storySnap.data()?.title ?? storySnap.id,
      author: variantData.authorName ?? variantData.author ?? '',
      content: variantData.content ?? '',
      options,
      pageNumber: pageSnap.data()?.number,
    },
  };
}

/**
 * Parse an option lookup input.
 * @param {unknown} option Option descriptor.
 * @returns {{ pageNumber: number, variantName: string, optionNumber: number } | null} Parsed option or null.
 */
function parseOptionLookup(option) {
  if (!option || typeof option !== 'object') {
    return null;
  }

  const typed =
    /** @type {{ pageNumber?: number, variantName?: string, optionNumber?: number }} */ (
      option
    );
  if (!Number.isInteger(typed.pageNumber)) {
    return null;
  }
  if (typeof typed.variantName !== 'string') {
    return null;
  }
  if (!Number.isInteger(typed.optionNumber)) {
    return null;
  }

  return {
    pageNumber: typed.pageNumber,
    variantName: typed.variantName,
    optionNumber: typed.optionNumber,
  };
}

/**
 * Parse moderation approval input.
 * @param {{ isApproved?: unknown } | undefined} body Request body.
 * @returns {boolean | null} Approval flag or null when invalid.
 */
function parseApprovalFlag(body) {
  const rawApproved = body?.isApproved;
  if (
    rawApproved !== true &&
    rawApproved !== false &&
    rawApproved !== 'true' &&
    rawApproved !== 'false'
  ) {
    return null;
  }

  return rawApproved === true || rawApproved === 'true';
}

/**
 * Resolve moderation score/count totals from variant data.
 * @param {{ moderatorReputationSum?: unknown, moderationRatingCount?: unknown } | undefined} data Variant data.
 * @returns {{ currentScore: number, currentCount: number }} Normalized totals.
 */
function resolveModerationTotals(data) {
  let currentScore = 0;
  if (typeof data?.moderatorReputationSum === 'number') {
    currentScore = data.moderatorReputationSum;
  }

  let currentCount = 0;
  if (typeof data?.moderationRatingCount === 'number') {
    currentCount = data.moderationRatingCount;
  }
  return {
    currentScore,
    currentCount,
  };
}

/**
 * Resolve a target page number from a page reference-like object.
 * @param {{ path?: string } | null | undefined} targetPage Target page reference.
 * @returns {number | undefined} Target page number when available.
 */
function getTargetPageNumber(targetPage) {
  if (!targetPage || typeof targetPage.path !== 'string') {
    return undefined;
  }

  const match = targetPage.path.match(/\/pages\/(\d+)$/);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}
