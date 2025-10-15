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
