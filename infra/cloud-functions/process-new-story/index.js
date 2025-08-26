import * as functions from 'firebase-functions';
import crypto from 'crypto';
import { createBatch } from '../services/firebase.js';
import { findAvailablePageNumber, createPage } from '../services/pages.js';
import { createStory, setStoryStats } from '../services/stories.js';
import { createVariant, createOption } from '../services/variants.js';
import { ensureAuthor } from '../services/authors.js';

export const processNewStory = functions
  .region('europe-west1')
  .firestore.document('storyFormSubmissions/{subId}')
  .onCreate(async (snap, ctx) => {
    const sub = snap.data();
    if (sub.processed) {
      return null;
    }

    const storyId = ctx.params.subId;
    const pageId = crypto.randomUUID();
    const variantId = crypto.randomUUID();

    const pageNumber = await findAvailablePageNumber();

    const batch = createBatch();
    const pageRef = createPage(batch, storyId, pageId, {
      number: pageNumber,
      incomingOption: null,
    });
    createStory(batch, storyId, { title: sub.title, rootPage: pageRef });
    const variantRef = createVariant(batch, pageRef, variantId, {
      name: 'a',
      content: sub.content,
      authorId: sub.authorId || null,
      authorName: sub.author,
      moderatorReputationSum: 0,
      rand: Math.random(),
    });

    sub.options.forEach((text, position) => {
      createOption(batch, variantRef, crypto.randomUUID(), {
        content: text,
        position,
      });
    });

    setStoryStats(batch, storyId, { variantCount: 1 });
    batch.update(snap.ref, { processed: true });

    if (sub.authorId) {
      await ensureAuthor(batch, sub.authorId);
    }

    await batch.commit();
    return null;
  });
