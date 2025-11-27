import functions from 'firebase-functions/v1';

export { functions };
export { default as express } from 'express';
export { default as cors } from 'cors';
export { FieldValue } from 'firebase-admin/firestore';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { getEnvironmentVariables } from './common-gcf.js';
