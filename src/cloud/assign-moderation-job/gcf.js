import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import express from 'express';

/**
 * Initialize Firebase Admin and supporting services.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }}
 * Firebase resources required by the moderation workflow.
 */
export function initializeFirebaseAppResources() {
  initializeApp();

  return {
    db: getFirestore(),
    auth: getAuth(),
    app: express(),
  };
}
