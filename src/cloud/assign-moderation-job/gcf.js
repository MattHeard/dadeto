import { FieldValue } from 'firebase-admin/firestore';
import { createReputationScopedVariantsQuery } from './core.js';

/**
 * Build a Firestore query executor for selecting variants.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @returns {(options: { reputation: string, comparator: import('firebase-admin/firestore').WhereFilterOp, randomValue: number }) => Promise<import('firebase-admin/firestore').QuerySnapshot>}
 * Function that executes the variant selection query.
 */
export function createRunVariantQuery(db) {
  return function runVariantQuery({ reputation, comparator, randomValue }) {
    const reputationScopedQuery = createReputationScopedVariantsQuery(
      db,
      reputation,
    );
    const orderedQuery = reputationScopedQuery.orderBy('rand', 'asc');
    const filteredQuery = orderedQuery.where('rand', comparator, randomValue);
    const limitedQuery = filteredQuery.limit(1);

    return limitedQuery.get();
  };
}

export const now = () => FieldValue.serverTimestamp();

/**
 * Retrieve the current environment variables for the Cloud Function.
 * @returns {NodeJS.ProcessEnv} Environment variables exposed to the function.
 */
export function getEnvironmentVariables() {
  return process.env;
}
