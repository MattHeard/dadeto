import {
  Storage,
  FieldValue,
  functions,
  getFirestoreInstance,
  saveAuthorHtml,
  updateAuthorDocument,
  bindEffectBoundary,
} from './render-author-gcf.js';
import { runRenderAuthor } from '../../core/cloud/render-author/run.js';

const { renderAuthor } = runRenderAuthor({
  functions,
  Storage,
  FieldValue,
  getFirestoreInstance,
  saveAuthorHtml,
  updateAuthorDocument,
  bindEffectBoundary,
});

export const handle = renderAuthor;
