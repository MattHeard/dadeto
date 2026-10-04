import { LAB_CONTENT } from './content.js';
import { clampNumber } from '../../../index.js';
import {
  createPersonnel,
  personnelOrder,
  settlePersonnel,
} from './personnel.js';

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
  return {
    rulesVersion: 1,
    employees: createPersonnel(),
    cash: 180,
    debt: 120,
    compute: 8,
    cooling: 8,
    racks: 1,
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
}

/**
 * Compute transparent shift costs and bottlenecks.
 * @param {Record<string, any>} lab Current ledger.
 * @returns {Record<string, number>} Shift operating forecast.
 */
export function forecast(lab) {
  const project = LAB_CONTENT.projects[lab.focus];
  const power = lab.policy === 'sprint' ? 2 : 1;
  const demand = lab.teams.research * project.compute * power;
  const available = Math.min(lab.compute, lab.cooling);
  const throughput = Math.min(demand, available);
  const pace = lab.policy === 'careful' ? 0.8 : 1;
  const quality = lab.data === 'scraped' ? 1.3 : 1;
  const progress = Math.floor(
    throughput * pace * quality * (0.5 + lab.morale / 100)
  );
  const deployed = /** @type {string[]} */ (lab.deployed);
  const contracts = /** @type {string[]} */ (lab.contracts);
  const income =
    deployed.reduce((sum, id) => sum + LAB_CONTENT.projects[id].revenue, 0) +
    contracts
      .filter(id => lab.fulfilled.includes(id))
      .reduce((sum, id) => sum + LAB_CONTENT.contracts[id].daily, 0);
  return {
    demand,
    available,
    throughput,
    progress,
    payroll: lab.hired * 3,
    power: Math.ceil(throughput / 2),
    service: lab.teams.service * 4,
    income,
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
 * @returns {string} Outcome message.
 */
function operate(lab, command) {
  const [kind, value] = command.split(':');
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
      return 'Published incident register. Risk -18, trust +5.';
    });
  if (command === 'repay')
    return purchase(lab, Math.min(20, lab.debt), () => {
      lab.debt = Math.max(0, lab.debt - 20);
      return `Debt remaining: ${lab.debt}k.`;
    });
  if (kind === 'contract') {
    if (lab.contracts.includes(value))
      return 'This contract is already signed.';
    const deal = LAB_CONTENT.contracts[value];
    lab.contracts.push(value);
    lab.cash += deal.advance;
    lab.trust = metric(lab.trust + deal.trust);
    return `${deal.name}: ${deal.advance}k advance. Deliver by shift ${deal.deadline}.`;
  }
  if (command === 'evaluate') {
    if (!lab.teams.safety) return 'Assign a safety specialist first.';
    if (!lab.research[lab.focus])
      return 'No checkpoint exists. End a research shift first.';
    return purchase(lab, 6, () => {
      lab.evaluated[lab.focus] = lab.research[lab.focus];
      lab.risk = metric(lab.risk - lab.teams.safety * 6);
      return 'Checkpoint evaluated. New training invalidates this sign-off.';
    });
  }
  if (command === 'deploy') {
    if (lab.deployed.includes(lab.focus))
      return 'This model is already deployed.';
    if (lab.research[lab.focus] < LAB_CONTENT.projects[lab.focus].target)
      return 'Training target not reached.';
    if (lab.evaluated[lab.focus] < lab.research[lab.focus] || lab.risk > 35)
      return 'Release blocked: evaluate latest checkpoint and reduce risk to 35.';
    lab.deployed.push(lab.focus);
    lab.trust = metric(lab.trust + LAB_CONTENT.projects[lab.focus].trust);
    return 'Model deployed. Recurring revenue starts next shift.';
  }
  if (kind === 'promise') {
    if (lab.promises.includes(value))
      return 'Your commitment is already recorded.';
    lab.promises.push(value);
    lab.morale = metric(lab.morale + 6);
    return 'Commitment recorded. Your team will remember.';
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
  const message = operate(lab, command);
  if (JSON.stringify(lab) !== JSON.stringify(state.lab)) lab.decisions--;
  const world = command.startsWith('promise:')
    ? {
        ...state.world,
        relationships: {
          ...state.world.relationships,
          [command.slice(8)]: lab.morale,
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
    lab.promises.includes('mae')
  )
    return 'city-covenant';
  return lab.deployed.length ? 'independent' : 'quiet-lab';
}

/**
 * Settle one deterministic shift: bottlenecks, risks, contracts and runway.
 * @param {Record<string, any>} state Current campaign.
 * @returns {Record<string, any>} Next shift state.
 */
export function endShift(state) {
  if (state.lab.outcome) return state;
  const lab = structuredClone(state.lab);
  const f = forecast(lab);
  const project = LAB_CONTENT.projects[lab.focus];
  lab.research[lab.focus] = Math.min(
    project.target,
    lab.research[lab.focus] + f.progress
  );
  const heat = Math.max(0, f.demand - lab.cooling);
  const stress =
    lab.policy === 'sprint' ? 10 : lab.policy === 'careful' ? -3 : 3;
  lab.morale = metric(lab.morale - stress - heat);
  lab.risk = metric(
    lab.risk +
      (f.progress ? project.hazard : 0) +
      (lab.data === 'scraped' ? 8 : 0) +
      heat -
      lab.teams.safety * 3
  );
  lab.scrutiny = metric(
    lab.scrutiny +
      (lab.data === 'scraped' ? 8 : 1) -
      (lab.promises.includes('sable') ? 2 : 0)
  );
  const report = [
    `Research +${f.progress}; ${lab.research[lab.focus]}/${project.target}.`,
    `Income ${f.income + f.service}k; payroll ${f.payroll}k; power ${f.power}k.`,
  ];
  let revenue = f.income + f.service;
  for (const id of lab.contracts) {
    const contract = LAB_CONTENT.contracts[id];
    if (
      lab.deployed.includes(contract.project) &&
      !lab.expired.includes(id) &&
      !lab.fulfilled.includes(id)
    ) {
      lab.fulfilled.push(id);
      report.push(`${contract.name}: delivered.`);
    }
    if (
      state.world.day >= contract.deadline &&
      !lab.fulfilled.includes(id) &&
      !lab.expired.includes(id)
    ) {
      lab.expired.push(id);
      revenue -= Math.ceil(contract.advance / 2);
      lab.trust = metric(lab.trust - 10);
      report.push(`${contract.name}: missed. Advance clawback.`);
    }
  }
  if (lab.risk >= 60 || lab.scrutiny >= 80) {
    lab.incidents++;
    revenue -= 20;
    lab.trust = metric(lab.trust - 12);
    lab.risk = metric(lab.risk - 20);
    lab.scrutiny = metric(lab.scrutiny - 15);
    report.push('Incident: 20k remediation; trust -12.');
  }
  if (lab.promises.includes('ion') && heat > 0) {
    lab.morale = metric(lab.morale - 8);
    report.push('Ion: you promised safe cooling.');
  }
  if (lab.promises.includes('ada') && lab.contracts.includes('helios')) {
    lab.morale = metric(lab.morale - 6);
    report.push('Ada refuses Helios attribution terms.');
  }
  if (lab.promises.includes('mae') && lab.deployed.includes('atlas'))
    lab.trust = metric(lab.trust + 2);
  lab.cash = Math.round(lab.cash + revenue - f.payroll - f.power);
  settlePersonnel(lab);
  lab.decisions = 6;
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
  if (lab.cash < 0 || state.world.day >= 28) lab.outcome = labEnding(lab);
  return {
    ...state,
    lab,
    world: { ...state.world, day: state.world.day + 1 },
    toast: report[0],
  };
}
