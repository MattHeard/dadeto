import { Firestore } from './get-api-key-credit-gcf.js';
import {
  createFirestore,
  createGetApiKeyCreditExpressHandle,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  findUuidFromRequest,
  isMissingDocument,
} from '../../core/cloud/get-api-key-credit/get-api-key-credit-core.js';

const handle = createGetApiKeyCreditExpressHandle({ Firestore });

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
