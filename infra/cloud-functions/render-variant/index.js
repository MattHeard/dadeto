import crypto from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { buildAltsHtml } from './buildAltsHtml.js';
import { buildHtml } from './buildHtml.js';
import { getVisibleVariants, VISIBILITY_THRESHOLD } from './visibility.js';

initializeApp();
const storage = new Storage();
const db = getFirestore();

// keep defaults so you don't need infra changes today
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const URL_MAP = process.env.URL_MAP || 'prod-dendrite-url-map';
const CDN_HOST = process.env.CDN_HOST || 'www.dendritestories.co.nz';

/**
 *
 */
async function getAccessTokenFromMetadata() {
  const r = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!r.ok) throw new Error(`metadata token: HTTP ${r.status}`);
  const { access_token } = await r.json();
  return access_token;
}

/**
 *
 * @param paths
 */
async function invalidatePaths(paths) {
  const token = await getAccessTokenFromMetadata();
  await Promise.all(
    paths.map(async path => {
      try {
        const res = await fetch(
          `https://compute.googleapis.com/compute/v1/projects/${PROJECT}/global/urlMaps/${URL_MAP}/invalidateCache`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: CDN_HOST,
              path,
              requestId: crypto.randomUUID(),
            }),
          }
        );
        if (!res.ok) {
          console.error(`invalidate ${path} failed: ${res.status}`);
        }
      } catch (e) {
        console.error(`invalidate ${path} error`, e?.message || e);
      }
    })
  );
}

/**
 * Render a variant when it is created, marked dirty, or its visibility
 * crosses upwards past the threshold.
 */
export const renderVariant = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(async (change, ctx) => {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data() || {};
    if (Object.prototype.hasOwnProperty.call(data, 'dirty')) {
      await render(change.after, ctx);
      await change.after.ref.update({ dirty: FieldValue.delete() });
      return null;
    }

    if (!change.before.exists) {
      return render(change.after, ctx);
    }

    const beforeVis = change.before.data().visibility ?? 0;
    const afterVis = data.visibility ?? 0;
    if (beforeVis < VISIBILITY_THRESHOLD && afterVis >= VISIBILITY_THRESHOLD) {
      return render(change.after, ctx);
    }

    return null;
  });

/**
 *
 * @param snap
 * @param ctx
 */
async function render(snap, ctx) {
  const variant = snap.data();

  const pageSnap = await snap.ref.parent.parent.get();
  if (!pageSnap.exists) {
    return null;
  }
  const page = pageSnap.data();

  const docName = `/${snap.ref.path}`;

  const optionsSnap = await snap.ref.collection('options').get();
  const optionsData = optionsSnap.docs
    .map(doc => doc.data())
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const options = await Promise.all(
    optionsData.map(async data => {
      let targetPageNumber;
      let targetVariantName;
      if (data.targetPage) {
        try {
          const targetSnap = await data.targetPage.get();
          if (targetSnap.exists) {
            targetPageNumber = targetSnap.data().number;
            const variantSnap = await data.targetPage
              .collection('variants')
              .orderBy('name')
              .limit(1)
              .get();
            if (!variantSnap.empty) {
              targetVariantName = variantSnap.docs[0].data().name;
            }
          }
        } catch (e) {
          console.error('target page lookup failed', e?.message || e);
        }
      } else if (data.targetPageNumber !== undefined) {
        targetPageNumber = data.targetPageNumber;
      }
      return {
        content: data.content || '',
        position: data.position ?? 0,
        ...(targetPageNumber !== undefined && { targetPageNumber }),
        ...(targetVariantName && { targetVariantName }),
      };
    })
  );
  const storyRef = pageSnap.ref.parent.parent;
  const storySnap = await storyRef.get();
  let storyTitle = '';
  let firstPageUrl;
  if (storySnap.exists) {
    const storyData = storySnap.data();
    if (!page.incomingOption) {
      storyTitle = storyData.title || '';
    } else if (storyData.rootPage) {
      try {
        const rootPageSnap = await storyData.rootPage.get();
        if (rootPageSnap.exists) {
          const rootVariantSnap = await storyData.rootPage
            .collection('variants')
            .orderBy('name')
            .limit(1)
            .get();
          if (!rootVariantSnap.empty) {
            firstPageUrl = `/p/${rootPageSnap.data().number}${rootVariantSnap.docs[0].data().name}.html`;
          }
        }
      } catch (e) {
        console.error('root page lookup failed', e?.message || e);
      }
    }
  }

  const authorName = variant.authorName || variant.author || '';
  let parentUrl;
  let incomingOptionSlug;
  if (variant.incomingOption) {
    try {
      const optionRef = db.doc(variant.incomingOption);
      const parentVariantRef = optionRef.parent.parent;
      const parentPageRef = parentVariantRef.parent.parent;

      const [optionSnap, parentVariantSnap, parentPageSnap] = await Promise.all(
        [optionRef.get(), parentVariantRef.get(), parentPageRef.get()]
      );

      if (parentVariantSnap.exists && parentPageSnap.exists) {
        const parentName = parentVariantSnap.data().name;
        if (parentName) {
          const parentNumber = parentPageSnap.data().number;
          parentUrl = `/p/${parentNumber}${parentName}.html`;
          if (optionSnap.exists) {
            const position = optionSnap.data().position;
            if (position !== undefined) {
              incomingOptionSlug = `${parentNumber}-${parentName}-${position}`;
            }
          }
        }
      }
    } catch (e) {
      console.error('parent lookup failed', e?.message || e);
    }
  }

  const html = buildHtml(
    page.number,
    variant.name,
    variant.content,
    options,
    storyTitle,
    authorName,
    parentUrl,
    firstPageUrl,
    incomingOptionSlug
  );
  const filePath = `p/${page.number}${variant.name}.html`;
  const openVariant = options.some(opt => opt.targetPageNumber === undefined);

  await storage
    .bucket('www.dendritestories.co.nz')
    .file(filePath)
    .save(html, {
      contentType: 'text/html',
      ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
    });

  const variantsSnap = await snap.ref.parent.get();
  const variants = getVisibleVariants(variantsSnap.docs);
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;

  await storage
    .bucket('www.dendritestories.co.nz')
    .file(altsPath)
    .save(altsHtml, { contentType: 'text/html' });

  const pendingName = variant.incomingOption
    ? ctx.params.variantId
    : ctx.params.storyId;
  const pendingPath = `pending/${pendingName}.json`;
  await storage
    .bucket('www.dendritestories.co.nz')
    .file(pendingPath)
    .save(JSON.stringify({ path: filePath }), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-store' }, // 🔑 stop both positive *and* negative caching
    });

  const paths = [`/${altsPath}`, `/${filePath}`];

  if (parentUrl) {
    paths.push(parentUrl);
  }

  await invalidatePaths(paths);
  return null;
}

export { buildAltsHtml, buildHtml, render };
