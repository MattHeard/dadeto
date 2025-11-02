import {
  functions,
  express,
  cors,
  getAuth,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  crypto,
  getEnvironmentVariables,
} from './submit-moderation-rating-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import {
  createCorsOptions,
  createHandleSubmitModerationRating,
  createSubmitModerationRatingResponder,
} from './submit-moderation-rating-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager();

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const corsOptions = createCorsOptions({ allowedOrigins });

app.use(cors(corsOptions));
app.use(express.json());

const fetchModeratorAssignment = async uid => {
  const moderatorRef = db.collection('moderators').doc(uid);
  const moderatorSnap = await moderatorRef.get();

  if (!moderatorSnap.exists) {
    return null;
  }

  const data = moderatorSnap.data() ?? {};
  const variantRef = data.variant;

  if (!variantRef) {
    return null;
  }

  return {
    variantId: `/${variantRef.path}`,
    clearAssignment: () =>
      moderatorRef.update({ variant: FieldValue.delete() }),
  };
};

const recordModerationRating = async ({
  id,
  moderatorId,
  variantId,
  isApproved,
  ratedAt,
}) =>
  db.collection('moderationRatings').doc(id).set({
    moderatorId,
    variantId,
    isApproved,
    ratedAt,
  });

const submitModerationRatingResponder = createSubmitModerationRatingResponder({
  verifyIdToken: token => auth.verifyIdToken(token),
  fetchModeratorAssignment,
  recordModerationRating,
  randomUUID: () => crypto.randomUUID(),
  getServerTimestamp: () => FieldValue.serverTimestamp(),
});

const handleSubmitModerationRating = createHandleSubmitModerationRating(
  submitModerationRatingResponder
);

app.post('/', handleSubmitModerationRating);

export const submitModerationRating = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleSubmitModerationRating };
