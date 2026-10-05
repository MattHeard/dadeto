import { createIncidentChains } from './incidents.js';
import { createPrograms } from './research.js';
import { evaluationComplete } from './evaluation.js';

/** @type {Record<string, any>} Authored short campaigns and their measurable goals. */
export const SCENARIOS = {
  clinicLaunch: {
    name: 'Eight shifts / Clinic launch',
    objective: 'Atlas pilot 20; cash stays positive by shift 8.',
    deadline: 8,
    route:
      'Keep Atlas focused and protect the team. The pilot milestone is the clinic launch gate.',
  },
  autonomyPilot: {
    name: 'Ten shifts / Bounded autonomy',
    objective: 'Ghost pilot 32; pass all three current probes by shift 10.',
    deadline: 10,
    route:
      'Research Ghost to its pilot checkpoint. Reassign both researchers before probing so training does not stale the reliability evidence. Sable then tests reliability, worker records, and permission boundaries.',
  },
  brownoutRecovery: {
    name: 'Twelve shifts / Brownout recovery',
    objective:
      'Clear the heat warning, avoid an incident, and stay solvent by shift 12.',
    deadline: 12,
    route:
      'Buy Ion’s 20k cooling repair before settling. Keep capacity above compute demand for two safe settlements.',
  },
};

/**
 * Start one authored scenario from a fresh, standard campaign ledger.
 * @param {Record<string, any>} lab Fresh ledger.
 * @param {string} id Authored scenario identifier.
 * @returns {Record<string, any>} Scenario ledger, or unchanged ledger for unknown ids.
 */
export function startScenario(lab, id) {
  const definition = SCENARIOS[id];
  if (!definition) return lab;
  const scenario = {
    id,
    status: 'active',
    settled: 0,
    startedAt: 1,
    objective: definition.objective,
  };
  const next = /** @type {Record<string, any>} */ ({ ...lab, scenario });
  if (id === 'clinicLaunch') {
    next.cash = 100;
    next.cooling = 8;
    next.research.atlas = 14;
  }
  if (id === 'autonomyPilot') {
    next.cash = 120;
    next.compute = 8;
    next.cooling = 8;
    next.focus = 'ghost';
    next.research.ghost = 24;
  }
  if (id === 'brownoutRecovery') {
    next.cash = 80;
    next.incidentChains = createIncidentChains();
    next.incidentChains.heat.stage = 'warning';
    next.incidentChains.heat.warnedAt = 1;
  }
  next.programs = createPrograms(next);
  if (id === 'autonomyPilot')
    next.programs.ghost.settings.specialization = 'maintenance';
  return next;
}

/**
 * Validate authored scenario progress in a portable campaign.
 * @param {Record<string, any>} lab Saved management ledger.
 * @returns {boolean} Whether scenario identity and bounds are trusted.
 */
export function validScenario(lab) {
  const scenario = lab.scenario;
  if (scenario === undefined) return true;
  return Boolean(
    scenario &&
      Object.hasOwn(SCENARIOS, scenario.id) &&
      ['active', 'success', 'failed'].includes(scenario.status) &&
      Number.isInteger(scenario.settled) &&
      scenario.settled >= 0 &&
      scenario.settled <= SCENARIOS[scenario.id].deadline &&
      scenario.startedAt === 1 &&
      scenario.objective === SCENARIOS[scenario.id].objective
  );
}

/**
 * Record one settlement against scenario-specific authored win and loss rules.
 * @param {Record<string, any>} lab Settled ledger.
 * @returns {Record<string, any>} Updated ledger with an explicit scenario result.
 */
export function settleScenario(lab) {
  const active = lab.scenario;
  if (!active || active.status !== 'active') return lab;
  const scenario = { ...active, settled: active.settled + 1 };
  const clinic = scenario.id === 'clinicLaunch';
  const autonomy = scenario.id === 'autonomyPilot';
  const brownout = scenario.id === 'brownoutRecovery';
  const success =
    lab.cash >= 0 &&
    ((clinic && lab.research.atlas >= 20) ||
      (autonomy &&
        lab.research.ghost >= 32 &&
        evaluationComplete(lab, 'ghost')) ||
      (brownout &&
        lab.incidentChains.heat.stage === 'clear' &&
        lab.incidents === 0));
  const failed =
    scenario.settled >= SCENARIOS[scenario.id].deadline && !success;
  scenario.status = success ? 'success' : failed ? 'failed' : 'active';
  return {
    ...lab,
    scenario,
    report: [
      ...lab.report,
      `SCENARIO ${scenario.status.toUpperCase()}: ${SCENARIOS[scenario.id].objective}`,
    ],
  };
}
