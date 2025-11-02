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
} from './submit-new-story-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import {
  createCorsOptions,
  createCorsErrorHandler,
  createHandleSubmitNewStory,
  createSubmitNewStoryResponder,
} from './submit-new-story-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager();

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const corsOptions = createCorsOptions({ allowedOrigins });

app.use(cors(corsOptions));
app.use(createCorsErrorHandler());
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const submitNewStoryResponder = createSubmitNewStoryResponder({
  verifyIdToken: token => auth.verifyIdToken(token),
  saveSubmission: (id, data) =>
    db.collection('storyFormSubmissions').doc(id).set(data),
  randomUUID: () => crypto.randomUUID(),
  getServerTimestamp: () => FieldValue.serverTimestamp(),
});

const handleSubmitNewStory = createHandleSubmitNewStory(
  submitNewStoryResponder
);

app.post('/', handleSubmitNewStory);

export const submitNewStory = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleSubmitNewStory, app };
