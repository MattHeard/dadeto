import { randomUUID } from 'node:crypto';
import {
  functions,
  FieldValue,
  getFirestoreInstance,
} from './process-new-story-gcf.js';
import { createProcessNewStoryHandler } from './process-new-story-core.js';

const db = getFirestoreInstance();

const handleProcessNewStory = createProcessNewStoryHandler({
  db,
  fieldValue: FieldValue,
  randomUUID,
  random: Math.random,
});

export const processNewStory = functions
  .region('europe-west1')
  .firestore.document('storyFormSubmissions/{subId}')
  .onCreate((snap, context) => handleProcessNewStory(snap, context));

export { handleProcessNewStory };
