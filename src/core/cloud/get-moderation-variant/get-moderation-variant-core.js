import { productionOrigins } from './cloud-core.js';
import { isAllowedOrigin as coreIsAllowedOrigin } from './cors.js';

export { productionOrigins, coreIsAllowedOrigin as isAllowedOrigin };

const MISSING_AUTHORIZATION_RESPONSE = {
  status: 401,
  body: 'Missing or invalid Authorization header',
};

const INVALID_TOKEN_RESPONSE = {
  status: 401,
  body: 'Invalid or expired token',
};

const NO_JOB_RESPONSE = { status: 404, body: 'No moderation job' };
const VARIANT_NOT_FOUND_RESPONSE = { status: 404, body: 'Variant not found' };

function assertFirestoreInstance(db) {
  if (!db || typeof db.collection !== 'function') {
    throw new TypeError('db must provide a collection method');
  }
}

function assertAuthInstance(auth) {
  if (!auth || typeof auth.verifyIdToken !== 'function') {
    throw new TypeError('auth.verifyIdToken must be a function');
  }
}

function normalizeString(value) {
  return typeof value === 'string' ? value : '';
}

function parseAuthorizationHeader(authHeader) {
  if (typeof authHeader !== 'string') {
    return null;
  }

  const match = authHeader.match(/^Bearer (.+)$/);

  return match ? match[1] : null;
}

function getAuthorizationHeader(request) {
  if (request && typeof request.get === 'function') {
    const header = request.get('Authorization') ?? request.get('authorization');

    if (typeof header === 'string') {
      return header;
    }
  }

  const headers = request?.headers;
  if (headers && typeof headers === 'object') {
    const header = headers.authorization ?? headers.Authorization;

    if (Array.isArray(header)) {
      return header[0] ?? null;
    }

    if (typeof header === 'string') {
      return header;
    }
  }

  return null;
}

async function fetchVariantSnapshot(db, uid) {
  const moderatorSnap = await db.collection('moderators').doc(uid).get();

  if (!moderatorSnap.exists) {
    return null;
  }

  const moderatorData = moderatorSnap.data();
  const variantRef = moderatorData?.variant;

  if (!variantRef) {
    return null;
  }

  const variantSnap = await variantRef.get();

  if (!variantSnap.exists) {
    return VARIANT_NOT_FOUND_RESPONSE;
  }

  return { variantSnap, variantRef };
}

async function fetchStoryTitle(variantRef) {
  const pageRef = variantRef.parent?.parent;
  const pageSnap = pageRef ? await pageRef.get() : null;

  if (!pageSnap?.exists) {
    return '';
  }

  const storyRef = pageSnap.ref.parent?.parent;
  const storySnap = storyRef ? await storyRef.get() : null;

  if (!storySnap?.exists) {
    return '';
  }

  const storyData = storySnap.data();

  return normalizeString(storyData?.title);
}

function mapOptionDoc(doc) {
  const data = doc.data() ?? {};
  const content = normalizeString(data.content);
  const { targetPageNumber } = data;

  if (targetPageNumber !== undefined) {
    return {
      content,
      targetPageNumber,
    };
  }

  return { content };
}

function buildOptions(variantRef) {
  return variantRef
    .collection('options')
    .get()
    .then(snapshot => snapshot.docs.map(mapOptionDoc));
}

export function getAllowedOrigins(environmentVariables) {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return playwrightOrigin ? [playwrightOrigin] : [];
  }

  return productionOrigins;
}

export function createHandleCorsOrigin(isAllowedOrigin, origins) {
  return (origin, cb) => {
    if (isAllowedOrigin(origin, origins)) {
      cb(null, true);
    } else {
      cb(new Error('CORS'));
    }
  };
}

export function createCorsOptions(handleCorsOrigin) {
  return {
    origin: handleCorsOrigin,
    methods: ['GET'],
  };
}

export function createGetModerationVariantResponder({ db, auth }) {
  assertFirestoreInstance(db);
  assertAuthInstance(auth);

  return async function respond(request) {
    const authHeader = getAuthorizationHeader(request);
    const token = parseAuthorizationHeader(authHeader);

    if (!token) {
      return MISSING_AUTHORIZATION_RESPONSE;
    }

    let uid;

    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded?.uid;
    } catch (error) {
      return {
        ...INVALID_TOKEN_RESPONSE,
        body: normalizeString(error?.message) || INVALID_TOKEN_RESPONSE.body,
      };
    }

    if (!uid) {
      return INVALID_TOKEN_RESPONSE;
    }

    const variantSnapshot = await fetchVariantSnapshot(db, uid);

    if (!variantSnapshot) {
      return NO_JOB_RESPONSE;
    }

    if ('status' in variantSnapshot) {
      return variantSnapshot;
    }

    const { variantSnap, variantRef } = variantSnapshot;
    const variantData = variantSnap.data() ?? {};

    const [storyTitle, options] = await Promise.all([
      fetchStoryTitle(variantRef),
      buildOptions(variantRef),
    ]);

    return {
      status: 200,
      body: {
        title: storyTitle,
        content: normalizeString(variantData.content),
        author: normalizeString(variantData.author),
        options,
      },
    };
  };
}
