import * as functions from 'firebase-functions';
import crypto from 'crypto';
import { incrementVariantName } from './variantName.js';
import {
  findAvailablePageNumber,
  createPage,
  findPageByNumber,
} from '../services/pages.js';
import {
  createVariant,
  createOption,
  getLastVariantName,
  optionRefFromPath,
  updateOption,
} from '../services/variants.js';
import { createBatch } from '../services/firebase.js';
import { incrementVariantCount } from '../services/stories.js';
import { ensureAuthor } from '../services/authors.js';

export const processNewPage = functions
  .region('europe-west1')
  .firestore.document('pageFormSubmissions/{subId}')
  .onCreate(async snap => {
    const sub = snap.data();
    if (sub.processed) {
      return null;
    }

    const incomingOptionFullName = sub.incomingOptionFullName;
    const directPageNumber = sub.pageNumber;
    if (!incomingOptionFullName && !Number.isInteger(directPageNumber)) {
      await snap.ref.update({ processed: true });
      return null;
    }

    let variantRef = null;
    let pageDocRef = null;
    let storyRefDoc = null;
    let pageNumber;
    const batch = createBatch();

    if (incomingOptionFullName) {
      const optionRef = optionRefFromPath(incomingOptionFullName);
      const optionSnap = await optionRef.get();
      if (!optionSnap.exists) {
        await snap.ref.update({ processed: true });
        return null;
      }
      variantRef = optionRef.parent.parent;
      const pageRefDoc = variantRef.parent.parent;
      storyRefDoc = pageRefDoc.parent.parent;

      const optionData = optionSnap.data();
      pageDocRef = optionData.targetPage;
      if (pageDocRef) {
        try {
          const existingPageSnap = await pageDocRef.get();
          if (existingPageSnap.exists) {
            pageNumber = existingPageSnap.data().number;
          } else {
            pageDocRef = null;
          }
        } catch {
          pageDocRef = null;
        }
      }

      if (!pageDocRef) {
        pageNumber = await findAvailablePageNumber();
        const newPageId = crypto.randomUUID();
        pageDocRef = createPage(batch, storyRefDoc.id, newPageId, {
          number: pageNumber,
          incomingOption: incomingOptionFullName,
        });
        updateOption(batch, optionRef, { targetPage: pageDocRef });
      }
    } else {
      pageNumber = directPageNumber;
      const pageSnap = await findPageByNumber(pageNumber);
      if (pageSnap.empty) {
        await snap.ref.update({ processed: true });
        return null;
      }
      pageDocRef = pageSnap.docs[0].ref;
      storyRefDoc = pageDocRef.parent.parent;
    }

    const variantsSnap = await getLastVariantName(pageDocRef);
    const nextName = variantsSnap.empty
      ? 'a'
      : incrementVariantName(variantsSnap.docs[0].data().name);
    const variantId = snap.id;
    const newVariantRef = createVariant(batch, pageDocRef, variantId, {
      name: nextName,
      content: sub.content,
      authorId: sub.authorId || null,
      authorName: sub.author,
      incomingOption: incomingOptionFullName || null,
      moderatorReputationSum: 0,
      rand: Math.random(),
    });

    (sub.options || []).forEach((text, position) => {
      createOption(batch, newVariantRef, crypto.randomUUID(), {
        content: text,
        position,
      });
    });

    incrementVariantCount(batch, storyRefDoc.id);

    if (variantRef) {
      batch.update(variantRef, { dirty: null });
    }
    batch.update(snap.ref, { processed: true });

    if (sub.authorId) {
      await ensureAuthor(batch, sub.authorId);
    }

    await batch.commit();
    return null;
  });
