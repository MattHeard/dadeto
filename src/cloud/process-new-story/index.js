import { randomUUID } from 'node:crypto';
import {
  functions,
  FieldValue,
  getFirestoreInstance,
} from './process-new-story-gcf.js';
import { createProcessNewStoryHandle } from '../../core/cloud/process-new-story/process-new-story-core.js';

const handle = createProcessNewStoryHandle({
  functions,
  getFirestoreInstance,
  fieldValue: FieldValue,
  randomUUID,
  random: Math.random,
});

export { handle };
