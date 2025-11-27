import functions from './firebase-functions.js';

export { Storage } from '@google-cloud/storage';
export { functions };
export { default as express } from 'express';
export { default as cors } from 'cors';
export { initializeApp } from 'firebase-admin/app';
export { getAuth } from 'firebase-admin/auth';
export { getFirestore } from 'firebase-admin/firestore';
export * from './common-gcf.js';
