import { initializeApp } from 'firebase-admin/app';
import { functions, Storage } from './hide-variant-html-gcf.js';
import { createHideVariantHtmlCore } from '../../core/cloud/hide-variant-html/hide-variant-html-core.js';

const { hideVariantHtml, handleVariantVisibilityChange } =
  createHideVariantHtmlCore({
    initializeApp,
    functions,
    Storage,
    environmentVariables: process.env,
  });

export { hideVariantHtml, handleVariantVisibilityChange };
