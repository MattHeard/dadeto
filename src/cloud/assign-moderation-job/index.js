import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';
import {
  createAssignModerationJob,
  createCorsOptions,
  configureUrlencodedBodyParser,
  getAllowedOrigins,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';
import { ensureFirebaseApp } from '../firebaseApp.js';
import { getFirestoreInstance } from '../firestore.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const corsOptions = createCorsOptions(
  getAllowedOrigins,
  gcf.getEnvironmentVariables
);

app.use(cors(corsOptions));
configureUrlencodedBodyParser(app, express);

const firebaseResources = { db, auth, app };

setupAssignModerationJobRoute(firebaseResources, gcf);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);
