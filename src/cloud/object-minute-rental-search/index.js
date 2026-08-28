import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createSearchHttpHandler } from '../../core/object-minute-rental-search/search-http.js';

const app = initializeApp();
const db = getAdminFirestore(app, process.env.DATABASE_ID ?? '(default)');

const handle = createSearchHttpHandler({ db });

export { handle, createSearchHttpHandler };
