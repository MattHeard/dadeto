import functions from './firebase-functions.js';

export { functions };
export { Storage } from '@google-cloud/storage';
export { getAuth } from 'firebase-admin/auth';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { ADMIN_UID } from './common-core.js';
export { fetchFn, crypto, getEnvironmentVariables } from './common-gcf.js';
