import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './report-for-moderation-gcf.js';
import {
  createCorsOptions,
  createHandleReportForModeration,
  createReportForModerationHandler,
} from './report-for-moderation-core.js';
import { getAllowedOrigins } from './cors-config.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();

const db = getFirestoreInstance();
const moderationReportsCollection = db.collection('moderationReports');
const reportForModerationHandler = createReportForModerationHandler({
  addModerationReport: moderationReportsCollection.add.bind(
    moderationReportsCollection
  ),
  getServerTimestamp: FieldValue.serverTimestamp,
});

const handleReportForModeration = createHandleReportForModeration(
  reportForModerationHandler
);

const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const corsOptions = createCorsOptions({ allowedOrigins, methods: ['POST'] });

app.use(cors(corsOptions));
app.use(express.json());
app.all('/', handleReportForModeration);

export const reportForModeration = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleReportForModeration };
