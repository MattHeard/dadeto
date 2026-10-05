import { LAB_CONTENT } from './content.js';
import { researchEffects, validPrograms } from './research.js';
import { validEvaluations } from './evaluation.js';
import { DEPLOYMENT_PROFILES, OPERATING_RULES } from './operationsContent.js';
import { clampNumber } from '../../../index.js';
import { infrastructureEffects } from './infrastructure.js';
import { contractTerms as invoiceTerms } from './contracts.js';

/**
 * Reconstruct existing releases without inventing lost users or past bills.
 * @param {Record<string, any>} lab Ledger with a trusted deployed-model list.
 * @returns {Record<string, any>} Independent mutable service records.
 */
export function createDeployments(lab) {
  /** @type {Record<string, any>} */
  const records = {};
  for (const id of Object.keys(DEPLOYMENT_PROFILES))
    records[id] = freshService(lab.deployed.includes(id) ? 100 : 0);
  return records;
}

/**
 * Start an actual new release with its authored initial client cohort.
 * @param {Record<string, any>} lab Mutable release ledger.
 * @param {string} id Authored project.
 * @returns {void} Records the cohort, never advances a shift.
 */
export function launchDeployment(lab, id) {
  lab.deployments[id] = freshService(DEPLOYMENT_PROFILES[id].start);
}

/**
 * Initialize one cohort with no invented wear or outstanding requests.
 * @param {number} adoption Initial adoption percentage.
 * @returns {Record<string, number>} Independent service record.
 */
function freshService(adoption) {
  return { adoption, maintenance: 100, backlog: 0 };
}

/**
 * Derive a service's demand from real users, configuration and outstanding work.
 * @param {Record<string, any>} lab Lab.
 * @param {string} id Released program.
 * @returns {Record<string, any>} Demand and maximum contracted revenue.
 */
function demandFor(lab, id) {
  const profile = DEPLOYMENT_PROFILES[id];
  const service = lab.deployments[id];
  const fraction = service.adoption / 100;
  const contractRevenue = lab.contracts
    .filter(
      (/** @type {string} */ key) =>
        lab.fulfilled.includes(key) && LAB_CONTENT.contracts[key].project === id
    )
    .reduce(
      (/** @type {number} */ total, /** @type {string} */ key) =>
        total + invoiceTerms(lab, key).daily,
      0
    );
  const baseSupport = Math.ceil(profile.support * fraction);
  return {
    id,
    adoption: service.adoption,
    maintenance: service.maintenance,
    users: Math.floor(profile.users * fraction),
    inference: Math.ceil(
      profile.inference *
        fraction *
        researchEffects({ ...lab, focus: id }).compute
    ),
    baseSupport,
    support: baseSupport + Math.ceil(service.backlog / 4),
    maximumRevenue: LAB_CONTENT.projects[id].revenue + contractRevenue,
  };
}

/**
 * Allocate a shared resource proportionally without letting a release monopolize it.
 * @param {number} available Available units.
 * @param {number} demand Requested units.
 * @returns {number} Delivered fraction, or full availability for an idle resource.
 */
function supplied(available, demand) {
  if (!demand) return 1;
  return Math.min(1, available / demand);
}

/**
 * Forecast exact service invoices and explain their actual capacity constraints.
 * @param {Record<string, any>} lab Immutable ledger to inspect.
 * @param {number} training Training throughput consuming the same hardware.
 * @returns {Record<string, any>} Deterministic service allocation and invoices.
 */
export function deploymentForecast(lab, training = 0) {
  const demand = lab.deployed.map((/** @type {string} */ id) =>
    demandFor(lab, id)
  );
  const inferenceDemand = demand.reduce(
    (/** @type {number} */ sum, /** @type {Record<string, any>} */ row) =>
      sum + row.inference,
    0
  );
  const supportDemand = demand.reduce(
    (/** @type {number} */ sum, /** @type {Record<string, any>} */ row) =>
      sum + row.support,
    0
  );
  const inferenceAvailable = Math.max(
    0,
    Math.min(lab.compute, lab.cooling) - training
  );
  const supportCapacity =
    lab.teams.service * OPERATING_RULES.supportPerEmployee;
  const inferenceRatio =
    inferenceAvailable > 0 ? supplied(inferenceAvailable, inferenceDemand) : 0;
  const supportRatio =
    supportCapacity > 0 ? supplied(supportCapacity, supportDemand) : 0;
  const projects = demand.map((/** @type {Record<string, any>} */ row) => {
    const reliability = Math.floor(
      Math.max(0, Math.min(100, 100 + infrastructureEffects(lab).reliability)) *
        Math.min(
          inferenceRatio,
          supportRatio,
          row.maintenance / OPERATING_RULES.healthyMaintenance
        )
    );
    return {
      ...row,
      reliability,
      bottleneck: serviceConstraint(
        inferenceRatio,
        supportRatio,
        row.maintenance / OPERATING_RULES.healthyMaintenance,
        row.adoption
      ),
      supported: Math.floor(row.support * supportRatio),
      revenue: Math.floor(
        (((row.maximumRevenue * row.adoption) / 100) * reliability) / 100
      ),
    };
  });
  const spareSupport = Math.max(0, supportCapacity - supportDemand);
  return {
    projects,
    inferenceDemand,
    inferenceAvailable,
    inferenceUsed: Math.min(inferenceAvailable, inferenceDemand),
    supportDemand,
    supportCapacity,
    income: projects.reduce(
      (/** @type {number} */ sum, /** @type {Record<string, any>} */ row) =>
        sum + row.revenue,
      0
    ),
    consulting: Math.floor(
      lab.teams.service * 4 * supplied(spareSupport, supportCapacity)
    ),
  };
}

/**
 * Identify the dominant operational cause rather than hiding behind one percentage.
 * @param {number} inference Delivered inference fraction.
 * @param {number} support Delivered support fraction.
 * @param {number} maintenance Equipment health fraction.
 * @param {number} adoption Current market coverage.
 * @returns {Record<string, string>} Constraint and concrete intervention.
 */
function serviceConstraint(inference, support, maintenance, adoption) {
  if (maintenance < Math.min(1, inference, support))
    return {
      kind: 'maintenance',
      advice:
        'Maintain this service. Extra compute cannot repair worn equipment.',
    };
  if (support < Math.min(1, inference))
    return {
      kind: 'support',
      advice:
        'Assign service staff or triage the queue. More compute alone cannot answer clients.',
    };
  if (inference < 1)
    return {
      kind: 'inference',
      advice:
        'Inference shares the smaller of compute and cooling after training. Repair the limiting capacity, reduce local demand or defer training.',
    };
  if (adoption < 100)
    return {
      kind: 'adoption',
      advice:
        'Users arrive after reliable service settlements. Extra hardware alone cannot skip adoption.',
    };
  return {
    kind: 'none',
    advice: 'Service can earn its full contracted maximum this shift.',
  };
}

/**
 * Require delivered service, not a dormant release flag, before fulfilling a deal.
 * @param {Record<string, any>} flow Current service projection.
 * @param {string} project Contract's program.
 * @returns {boolean} Whether its adoption and service satisfy disclosed requirements.
 */
export function deploymentDelivers(flow, project) {
  const row = flow.projects.find(
    (/** @type {Record<string, any>} */ entry) => entry.id === project
  );
  return Boolean(
    row &&
      row.adoption >= OPERATING_RULES.deliveryAdoption &&
      row.reliability >= OPERATING_RULES.deliveryReliability
  );
}

/**
 * Settle users, support queues and equipment wear once using the quoted allocation.
 * @param {Record<string, any>} lab Mutable settlement clone.
 * @param {Record<string, any>} flow Original immutable service forecast.
 * @param {string[]} report Financial/operational explanations.
 * @returns {void} Persists tomorrow's service conditions.
 */
export function settleDeployments(lab, flow, report) {
  for (const row of flow.projects) {
    const service = lab.deployments[row.id];
    const profile = DEPLOYMENT_PROFILES[row.id];
    const change =
      row.reliability >= OPERATING_RULES.deliveryReliability
        ? Math.floor((profile.growth * row.reliability) / 100)
        : -10;
    service.adoption = clampNumber(service.adoption + change, 0, 100);
    service.backlog = clampNumber(
      service.backlog + row.baseSupport - row.supported,
      0,
      OPERATING_RULES.backlogLimit
    );
    service.maintenance = Math.max(
      0,
      service.maintenance - 2 - Math.ceil(row.inference / 2)
    );
    report.push(
      `${row.id}: ${row.users} users, ${row.adoption}% adoption, ${row.reliability}% reliable; earned ${row.revenue}k of ${row.maximumRevenue}k maximum. Inference ${row.inference}, support ${row.support}, queue ${service.backlog}; maintenance ${service.maintenance}%.`
    );
  }
}

/**
 * Commit disclosed maintenance or queue triage with unchanged-order rejection.
 * @param {Record<string, any>} lab Mutable planning clone.
 * @param {string} command Canonical authored service operation.
 * @returns {string} Accepted result or actionable rejection.
 */
export function deploymentOrder(lab, command) {
  const [kind, verb, id, extra] = command.split(':');
  if (
    kind !== 'service' ||
    extra !== undefined ||
    !['maintain', 'triage'].includes(verb) ||
    !Object.hasOwn(DEPLOYMENT_PROFILES, id)
  )
    return 'Unknown service operation.';
  if (!lab.deployed.includes(id))
    return 'Release this program before ordering service work.';
  const service = lab.deployments[id];
  if (
    (verb === 'maintain' && service.maintenance === 100) ||
    (verb === 'triage' && !service.backlog)
  )
    return 'No service work is needed. Credits and attention unchanged.';
  const cost =
    verb === 'maintain'
      ? DEPLOYMENT_PROFILES[id].maintenanceCost
      : OPERATING_RULES.triageCost;
  if (lab.cash < cost) return `Need ${cost}k credits. Service order rejected.`;
  lab.cash -= cost;
  if (verb === 'maintain') service.maintenance = 100;
  else
    service.backlog = Math.max(
      0,
      service.backlog - OPERATING_RULES.triageTickets
    );
  return `${id}: ${verb} completed for ${cost}k. Inspect tomorrow's users, reliability and invoice; no shift ended.`;
}

/**
 * Validate bounded service records without silently rebuilding current corrupt saves.
 * @param {Record<string, any>} lab Candidate ledger.
 * @returns {boolean} Whether all profiles and release identities are consistent.
 */
export function validDeployments(lab) {
  return Boolean(
    Array.isArray(lab.deployed) &&
      new Set(lab.deployed).size === lab.deployed.length &&
      lab.deployed.every(
        (/** @type {any} */ id) =>
          typeof id === 'string' && Object.hasOwn(DEPLOYMENT_PROFILES, id)
      ) &&
      lab.deployments &&
      Object.keys(lab.deployments).length === 3 &&
      Object.keys(DEPLOYMENT_PROFILES).every(id => validService(lab, id))
  );
}

/**
 * Reject impossible or active-looking records for an unreleased model.
 * @param {Record<string, any>} lab Candidate operating ledger.
 * @param {string} id Authored model identity.
 * @returns {boolean} Whether its cohort fits the saved release status.
 */
function validService(lab, id) {
  const service = lab.deployments[id];
  return Boolean(
    service &&
      ['adoption', 'maintenance', 'backlog'].every(
        key => Number.isInteger(service[key]) && service[key] >= 0
      ) &&
      service.adoption <= 100 &&
      service.maintenance <= 100 &&
      service.backlog <= OPERATING_RULES.backlogLimit &&
      (lab.deployed.includes(id) ||
        (service.adoption === 0 &&
          service.maintenance === 100 &&
          service.backlog === 0))
  );
}

/**
 * Preserve inherited releases and all historical accounting under current service rules.
 * @param {Record<string, any>} state Rules-4 campaign.
 * @returns {Record<string, any>} Rules-5 campaign or untouched invalid/current candidate.
 */
export function migrateDeployments(state) {
  if (
    state.lab?.rulesVersion !== 4 ||
    !validPrograms(state.lab) ||
    !validEvaluations(state.lab) ||
    !Array.isArray(state.lab.deployed)
  )
    return state;
  const upgraded = {
    ...state,
    toast:
      'Operating ledger upgraded. Existing releases retain full adoption; balances and original backup are preserved. New service requires capacity and maintenance.',
    lab: {
      ...state.lab,
      rulesVersion: 5,
      deployments: createDeployments(state.lab),
    },
  };
  return validDeployments(upgraded.lab) ? upgraded : state;
}

/**
 * Explain clients, constraints and exact income without spending attention or time.
 * @param {Record<string, any>} lab Current campaign.
 * @param {number} training Actual training throughput sharing its hardware.
 * @returns {{text:string}[]} Authoritative readable service pages.
 */
export function deploymentPages(lab, training) {
  const flow = deploymentForecast(lab, training);
  return [
    {
      text: `Ion: research and live services share compute and cooling. ${flow.inferenceDemand} inference units requested, ${flow.inferenceAvailable} available after training. ${flow.supportDemand} support work, ${flow.supportCapacity} staff capacity. Spare staff time earns ${flow.consulting}k consulting; service work cannot earn that money twice.`,
    },
    ...flow.projects.map((/** @type {Record<string, any>} */ row) => ({
      text: `${row.id}: ${row.users} users; ${row.adoption}% adoption, ${row.reliability}% reliable. Forecast invoice ${row.revenue}k / ${row.maximumRevenue}k maximum. Maintenance ${row.maintenance}%. Inference ${row.inference}; support ${row.support}. Limit: ${row.bottleneck.kind}. ${row.bottleneck.advice}`,
    })),
    {
      text: `Atlas/Ghost/Lumen reach 200/80/400 users at full adoption. Good service grows adoption by 20/15/25 points per shift, scaled by reliability. Reliability below 70% loses ten adoption points. Each service worker supplies four support work; old queue adds one work per four tickets. Maintenance wears by two plus half inference demand rounded up each shift.`,
    },
    {
      text: `Contracts need ${OPERATING_RULES.deliveryAdoption}% adoption and ${OPERATING_RULES.deliveryReliability}% reliability for delivery. Paid daily amounts are maxima, scaled by actual adoption and reliability. Inspect cases and retain release evidence. Maintenance costs Atlas6k/Ghost10k/Lumen8k and restores100%; triage costs4k and clears12 tickets. Both use one attention, neither ends a shift. Rejected or unnecessary work is free.`,
    },
  ];
}
