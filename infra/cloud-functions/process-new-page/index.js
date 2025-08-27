import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import crypto from 'crypto';
import { incrementVariantName } from './variantName.js';
import { findAvailablePageNumber } from './findAvailablePageNumber.js';

initializeApp();
const db = getFirestore();

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
    let storyRef = null;
    let pageNumber;
    const batch = db.batch();

    if (incomingOptionFullName) {
      const optionRef = db.doc(incomingOptionFullName);
      const optionSnap = await optionRef.get();
      if (!optionSnap.exists) {
        await snap.ref.update({ processed: true });
        return null;
      }
      variantRef = optionRef.parent.parent;
      const pageRef = variantRef.parent.parent;
      storyRef = pageRef.parent.parent;

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
        pageNumber = await findAvailablePageNumber(db);
        const newPageId = crypto.randomUUID();
        pageDocRef = storyRef.collection('pages').doc(newPageId);
        batch.set(pageDocRef, {
          number: pageNumber,
          incomingOption: incomingOptionFullName,
          createdAt: FieldValue.serverTimestamp(),
        });
        batch.update(optionRef, { targetPage: pageDocRef });
      }
    } else {
      pageNumber = directPageNumber;
      const pageSnap = await db
        .collectionGroup('pages')
        .where('number', '==', pageNumber)
        .limit(1)
        .get();
      if (pageSnap.empty) {
        await snap.ref.update({ processed: true });
        return null;
      }
      pageDocRef = pageSnap.docs[0].ref;
      storyRef = pageDocRef.parent.parent;
    }

    const variantsSnap = await pageDocRef
      .collection('variants')
      .orderBy('name', 'desc')
      .limit(1)
      .get();
    const nextName = variantsSnap.empty
      ? 'a'
      : incrementVariantName(variantsSnap.docs[0].data().name);
    const variantId = snap.id;
    const newVariantRef = pageDocRef.collection('variants').doc(variantId);

    batch.set(newVariantRef, {
      name: nextName,
      content: sub.content,
      authorId: sub.authorId || null,
      authorName: sub.author,
      incomingOption: incomingOptionFullName || null,
      moderatorReputationSum: 0,
      rand: Math.random(),
      createdAt: FieldValue.serverTimestamp(),
    });

    (sub.options || []).forEach((text, position) => {
      const optRef = newVariantRef
        .collection('options')
        .doc(crypto.randomUUID());
      batch.set(optRef, {
        content: text,
        createdAt: FieldValue.serverTimestamp(),
        position,
      });
    });

    batch.set(
      db.doc(`storyStats/${storyRef.id}`),
      { variantCount: FieldValue.increment(1) },
      { merge: true }
    );

    if (variantRef) {
      batch.update(variantRef, { dirty: null });
    }
    batch.update(snap.ref, { processed: true });

    if (sub.authorId) {
      const authorRef = db.doc(`authors/${sub.authorId}`);
      const authorSnap = await authorRef.get();
      if (!authorSnap.exists) {
        batch.set(authorRef, { uuid: crypto.randomUUID() });
      }
    }

    await batch.commit();
    return null;
  });
