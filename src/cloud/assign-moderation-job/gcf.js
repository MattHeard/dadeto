import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';

/**
 * Initialize Firebase Admin and supporting services.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }}
 * Firebase resources required by the moderation workflow.
 */
export function initializeFirebaseAppResources() {
  const db = getFirestoreInstance();
  ensureFirebaseApp();

  return {
    db,
    auth: getAuth(),
    app: express(),
  };
}

/**
 * Build a Firestore query executor for selecting variants.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @returns {(options: { reputation: string, comparator: import('firebase-admin/firestore').WhereFilterOp, randomValue: number }) => Promise<import('firebase-admin/firestore').QuerySnapshot>}
 * Function that executes the variant selection query.
 */
export function createRunVariantQuery(db) {
  return function runVariantQuery({ reputation, comparator, randomValue }) {
    let query = db.collectionGroup('variants');

    if (reputation === 'zeroRated') {
      query = query.where('moderatorReputationSum', '==', 0);
    }

    query = query
      .orderBy('rand', 'asc')
      .where('rand', comparator, randomValue)
      .limit(1);

    return query.get();
  };
}
