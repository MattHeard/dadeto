import { Firestore } from './get-api-key-credit-gcf.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createGetApiKeyCreditEffectAdapters } from './effect-adapters.js';
import {
  createFirestore,
  createGetApiKeyCreditExpressHandle,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  findUuidFromRequest,
  isMissingDocument,
} from '../../core/cloud/get-api-key-credit/get-api-key-credit-core.js';

const handleRequest = createGetApiKeyCreditExpressHandle({
  Firestore,
  ...createGetApiKeyCreditEffectAdapters(),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle };
export { handle as handler };

export {
  createGetApiKeyCreditExpressHandle,
  createFirestore,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  findUuidFromRequest,
  isMissingDocument,
} from '../../core/cloud/get-api-key-credit/get-api-key-credit-core.js';
