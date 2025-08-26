import { serverTimestamp, db } from './firebase.js';

/**
 *
 * @param pageRef
 * @param variantId
 */
export function variantRef(pageRef, variantId) {
  return pageRef.collection('variants').doc(variantId);
}

/**
 *
 * @param batch
 * @param pageRef
 * @param variantId
 * @param data
 */
export function createVariant(batch, pageRef, variantId, data) {
  const ref = variantRef(pageRef, variantId);
  batch.set(ref, { ...data, createdAt: serverTimestamp() });
  return ref;
}

/**
 *
 * @param batch
 * @param variantRefObj
 * @param optionId
 * @param data
 */
export function createOption(batch, variantRefObj, optionId, data) {
  const ref = variantRefObj.collection('options').doc(optionId);
  batch.set(ref, { ...data, createdAt: serverTimestamp() });
  return ref;
}

/**
 *
 * @param path
 */
export function optionRefFromPath(path) {
  return db.doc(path);
}

/**
 *
 * @param batch
 * @param optionRef
 * @param data
 */
export function updateOption(batch, optionRef, data) {
  batch.update(optionRef, data);
}

/**
 *
 * @param pageDocRef
 */
export async function getLastVariantName(pageDocRef) {
  const variantsSnap = await pageDocRef
    .collection('variants')
    .orderBy('name', 'desc')
    .limit(1)
    .get();
  return variantsSnap;
}
