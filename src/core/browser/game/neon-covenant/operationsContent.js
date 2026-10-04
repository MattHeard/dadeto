/** @type {Record<string, Record<string, number>>} Authored service profiles; financial amounts are thousands of credits. */
export const DEPLOYMENT_PROFILES = {
  atlas: {
    users: 200,
    start: 20,
    growth: 20,
    inference: 3,
    support: 2,
    maintenanceCost: 6,
  },
  ghost: {
    users: 80,
    start: 15,
    growth: 15,
    inference: 5,
    support: 4,
    maintenanceCost: 10,
  },
  lumen: {
    users: 400,
    start: 25,
    growth: 25,
    inference: 4,
    support: 3,
    maintenanceCost: 8,
  },
};

/** @type {Record<string, number>} Shared, disclosed service requirements. */
export const OPERATING_RULES = {
  supportPerEmployee: 4,
  healthyMaintenance: 60,
  deliveryAdoption: 20,
  deliveryReliability: 70,
  backlogLimit: 30,
  triageCost: 4,
  triageTickets: 12,
};
