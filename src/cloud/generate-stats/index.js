import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestoreInstance } from './firestore.js';
import { createGenerateStatsCore } from './core.js';
import { fetchFn } from './gcf.js';

let firebaseInitialized = false;

const ensureFirebaseApp = (initFn = initializeApp) => {
  if (firebaseInitialized) {
    return;
  }

  try {
    initFn();
  } catch (error) {
    const duplicateApp =
      error &&
      (error.code === 'app/duplicate-app' ||
        typeof error.message === 'string') &&
      String(error.message).toLowerCase().includes('already exists');

    if (!duplicateApp) {
      throw error;
    }
  }

  firebaseInitialized = true;
};

const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

const getAllowedOrigins = (environmentVariables) => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return playwrightOrigin ? [playwrightOrigin] : [];
  }

  return productionOrigins;
};

const getProcessEnv = () => process.env;

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const storage = new Storage();

const env = getProcessEnv();

const generateStatsCore = createGenerateStatsCore({
  db,
  auth,
  storage,
  fetchFn,
  env,
  cryptoModule: crypto,
});

const {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
} = generateStatsCore;

const allowedOrigins = getAllowedOrigins(env) ?? [];
const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods: ['POST'],
  })
);

app.post('/', handleRequest);

export const generateStats = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
};
