import { Firestore } from '../src/cloud/get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { seedBillingCatalog } from '../src/core/cloud/billing/catalog-seed-core.js';

const target = process.env.DADETO_ENVIRONMENT;
if (!target) throw new Error('DADETO_ENVIRONMENT is required');

const project = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
const database = process.env.DATABASE_ID ?? '(default)';
if (!project) throw new Error('GCLOUD_PROJECT is required');
console.log(`Seeding billing catalog: project=${project} database=${database} environment=${target}`);

const db = new Firestore({ projectId: project, databaseId: database });
const packageData = { active: true, amountUsdMinor: 1000 };
const snapshotData = {
  snapshotId: 'test-initial-2026-08-09',
  effectiveAt: '2026-08-09T00:00:00.000Z',
  eurPerUsdMicros: 920_000,
  creditEurMicros: 1,
  markupBps: 0,
  operations: {},
};
const result = await seedBillingCatalog(
  {
    getPackage: async id => (await db.collection('billing-packages').doc(id).get()).data() ?? null,
    setPackage: (id, value) => db.collection('billing-packages').doc(id).set(value, { merge: false }),
    getSnapshot: async id => (await db.collection('billing-pricing-snapshots').doc(id).get()).data() ?? null,
    createSnapshot: (id, value) => db.collection('billing-pricing-snapshots').doc(id).create(value),
  },
  { packages: { 'usd-10': packageData }, snapshots: { [snapshotData.snapshotId]: snapshotData } }
);
console.log(JSON.stringify(result));
