import { LAB_CONTENT } from './content.js';
const PROGRAMS = LAB_CONTENT.projects;

/**
 * Resolve a bounded setting from trusted authorship, not portable-save content.
 * @param {string} project Program identifier.
 * @param {string} axis Configuration dimension.
 * @returns {Record<string, any>} Allowed choices, or an empty catalogue.
 */
export function researchOptions(project, axis) {
  if (axis === 'specialization') return PROGRAMS[project].specialties;
  if (Object.hasOwn(LAB_CONTENT.researchSettings, axis))
    return LAB_CONTENT.researchSettings[axis];
  return {};
}

/**
 * Derive earned training milestones without confusing training with deployment.
 * @param {string} id Program identifier.
 * @param {number} progress Saved research progress.
 * @returns {string[]} Earned prototype, pilot and release-readiness milestones.
 */
function earned(id, progress) {
  return Object.entries(PROGRAMS[id].milestones)
    .filter(([, threshold]) => progress >= threshold)
    .map(([name]) => name);
}

/**
 * Reconstruct conservative defaults without rewriting an inherited ledger.
 * @param {Record<string, any>} lab Ledger with existing progress.
 * @returns {Record<string, any>} Independent program records.
 */
export function createPrograms(lab) {
  return Object.fromEntries(
    Object.keys(PROGRAMS).map(id => [id, programRecord(id, lab)])
  );
}

/**
 * Initialize one program independently of its inherited financial records.
 * @param {string} id Authored program.
 * @param {Record<string, any>} lab Existing research ledger.
 * @returns {Record<string, any>} Mutable settings and earned milestones.
 */
function programRecord(id, lab) {
  return {
    settings: {
      size: 'standard',
      hosting: 'local',
      specialization: Object.keys(PROGRAMS[id].specialties)[0],
      oversight: 'assisted',
    },
    milestones: earned(id, lab.research[id]),
  };
}

/**
 * Combine documented configuration factors for the active research program.
 * @param {Record<string, any>} lab Persistent ledger.
 * @returns {{compute: number, pace: number, hazard: number, fee: number}} Operating effects.
 */
export function researchEffects(lab) {
  const settings = lab.programs[lab.focus].settings;
  const effects = { compute: 1, pace: 1, hazard: 0, fee: 0 };
  for (const [axis, value] of Object.entries(settings)) {
    const option = researchOptions(lab.focus, axis)[value];
    effects.compute *= option.compute;
    effects.pace *= option.pace;
    effects.hazard += option.hazard;
    effects.fee += option.fee;
  }
  return effects;
}

/**
 * Charge recurring hosting for every configured program, even when focus changes.
 * @param {Record<string, any>} lab Persistent ledger.
 * @returns {number} Disclosed total hosting bill.
 */
export function hostingCost(lab) {
  return Object.values(lab.programs).reduce(
    (total, program) =>
      total +
      LAB_CONTENT.researchSettings.hosting[program.settings.hosting].fee,
    0
  );
}

/**
 * Commit one disclosed setting and invalidate only that program's sign-off.
 * @param {Record<string, any>} lab Mutable order clone.
 * @param {string} command Bounded configure:dimension:value order.
 * @returns {string} Acceptance or rejection explanation.
 */
export function configureResearch(lab, command) {
  const parts = command.split(':');
  const [, axis, value] = parts;
  const options = researchOptions(lab.focus, axis);
  if (parts.length !== 3 || !Object.hasOwn(options, value))
    return 'Unknown program setting. Order rejected.';
  const option = options[value];
  const program = lab.programs[lab.focus];
  if (program.settings[axis] === value)
    return 'This setting is already active.';
  const cost = option.cost;
  if (lab.cash < cost) return `Need ${cost}k credits. Setting rejected.`;
  lab.cash -= cost;
  program.settings[axis] = value;
  lab.evaluated[lab.focus] = 0;
  return `${option.name}: ${cost}k; hosting ${hostingCost(lab)}k each shift. Only this program needs renewed evaluation.`;
}

/**
 * Publish newly crossed milestones once, including several crossed in one shift.
 * @param {Record<string, any>} lab Settled research ledger.
 * @param {string[]} report Financial and research explanations.
 * @returns {void} Updates authored milestone records and the report.
 */
export function settleResearch(lab, report) {
  for (const id of Object.keys(PROGRAMS)) {
    const program = lab.programs[id];
    const milestones = earned(id, lab.research[id]);
    for (const name of milestones)
      if (!program.milestones.includes(name))
        report.push(
          `${PROGRAMS[id].name}: ${name} training milestone reached. Evaluation is still required before deployment.`
        );
    program.milestones = milestones;
  }
}

/**
 * Validate identities, bounded choices and milestones against trusted progress.
 * @param {Record<string, any>} lab Candidate ledger.
 * @returns {boolean} Whether all persistent program state is coherent.
 */
export function validPrograms(lab) {
  if (!lab.programs || Object.keys(lab.programs).length !== 3) return false;
  return Object.keys(PROGRAMS).every(id => validProgram(lab, id));
}

/**
 * Check one program against its own authored options and actual research.
 * @param {Record<string, any>} lab Candidate ledger.
 * @param {string} id Authored identity.
 * @returns {boolean} Whether this program is internally consistent.
 */
function validProgram(lab, id) {
  const program = lab.programs[id];
  return Boolean(
    Number.isFinite(lab.research?.[id]) &&
      lab.research[id] >= 0 &&
      program?.settings &&
      Object.keys(program.settings).length === 4 &&
      ['size', 'hosting', 'specialization', 'oversight'].every(
        axis =>
          typeof program.settings[axis] === 'string' &&
          Object.hasOwn(researchOptions(id, axis), program.settings[axis])
      ) &&
      Array.isArray(program.milestones) &&
      JSON.stringify(program.milestones) ===
        JSON.stringify(earned(id, lab.research[id]))
  );
}

/**
 * Upgrade rules-2 programs without altering money, checkpoints or deployment.
 * @param {Record<string, any>} state Personnel/incident-migrated campaign.
 * @returns {Record<string, any>} Upgraded campaign or untouched current candidate.
 */
export function migratePrograms(state) {
  if (state.lab?.rulesVersion !== 2) return state;
  return {
    ...state,
    lab: { ...state.lab, rulesVersion: 3, programs: createPrograms(state.lab) },
    toast:
      'Program settings upgraded. Progress and ledger preserved; original slot backed up.',
  };
}

/**
 * Report each program's distinct question and the next visible milestone.
 * @param {Record<string, any>} lab Current ledger.
 * @returns {{text: string}[]} Authored identity and actual milestone explanations.
 */
export function researchPages(lab) {
  const id = lab.focus;
  const project = PROGRAMS[id];
  return [
    { text: project.identity },
    {
      text: `Training ${lab.research[id]}/${project.target}. Prototype ${project.milestones.prototype}, pilot ${project.milestones.pilot}, release-ready ${project.milestones.release}. Earned: ${lab.programs[id].milestones.join(', ') || 'none yet'}. A milestone never skips evaluation.`,
    },
    ...Object.entries(lab.programs[id].settings).map(([axis, value]) => ({
      text: `${axis}: ${researchOptions(id, axis)[value].name}. ${researchOptions(id, axis)[value].detail}`,
    })),
    {
      text: `Hosting bill ${hostingCost(lab)}k per shift across every configured program, including inactive projects. Changing one setting costs one attention plus its disclosed credits and invalidates only that program's evaluation.`,
    },
  ];
}
