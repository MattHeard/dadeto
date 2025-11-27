import functions from './firebase-functions.js';

export { functions };
export { default as express } from 'express';
export { default as cors } from 'cors';
export { getAuth } from 'firebase-admin/auth';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { ADMIN_UID } from './common-core.js';
export * from './common-gcf.js';
