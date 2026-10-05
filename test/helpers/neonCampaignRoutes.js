/** @type {Array<Record<string, any>>} */
export const NEON_CAMPAIGN_ROUTES = [
  {
    name: 'clinical specialization',
    project: 'atlas',
    contract: 'contract:clinic:community',
    orders: [
      'promise:mae',
      'configure:specialization:bedside',
      'arc:consult:atlas',
    ],
    standing: 'clinic',
    minimumStanding: 55,
    promise: 'mae',
  },
  {
    name: 'public cooperation',
    project: 'lumen',
    contract: 'contract:transit:community',
    orders: [
      'promise:mae',
      'configure:specialization:dialects',
      'arc:consult:lumen',
    ],
    standing: 'transit',
    minimumStanding: 55,
    promise: 'mae',
  },
  {
    name: 'efficient service',
    project: 'atlas',
    contract: 'contract:clinic:balanced',
    orders: ['configure:size:compact'],
    standing: 'investor',
    minimumStanding: 50,
    promise: null,
  },
  {
    name: 'ambitious autonomy',
    project: 'ghost',
    contract: 'contract:helios:community',
    orders: [
      'promise:ada',
      'configure:specialization:maintenance',
      'configure:size:compact',
    ],
    standing: 'regulator',
    minimumStanding: 55,
    promise: 'ada',
  },
];
