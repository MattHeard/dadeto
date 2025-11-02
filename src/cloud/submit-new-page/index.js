import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  getAuth,
  express,
  cors,
  crypto,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './submit-new-page-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import { createHandleSubmit } from './submit-new-page-core.js';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from './helpers.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);

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

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const handleSubmitCore = createHandleSubmit({
  verifyIdToken: token => auth.verifyIdToken(token),
  saveSubmission: (id, data) =>
    db.collection('pageFormSubmissions').doc(id).set(data),
  randomUUID: () => crypto.randomUUID(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  parseIncomingOption,
  findExistingOption: parsed => findExistingOption(db, parsed),
  findExistingPage: pageNumber => findExistingPage(db, pageNumber),
});

/**
 * Handle POST submissions for the submit new page endpoint.
 * @param {import('express').Request} req Incoming Express request containing the submission payload.
 * @param {import('express').Response} res Express response instance used to return the status and body.
 */
async function handleSubmit(req, res) {
  const { status, body } = await handleSubmitCore(req);
  res.status(status).json(body);
}

app.post('/', handleSubmit);

export const submitNewPage = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleSubmit };
