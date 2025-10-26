import { DEFAULT_BUCKET_NAME } from './cloud-core.js';
import { buildAltsHtml, escapeHtml } from './buildAltsHtml.js';
import { buildHtml } from './buildHtml.js';
import { getVisibleVariants, VISIBILITY_THRESHOLD } from './visibility.js';

export { DEFAULT_BUCKET_NAME } from './cloud-core.js';

function assertDb(db) {
  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must provide a doc helper');
  }
}

function assertStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

function createInvalidatePaths({
  fetchFn,
  projectId,
  urlMapName,
  cdnHost,
  randomUUID,
  consoleError,
}) {
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const host = cdnHost || 'www.dendritestories.co.nz';
  const urlMap = urlMapName || 'prod-dendrite-url-map';

  async function getAccessToken() {
    const response = await fetchFn(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );

    if (!response.ok) {
      throw new Error(`metadata token: HTTP ${response.status}`);
    }

    const { access_token: accessToken } = await response.json();

    return accessToken;
  }

  return async function invalidatePaths(paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
      return;
    }

    const token = await getAccessToken();
    const url = `https://compute.googleapis.com/compute/v1/projects/${
      projectId || ''
    }/global/urlMaps/${urlMap}/invalidateCache`;

    await Promise.all(
      paths.map(async path => {
        try {
          const response = await fetchFn(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host,
              path,
              requestId: randomUUID(),
            }),
          });

          if (!response.ok && consoleError) {
            consoleError(`invalidate ${path} failed: ${response.status}`);
          }
        } catch (error) {
          if (consoleError) {
            consoleError(`invalidate ${path} error`, error?.message || error);
          }
        }
      })
    );
  };
}

async function buildOptionMetadata({
  data,
  visibilityThreshold,
  db,
  consoleError,
}) {
  let targetPageNumber;
  let targetVariantName;
  let targetVariants;

  if (data.targetPage) {
    try {
      const targetSnap = await data.targetPage.get();

      if (targetSnap.exists) {
        targetPageNumber = targetSnap.data().number;
        const variantSnap = await data.targetPage
          .collection('variants')
          .orderBy('name')
          .get();
        const visible = variantSnap.docs.filter(
          doc => (doc.data().visibility ?? 1) >= visibilityThreshold
        );

        if (visible.length) {
          targetVariantName = visible[0].data().name;
          targetVariants = visible.map(doc => ({
            name: doc.data().name,
            weight: doc.data().visibility ?? 1,
          }));
        }
      }
    } catch (error) {
      if (consoleError) {
        consoleError('target page lookup failed', error?.message || error);
      }
    }
  } else if (data.targetPageNumber !== undefined) {
    targetPageNumber = data.targetPageNumber;
  }

  return {
    content: data.content || '',
    position: data.position ?? 0,
    ...(targetPageNumber !== undefined && { targetPageNumber }),
    ...(targetVariantName && { targetVariantName }),
    ...(targetVariants && { targetVariants }),
  };
}

async function loadOptions({ snap, visibilityThreshold, db, consoleError }) {
  const optionsSnap = await snap.ref.collection('options').get();
  const optionsData = optionsSnap.docs
    .map(doc => doc.data())
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return Promise.all(
    optionsData.map(data =>
      buildOptionMetadata({
        data,
        visibilityThreshold,
        db,
        consoleError,
      })
    )
  );
}

async function resolveStoryMetadata({ pageSnap, page, consoleError }) {
  const storyRef = pageSnap.ref.parent?.parent;

  if (!storyRef) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storySnap = await storyRef.get();

  if (!storySnap.exists) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storyData = storySnap.data() || {};
  const storyTitle = storyData.title || '';
  let firstPageUrl;

  if (page.incomingOption && storyData.rootPage) {
    try {
      const rootPageSnap = await storyData.rootPage.get();

      if (rootPageSnap.exists) {
        const rootVariantSnap = await storyData.rootPage
          .collection('variants')
          .orderBy('name')
          .limit(1)
          .get();

        if (!rootVariantSnap.empty) {
          firstPageUrl = `/p/${rootPageSnap.data().number}${
            rootVariantSnap.docs[0].data().name
          }.html`;
        }
      }
    } catch (error) {
      if (consoleError) {
        consoleError('root page lookup failed', error?.message || error);
      }
    }
  }

  return { storyTitle, firstPageUrl };
}

async function resolveAuthorMetadata({ variant, db, bucket, consoleError }) {
  const authorName = variant.authorName || variant.author || '';

  if (!variant.authorId || !authorName) {
    return { authorName, authorUrl: undefined };
  }

  try {
    const authorRef = db.doc(`authors/${variant.authorId}`);
    const authorSnap = await authorRef.get();

    if (!authorSnap.exists) {
      return { authorName, authorUrl: undefined };
    }

    const { uuid } = authorSnap.data() || {};

    if (!uuid) {
      return { authorName, authorUrl: undefined };
    }

    const authorPath = `a/${uuid}.html`;
    const file = bucket.file(authorPath);
    const [exists] = await file.exists();

    if (!exists) {
      const authorHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite - ${escapeHtml(
        authorName
      )}</title><link rel="icon" href="/favicon.ico" /><link rel="stylesheet" href="/dendrite.css" /></head><body><main><h1>${escapeHtml(
        authorName
      )}</h1></main></body></html>`;
      await file.save(authorHtml, { contentType: 'text/html' });
    }

    return { authorName, authorUrl: `/${authorPath}` };
  } catch (error) {
    if (consoleError) {
      consoleError('author lookup failed', error?.message || error);
    }

    return { authorName, authorUrl: undefined };
  }
}

async function resolveParentUrl({ variant, db, consoleError }) {
  if (!variant.incomingOption) {
    return undefined;
  }

  try {
    const optionRef = db.doc(variant.incomingOption);
    const parentVariantRef = optionRef.parent?.parent;
    const parentPageRef = parentVariantRef?.parent?.parent;

    if (!parentVariantRef || !parentPageRef) {
      return undefined;
    }

    const [parentVariantSnap, parentPageSnap] = await Promise.all([
      parentVariantRef.get(),
      parentPageRef.get(),
    ]);

    if (!parentVariantSnap.exists || !parentPageSnap.exists) {
      return undefined;
    }

    const parentName = parentVariantSnap.data().name;
    const parentNumber = parentPageSnap.data().number;

    if (!parentName || parentNumber === undefined) {
      return undefined;
    }

    return `/p/${parentNumber}${parentName}.html`;
  } catch (error) {
    if (consoleError) {
      consoleError('parent lookup failed', error?.message || error);
    }

    return undefined;
  }
}

export function createRenderVariant({
  db,
  storage,
  fetchFn,
  randomUUID,
  projectId,
  urlMapName,
  cdnHost,
  consoleError = console.error,
  bucketName = DEFAULT_BUCKET_NAME,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertDb(db);
  assertStorage(storage);
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const bucket = storage.bucket(bucketName);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError,
  });

  return async function render(snap, context = {}) {
    if (snap && 'exists' in snap && !snap.exists) {
      return null;
    }

    const variant = snap.data() || {};
    const pageSnap = await snap.ref.parent?.parent?.get();

    if (!pageSnap?.exists) {
      return null;
    }

    const page = pageSnap.data() || {};
    const options = await loadOptions({
      snap,
      visibilityThreshold,
      db,
      consoleError,
    });
    const { storyTitle, firstPageUrl } = await resolveStoryMetadata({
      pageSnap,
      page,
      consoleError,
    });
    const { authorName, authorUrl } = await resolveAuthorMetadata({
      variant,
      db,
      bucket,
      consoleError,
    });
    const parentUrl = await resolveParentUrl({ variant, db, consoleError });

    const html = buildHtml(
      page.number,
      variant.name,
      variant.content,
      options,
      storyTitle,
      authorName,
      authorUrl,
      parentUrl,
      firstPageUrl,
      !page.incomingOption
    );
    const filePath = `p/${page.number}${variant.name}.html`;
    const openVariant = options.some(option => option.targetPageNumber === undefined);

    await bucket
      .file(filePath)
      .save(html, {
        contentType: 'text/html',
        ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
      });

    const variantsSnap = await snap.ref.parent.get();
    const variants = getVisibleVariants(variantsSnap.docs);
    const altsHtml = buildAltsHtml(page.number, variants);
    const altsPath = `p/${page.number}-alts.html`;

    await bucket.file(altsPath).save(altsHtml, { contentType: 'text/html' });

    const pendingName = variant.incomingOption
      ? context?.params?.variantId
      : context?.params?.storyId;
    const pendingPath = `pending/${pendingName}.json`;

    await bucket.file(pendingPath).save(JSON.stringify({ path: filePath }), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-store' },
    });

    const paths = [`/${altsPath}`, `/${filePath}`];

    if (parentUrl) {
      paths.push(parentUrl);
    }

    await invalidatePaths(paths);
    return null;
  };
}

export function createHandleVariantWrite({
  renderVariant,
  getDeleteSentinel,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertFunction(renderVariant, 'renderVariant');
  assertFunction(getDeleteSentinel, 'getDeleteSentinel');

  return async function handleVariantWrite(change, context = {}) {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data() || {};

    if (Object.prototype.hasOwnProperty.call(data, 'dirty')) {
      await renderVariant(change.after, context);
      await change.after.ref.update({ dirty: getDeleteSentinel() });
      return null;
    }

    if (!change.before.exists) {
      return renderVariant(change.after, context);
    }

    const beforeVisibility = change.before.data().visibility ?? 0;
    const afterVisibility = data.visibility ?? 0;

    if (
      beforeVisibility < visibilityThreshold &&
      afterVisibility >= visibilityThreshold
    ) {
      return renderVariant(change.after, context);
    }

    return null;
  };
}

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
