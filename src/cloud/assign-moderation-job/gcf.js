import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { createVariantsQuery, createReputationScopedQuery } from './core.js';

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
    const variantsQuery = createVariantsQuery(db);
    const reputationScopedQuery = createReputationScopedQuery(
      reputation,
      variantsQuery,
    );
    const orderedQuery = reputationScopedQuery.orderBy('rand', 'asc');
    const filteredQuery = orderedQuery.where('rand', comparator, randomValue);
    const limitedQuery = filteredQuery.limit(1);

    return limitedQuery.get();
  };
}

export const now = () => FieldValue.serverTimestamp();
