import {
  Storage,
  FieldValue,
  functions,
  getFirestoreInstance,
} from './render-author-gcf.js';
import { runRenderAuthor } from '../../core/cloud/render-author/run.js';

const { renderAuthor } = runRenderAuthor({
  functions,
  Storage,
  FieldValue,
  getFirestoreInstance,
});

export const handle = renderAuthor;
