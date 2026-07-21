import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

function effectiveVisibility(data) {
  return data.visibility ?? 1;
}

async function resolvePageRef(targetPage) {
  if (targetPage && typeof targetPage.collection === 'function') return targetPage;
  if (typeof targetPage === 'string') return db.doc(targetPage);
  return null;
}

async function calculateVariantSum(variantRef) {
  const variantSnap = await variantRef.get();
  const data = variantSnap.data() ?? {};
  const optionsSnap = await variantRef.collection('options').get();
  let sum = effectiveVisibility(data);
  let hasTarget = false;
  for (const option of optionsSnap.docs) {
    const pageRef = await resolvePageRef(option.data().targetPage);
    if (!pageRef) continue;
    hasTarget = true;
    const targetVariants = await pageRef.collection('variants').get();
    for (const targetVariant of targetVariants.docs) {
      sum += await calculateVariantSum(targetVariant.ref);
    }
  }
  const update = { treeVisibilitySum: sum };
  if (hasTarget) update.targetTreeWeightsDirty = true;
  await variantRef.update(update);
  return sum;
}

async function migrateStory(storySnap) {
  const rootPage = await resolvePageRef(storySnap.data()?.rootPage);
  if (!rootPage) return;
  const variants = await rootPage.collection('variants').get();
  for (const variant of variants.docs) await calculateVariantSum(variant.ref);
}

const stories = await db.collection('stories').get();
for (const story of stories.docs) await migrateStory(story);
