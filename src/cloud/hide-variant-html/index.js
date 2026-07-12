import { initializeApp } from 'firebase-admin/app';
import { functions, Storage } from './hide-variant-html-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createHideVariantHtmlCore } from '../../core/cloud/hide-variant-html/hide-variant-html-core.js';

const db = getFirestoreInstance();
const { hideVariantHtml: handle, handleVariantVisibilityChange } =
  createHideVariantHtmlCore({
    initializeApp,
    functions,
    Storage,
    db,
    environmentVariables: process.env,
  });

export { handle, handleVariantVisibilityChange };
