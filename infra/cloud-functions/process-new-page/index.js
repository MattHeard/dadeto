import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import crypto from 'crypto';

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

    const incomingOptionId = sub.incomingOptionId;
    if (!incomingOptionId) {
      await snap.ref.update({ processed: true });
      return null;
    }

    const optionSnap = await db
      .collectionGroup('options')
      .where(FieldPath.documentId(), '==', incomingOptionId)
      .limit(1)
      .get();
    if (optionSnap.empty) {
      await snap.ref.update({ processed: true });
      return null;
    }

    const optionRef = optionSnap.docs[0].ref;
    const variantRef = optionRef.parent.parent;
    const pageRef = variantRef.parent.parent;
    const storyRef = pageRef.parent.parent;

    let i = 0;
    let candidate = 1;
    while (true) {
      const max = 2 ** i;
      candidate = Math.floor(Math.random() * max) + 1;
      const existing = await db
        .collectionGroup('pages')
        .where('number', '==', candidate)
        .limit(1)
        .get();
      if (existing.empty) {
        break;
      }
      i += 1;
    }

    const newPageId = crypto.randomUUID();
    const variantId = crypto.randomUUID();
    const newPageRef = storyRef.collection('pages').doc(newPageId);
    const newVariantRef = newPageRef.collection('variants').doc(variantId);

    const batch = db.batch();
    batch.set(newPageRef, {
      number: candidate,
      incomingOptionId,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(newVariantRef, {
      name: 'a',
      content: sub.content,
      authorId: null,
      incomingOptionId,
      createdAt: FieldValue.serverTimestamp(),
    });

    (sub.options || []).forEach((text, position) => {
      const optRef = newVariantRef
        .collection('options')
        .doc(crypto.randomUUID());
      batch.set(optRef, {
        content: text,
        targetPageId: null,
        createdAt: FieldValue.serverTimestamp(),
        position,
      });
    });

    batch.update(optionRef, { targetPageId: newPageId });
    batch.update(snap.ref, { processed: true });

    await batch.commit();
    return null;
  });
