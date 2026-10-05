import { LAB_CONTENT } from './content.js';
import {
  createInfrastructure,
  infrastructureEffects,
  infrastructureOrder,
} from './infrastructure.js';
import {
  createIncidentChains,
  settleIncidents,
  intervene,
} from './incidents.js';
import { clampNumber } from '../../../index.js';
import {
  createRelationships,
  createCommitmentPolicies,
  relationshipOrder,
  settleRelationships,
  relationshipBonds,
} from './relationships.js';
import {
  createDeployments,
  launchDeployment,
  deploymentForecast,
  deploymentDelivers,
  settleDeployments,
  deploymentOrder,
} from './operations.js';
import {
  createEvaluations,
  evaluationOrder,
  evaluationComplete,
} from './evaluation.js';
import {
  createPrograms,
  researchEffects,
  hostingCost,
  configureResearch,
  settleResearch,
} from './research.js';
import {
  createPersonnel,
  personnelOrder,
  settlePersonnel,
} from './personnel.js';
import {
  createContractLedger,
  contractTerms,
  contractOversightSatisfied,
  negotiateContract,
  settleStakeholders,
} from './contracts.js';
import { createCampaignAct, advanceCampaignAct } from './campaign.js';
import { createDistress, advanceDistress, rescueOrder } from './distress.js';
import { createPlanning } from './planning.js';
import { settleScenario } from './scenarios.js';

/**
 * Clamp a public lab metric to its meaningful range.
 * @param {number} value Metric value.
 * @returns {number} Bounded integer.
 */
function metric(value) {
  return Math.round(clampNumber(value, 0, 100));
}

/**
 * Create a fresh independent management campaign.
 * @returns {Record<string, any>} Initial ledger.
 */
export function createLab() {
  const lab = {
    rulesVersion: 11,
    planning: createPlanning(),
    distress: createDistress(),
    rescueFinancing: null,
    campaignAct: createCampaignAct(1),
    evaluations: createEvaluations(),
    testingBudget: 6,
    incidentChains: createIncidentChains(),
    incidentGrace: 0,
    lastIncidentCost: 0,
    employees: createPersonnel(),
    firstShiftGuide: 0,
    cash: 180,
    debt: 120,
    compute: 8,
    cooling: 4,
    racks: 1,
    infrastructure: createInfrastructure(),
    morale: 75,
    trust: 45,
    scrutiny: 15,
    risk: 5,
    decisions: 6,
    policy: 'balanced',
    data: 'licensed',
    focus: 'atlas',
    teams: { research: 2, safety: 1, service: 1 },
    hired: 4,
    research: { atlas: 0, ghost: 0, lumen: 0 },
    evaluated: { atlas: 0, ghost: 0, lumen: 0 },
    deployed: [],
    contracts: [],
    fulfilled: [],
    expired: [],
    promises: [],
    incidents: 0,
    report: ['Opening balance 180k.', 'Debt 120k due after shift 28.'],
    history: [],
    outcome: null,
  };
  return {
    ...lab,
    programs: createPrograms(lab),
    deployments: createDeployments(lab),
    relationships: createRelationships(lab),
    commitmentPolicies: createCommitmentPolicies(),
    ...createContractLedger(),
  };
}

/**
 * Compute transparent shift costs and bottlenecks.
 * @param {Record<string, any>} lab Current ledger.
 * @returns {Record<string, any>} Shift operating forecast.
 */
export function forecast(lab) {
  const project = LAB_CONTENT.projects[lab.focus];
  const effects = researchEffects(lab);
  const power = lab.policy === 'sprint' ? 2 : 1;
  const demand =
    lab.research[lab.focus] >= project.target
      ? 0
      : Math.ceil(
          lab.teams.research * project.compute * power * effects.compute
        );
  const available = Math.min(lab.compute, lab.cooling);
  const throughput = Math.min(demand, available);
  const pace = lab.policy === 'careful' ? 0.8 : 1;
  const quality = lab.data === 'scraped' ? 1.3 : 1;
  const progress = Math.floor(
    throughput * pace * quality * effects.pace * (0.5 + lab.morale / 100)
  );
  const operations = deploymentForecast(lab, throughput);
  return {
    demand,
    available,
    throughput,
    progress,
    payroll: lab.hired * 3,
    power: Math.max(
      0,
      Math.ceil((throughput + operations.inferenceUsed) / 2) +
        infrastructureEffects(lab).power
    ),
    infrastructure: infrastructureEffects(lab).recurring,
    contractService: lab.contracts
      .filter((/** @type {string} */ id) => !lab.expired.includes(id))
      .reduce(
        (/** @type {number} */ sum, /** @type {string} */ id) =>
          sum + contractTerms(lab, id).serviceCost,
        0
      ),
    hosting: hostingCost(lab),
    service: operations.consulting,
    income: operations.income,
    operations,
    inferenceDemand: operations.inferenceDemand,
    inferenceAvailable: operations.inferenceAvailable,
    supportDemand: operations.supportDemand,
    supportCapacity: operations.supportCapacity,
  };
}

/**
 * Apply an affordable operation to a cloned ledger, preserving failed orders.
 * @param {Record<string, any>} lab Ledger being edited.
 * @param {number} cost Credit cost.
 * @param {Function} apply Mutation applied only on success.
 * @returns {string} Director feedback.
 */
function purchase(lab, cost, apply) {
  if (lab.cash < cost) return `Need ${cost}k credits. Order rejected.`;
  lab.cash -= cost;
  return apply();
}

/**
 * Execute one specific management instruction.
 * @param {Record<string, any>} lab Mutable cloned ledger.
 * @param {string} command Authored operation.
 * @param {number} day Current campaign shift.
 * @returns {string} Outcome message.
 */
function operate(lab, command, day) {
  const [kind, value] = command.split(':');
  if (kind === 'promise' || kind === 'arc')
    return relationshipOrder(lab, command, day, forecast(lab));
  if (kind === 'contract')
    return negotiateContract(lab, value, command.split(':')[2] || 'balanced');
  if (kind === 'service') return deploymentOrder(lab, command);
  if (kind === 'test') return evaluationOrder(lab, command);
  if (kind === 'configure') return configureResearch(lab, command);
  if (kind === 'incident') return intervene(lab, value);
  if (kind === 'rescue') return rescueOrder(lab, value, day);
  if (kind === 'infra') return infrastructureOrder(lab, value);
  if (kind === 'assign' || kind === 'hire') return personnelOrder(lab, command);
  if (kind === 'focus') {
    lab.focus = value;
    return `Research focus: ${LAB_CONTENT.projects[value].name}.`;
  }
  if (kind === 'policy' || kind === 'data') {
    lab[kind] = value;
    return `${kind} policy: ${value}.`;
  }
  if (kind === 'team') {
    return 'No staff moved. Choose a named colleague at the staff console.';
  }
  if (command === 'racks')
    return purchase(lab, 30, () => {
      lab.racks++;
      lab.compute += 4;
      return 'Four compute units installed. Check cooling.';
    });
  if (command === 'cooling')
    return purchase(lab, 20, () => {
      lab.cooling += 4;
      return 'Cooling capacity increased by four.';
    });
  if (command === 'rest')
    return purchase(lab, 8, () => {
      lab.morale = metric(lab.morale + 18);
      for (const person of lab.employees)
        person.fatigue = Math.max(0, person.fatigue - 20);
      return 'Protected recovery time. Morale +18.';
    });
  if (command === 'audit')
    return purchase(lab, 12, () => {
      lab.risk = metric(lab.risk - 18);
      lab.scrutiny = metric(lab.scrutiny - 12);
      lab.trust = metric(lab.trust + 5);
      lab.commitmentPolicies.register = true;
      return 'Published incident register. Risk -18, trust +5.';
    });
  if (command === 'repay')
    return purchase(lab, Math.min(20, lab.debt), () => {
      lab.debt = Math.max(0, lab.debt - 20);
      return `Debt remaining: ${lab.debt}k.`;
    });
  if (command === 'evaluate') {
    return 'Sable: choose representative probes at the evaluation console. No blanket sign-off is available.';
  }
  if (command === 'deploy') {
    if (lab.deployed.includes(lab.focus))
      return 'This model is already deployed.';
    if (lab.research[lab.focus] < LAB_CONTENT.projects[lab.focus].target)
      return 'Training target not reached.';
    if (!evaluationComplete(lab, lab.focus) || lab.risk > 35)
      return 'Release blocked: evaluate latest checkpoint and reduce risk to 35.';
    lab.deployed.push(lab.focus);
    launchDeployment(lab, lab.focus);
    lab.trust = metric(lab.trust + LAB_CONTENT.projects[lab.focus].trust);
    return 'Model deployed with its first users. Next invoice depends on adoption, capacity and maintenance. X: deployment operations.';
  }
  return 'Unknown lab operation.';
}

/**
 * Commit a planning action with decision-point accounting and failure rollback.
 * @param {Record<string, any>} state Game state.
 * @param {string} command Authored operation.
 * @returns {Record<string, any>} Updated state.
 */
export function manageLab(state, command) {
  if (state.lab.outcome)
    return { ...state, toast: 'Campaign finished. X: save or reset.' };
  if (!state.lab.decisions)
    return {
      ...state,
      toast: 'No decision points remain. End shift at the ledger.',
    };
  const lab = structuredClone(state.lab);
  const message = operate(lab, command, state.world.day);
  const changed = JSON.stringify(lab) !== JSON.stringify(state.lab);
  if (changed) lab.decisions--;
  const world = changed
    ? {
        ...state.world,
        relationships: {
          ...state.world.relationships,
          ...relationshipBonds(lab),
        },
      }
    : state.world;
  return { ...state, lab, toast: message, world };
}

/**
 * Classify the campaign from actual financial, social and safety outcomes.
 * @param {Record<string, any>} lab Final ledger.
 * @returns {string} Persisted resolution.
 */
export function labEnding(lab) {
  if (lab.cash < 0) return 'insolvent';
  if (lab.debt > lab.cash) return 'acquired';
  if (lab.incidents >= 3 || lab.trust < 25) return 'gilded-cage';
  if (
    lab.deployed.length >= 2 &&
    lab.trust >= 65 &&
    ['fulfilled', 'repaired'].includes(lab.relationships.mae.stage)
  )
    return 'city-covenant';
  return lab.deployed.length ? 'independent' : 'quiet-lab';
}

/**
 * Record an authored chapter boundary in the settled report and ledger.
 * @param {Record<string, any>} lab Settled lab ledger.
 * @param {number} nextShift Shift opened by this settlement.
 * @param {string[]} report Mutable settlement report.
 * @returns {void} Applies only the new chapter marker and report row.
 */
function recordCampaignBoundary(lab, nextShift, report) {
  const transition = advanceCampaignAct(lab, nextShift);
  if (!transition.changed) return;
  lab.campaignAct = transition.campaignAct;
  report.push(`ACT ${transition.act.title}. ${transition.act.pressure}`);
}

/**
 * Settle one deterministic shift: bottlenecks, risks, contracts and runway.
 * @param {Record<string, any>} state Current campaign.
 * @returns {Record<string, any>} Next shift state.
 */
export function endShift(state) {
  if (state.lab.outcome) return state;
  const lab = structuredClone(state.lab);
  lab.planning.orders = [];
  const f = forecast(lab);
  const project = LAB_CONTENT.projects[lab.focus];
  f.progress = Math.min(
    f.progress,
    Math.max(0, project.target - lab.research[lab.focus])
  );
  lab.research[lab.focus] += f.progress;
  const heat = Math.max(0, f.demand - lab.cooling);
  const stress =
    lab.policy === 'sprint' ? 10 : lab.policy === 'careful' ? -3 : 3;
  lab.morale = metric(lab.morale - stress - heat);
  lab.risk = metric(
    lab.risk +
      (f.progress
        ? Math.max(0, project.hazard + researchEffects(lab).hazard)
        : 0) +
      (lab.data === 'scraped' ? 8 : 0) +
      heat -
      lab.teams.safety * 3
  );
  lab.scrutiny = metric(lab.scrutiny + (lab.data === 'scraped' ? 8 : 1));
  const report = [
    `Research +${f.progress}; ${lab.research[lab.focus]}/${project.target}.`,
    `Income ${f.income + f.service}k; payroll ${f.payroll}k; power ${f.power}k; hosting ${f.hosting}k; infrastructure ${f.infrastructure}k; contract service ${f.contractService}k.`,
  ];
  settleResearch(lab, report);
  let revenue = f.income + f.service;
  for (const id of lab.contracts) {
    const contract = LAB_CONTENT.contracts[id];
    const terms = contractTerms(lab, id);
    const expiredBeforeShift = lab.expired.includes(id);
    if (
      deploymentDelivers(f.operations, contract.project) &&
      contractOversightSatisfied(lab, id) &&
      !lab.expired.includes(id) &&
      !lab.fulfilled.includes(id)
    ) {
      lab.fulfilled.push(id);
      report.push(`${contract.name} / ${terms.name}: delivered.`);
    }
    if (
      state.world.day >= terms.deadline &&
      !lab.fulfilled.includes(id) &&
      !lab.expired.includes(id)
    ) {
      lab.expired.push(id);
      revenue -= Math.ceil(terms.advance / 2);
      lab.trust = metric(lab.trust - 10);
      report.push(`${contract.name}: missed. Advance clawback.`);
    }
    if (!expiredBeforeShift) revenue -= terms.serviceCost;
  }
  const incidentCost = settleIncidents(lab, f, state.world.day, report);
  revenue -= incidentCost;
  settleDeployments(lab, f.operations, report);
  settleRelationships(lab, f, state.world.day, report);
  lab.cash = Math.round(
    lab.cash + revenue - f.payroll - f.power - f.hosting - f.infrastructure
  );
  settlePersonnel(lab);
  settleStakeholders(lab, incidentCost, f.operations);
  lab.decisions = 6;
  lab.testingBudget = 6;
  lab.report = report;
  lab.history = [
    ...lab.history,
    {
      shift: state.world.day,
      cash: lab.cash,
      risk: lab.risk,
      progress: f.progress,
    },
  ].slice(-28);
  const nextShift = state.world.day + 1;
  recordCampaignBoundary(lab, nextShift, report);
  const insolvency = advanceDistress(lab, nextShift, report);
  if (insolvency || state.world.day >= 28) lab.outcome = labEnding(lab);
  return {
    ...state,
    lab: settleScenario(lab),
    world: {
      ...state.world,
      day: state.world.day + 1,
      relationships: {
        ...state.world.relationships,
        ...relationshipBonds(lab),
      },
    },
    toast: report[0],
  };
}
