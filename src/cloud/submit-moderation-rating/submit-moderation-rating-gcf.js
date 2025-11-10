export * as functions from 'firebase-functions/v1';
export { getAuth } from 'firebase-admin/auth';
export { FieldValue } from 'firebase-admin/firestore';
export { default as express } from 'express';
export { default as cors } from 'cors';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { crypto, getEnvironmentVariables } from './common-gcf.js';
