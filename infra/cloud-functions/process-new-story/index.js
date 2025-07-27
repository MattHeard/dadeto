import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import crypto from 'crypto';

initializeApp();
const db = getFirestore();

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

    let i = 0;
    let candidate = 1;
    while (true) {
      const max = 2 ** i;
      candidate = Math.floor(Math.random() * max) + 1;
      const snapshot = await db
        .collectionGroup('pages')
        .where('number', '==', candidate)
        .limit(1)
        .get();
      if (snapshot.empty) {
        break;
      }
      i += 1;
    }

    const storyRef = db.doc(`stories/${storyId}`);
    const pageRef = storyRef.collection('pages').doc(pageId);
    const variantRef = pageRef.collection('variants').doc(variantId);

    const batch = db.batch();
    batch.set(storyRef, {
      title: sub.title,
      rootPage: pageRef,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(pageRef, {
      number: candidate,
      incomingOptionId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(variantRef, {
      name: 'a',
      content: sub.content,
      authorId: null,
      incomingOptionId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    sub.options.forEach((text, position) => {
      const optionRef = variantRef
        .collection('options')
        .doc(crypto.randomUUID());
      batch.set(optionRef, {
        content: text,
        targetPageId: null,
        createdAt: FieldValue.serverTimestamp(),
        position,
      });
    });

    batch.set(db.doc(`storyStats/${storyId}`), { variantCount: 1 });
    batch.update(snap.ref, { processed: true });

    await batch.commit();
    return null;
  });
