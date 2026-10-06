import { LAB_CONTENT } from './content.js';
import { EVALUATION_CASES } from './evaluationContent.js';
import { researchOptions, validPrograms } from './research.js';
import { recordFromKeys } from './recordFromKeys.js';

/**
 * Capture only a probe's dependencies, retaining unrelated evidence after training.
 * @param {Record<string, any>} lab Current ledger.
 * @param {string} project Program identity.
 * @param {string} id Authored case identity.
 * @returns {Record<string, any>} Comparable research inputs.
 */
function inputs(lab, project, id) {
  const values = {
    ...lab.programs[project].settings,
    progress: lab.research[project],
    data: lab.data,
  };
  return Object.fromEntries(
    EVALUATION_CASES[project][id].dependencies.map(
      (/** @type {string} */ key) => [key, values[key]]
    )
  );
}

/**
 * Create independent evidence logs without pretending untested work passed.
 * @returns {Record<string, any>} Per-program test records.
 */
export function createEvaluations() {
  return Object.fromEntries(
    Object.entries(EVALUATION_CASES).map(([project, cases]) => [
      project,
      recordFromKeys(Object.keys(cases), () => null),
    ])
  );
}

/**
 * Check whether a stored result applies to the current relevant inputs.
 * @param {Record<string, any>} lab Campaign ledger.
 * @param {string} project Program.
 * @param {string} id Case.
 * @returns {boolean} Whether its fingerprint is current.
 */
function current(lab, project, id) {
  const evidence = lab.evaluations[project][id];
  return Boolean(
    evidence &&
      EVALUATION_CASES[project][id].dependencies.every(
        (/** @type {string} */ key) =>
          evidence.inputs[key] === inputs(lab, project, id)[key]
      )
  );
}

/**
 * Identify stale work independently of its historical checkpoint number.
 * @param {Record<string, any>} lab Lab.
 * @param {string} project Program.
 * @param {string} id Authored probe.
 * @returns {string} Untested, stale, pass, finding, investigated or retest.
 */
export function evaluationStatus(lab, project, id) {
  const evidence = lab.evaluations[project][id];
  if (!evidence) return 'untested';
  return current(lab, project, id) ? evidence.status : 'stale';
}

/**
 * Require representative, relevant passing evidence for every release.
 * @param {Record<string, any>} lab Current ledger.
 * @param {string} project Program to release.
 * @returns {boolean} Whether all current representative cases passed.
 */
export function evaluationComplete(lab, project) {
  return Object.keys(EVALUATION_CASES[project]).every(
    id => evaluationStatus(lab, project, id) === 'pass'
  );
}

/**
 * Derive an authored, deterministic finding from actual research choices.
 * @param {Record<string, any>} lab Lab.
 * @param {string} id Representative case category.
 * @returns {boolean} Whether the unpatched probe fails.
 */
function fails(lab, id) {
  const settings = lab.programs[lab.focus].settings;
  if (id === 'reliability')
    return (
      lab.research[lab.focus] < LAB_CONTENT.projects[lab.focus].milestones.pilot
    );
  if (id === 'rights') return lab.data === 'scraped';
  return (
    settings.oversight === 'autonomous' ||
    settings.specialization === 'autonomous'
  );
}

/**
 * Apply one test action after all rejection conditions have been checked.
 * @param {Record<string, any>} lab Mutable cloned lab.
 * @param {string} verb Probe, investigate or fix.
 * @param {string} id Authored case.
 * @returns {string} Sable's result.
 */
function perform(lab, verb, id) {
  const project = lab.focus;
  const old = lab.evaluations[project][id];
  if (verb === 'probe') {
    const repaired = current(lab, project, id) && old.status === 'retest';
    lab.evaluations[project][id] = {
      checkpoint: lab.research[project],
      inputs: inputs(lab, project, id),
      status: !repaired && fails(lab, id) ? 'finding' : 'pass',
    };
    if (lab.evaluations[project][id].status === 'pass')
      lab.risk = Math.max(0, lab.risk - 2);
  } else {
    old.status = verb === 'investigate' ? 'investigated' : 'retest';
  }
  if (evaluationComplete(lab, project))
    lab.evaluated[project] = lab.research[project];
  else lab.evaluated[project] = 0;
  return `${EVALUATION_CASES[project][id].name}: ${lab.evaluations[project][id].status}. ${lab.testingBudget}/6 testing capacity remains. Inspection is free.`;
}

/**
 * Execute bounded testing operations without a blanket sign-off shortcut.
 * @param {Record<string, any>} lab Mutable planning clone.
 * @param {string} command Authored canonical test instruction.
 * @returns {string} Accepted result or unchanged-order rejection.
 */
export function evaluationOrder(lab, command) {
  const [kind, verb, id, extra] = command.split(':');
  if (
    kind !== 'test' ||
    extra !== undefined ||
    !['probe', 'investigate', 'fix'].includes(verb) ||
    !Object.hasOwn(EVALUATION_CASES[lab.focus], id)
  )
    return 'Unknown evaluation operation.';
  if (!lab.teams.safety) return 'Assign a safety specialist first.';
  if (!lab.research[lab.focus])
    return 'No checkpoint exists. End a research shift first.';
  const status = evaluationStatus(lab, lab.focus, id);
  if (verb === 'probe' && ['pass', 'finding', 'investigated'].includes(status))
    return 'This probe is already recorded. Investigate findings before repair; retest only after a fix or relevant change.';
  if (
    verb !== 'probe' &&
    status !== (verb === 'investigate' ? 'finding' : 'investigated')
  )
    return 'Investigate a current finding before fixing it. A fix still requires a retest.';
  const definition = EVALUATION_CASES[lab.focus][id];
  const cost = verb === 'fix' ? 4 : definition.cost;
  const capacity =
    verb === 'probe' ? definition.capacity : verb === 'fix' ? 3 : 1;
  if (lab.cash < cost) return `Need ${cost}k credits. Test rejected.`;
  if (lab.testingBudget < capacity)
    return `Need ${capacity} testing capacity. End shift restores six; findings persist.`;
  lab.cash -= cost;
  lab.testingBudget -= capacity;
  return perform(lab, verb, id);
}

/**
 * Preserve every historical ledger field while reconstructing honest evidence.
 * @param {Record<string, any>} state Rules-3 or earlier migrated state.
 * @returns {Record<string, any>} Rules-4 state, or untouched current candidate.
 */
export function migrateEvaluations(state) {
  if (
    state.lab?.rulesVersion !== 3 ||
    !validPrograms(state.lab) ||
    !Object.keys(EVALUATION_CASES).every(id =>
      Number.isFinite(state.lab.evaluated?.[id])
    )
  )
    return state;
  const lab = {
    ...state.lab,
    rulesVersion: 4,
    testingBudget: 6,
    evaluations: createEvaluations(),
  };
  for (const project of Object.keys(EVALUATION_CASES)) {
    if (
      lab.research[project] > 0 &&
      lab.evaluated[project] >= lab.research[project]
    ) {
      for (const id of Object.keys(EVALUATION_CASES[project])) {
        lab.evaluations[project][id] = {
          checkpoint: lab.research[project],
          inputs: inputs(lab, project, id),
          status: 'pass',
        };
      }
    }
  }
  return {
    ...state,
    lab,
    toast:
      'Sable upgraded the test ledger. Historical sign-offs preserved; new work uses representative probes.',
  };
}

/**
 * Validate one historical result without rejecting legitimately stale evidence.
 * @param {Record<string, any>} lab Candidate lab.
 * @param {string} project Project identity.
 * @param {string} id Case identity.
 * @returns {boolean} Whether its bounded evidence record is well-formed.
 */
function validResult(lab, project, id) {
  const evidence = lab.evaluations[project][id];
  if (evidence === null) return true;
  return Boolean(
    evidence &&
      Number.isFinite(evidence.checkpoint) &&
      evidence.checkpoint > 0 &&
      evidence.checkpoint <= lab.research[project] &&
      ['pass', 'finding', 'investigated', 'retest'].includes(evidence.status) &&
      evidence.inputs &&
      Object.keys(evidence.inputs).length ===
        EVALUATION_CASES[project][id].dependencies.length &&
      EVALUATION_CASES[project][id].dependencies.every(
        (/** @type {string} */ key) =>
          key === 'progress'
            ? Number.isFinite(evidence.inputs[key]) &&
              evidence.inputs[key] === evidence.checkpoint
            : typeof evidence.inputs[key] === 'string' &&
              (key === 'data'
                ? ['licensed', 'scraped'].includes(evidence.inputs[key])
                : Object.hasOwn(
                    researchOptions(project, key),
                    evidence.inputs[key]
                  ))
      )
  );
}

/**
 * Reject corrupt capacities and invented case logs before replacing a campaign.
 * @param {Record<string, any>} lab Imported ledger.
 * @returns {boolean} Whether all authored records meet the persistence contract.
 */
export function validEvaluations(lab) {
  return Boolean(
    Number.isInteger(lab.testingBudget) &&
      lab.testingBudget >= 0 &&
      lab.testingBudget <= 6 &&
      lab.evaluations &&
      Object.keys(lab.evaluations).length === 3 &&
      Object.keys(EVALUATION_CASES).every(
        project =>
          lab.evaluations[project] &&
          Object.keys(lab.evaluations[project]).length === 3 &&
          Object.keys(EVALUATION_CASES[project]).every(id =>
            validResult(lab, project, id)
          )
      )
  );
}

/**
 * Present free authored causes, evidence and costs before a paid action.
 * @param {Record<string, any>} lab Current ledger.
 * @param {string} id Case selected at Sable's terminal.
 * @returns {{text:string}[]} Readable inspection pages.
 */
export function evaluationPages(lab, id) {
  const test = EVALUATION_CASES[lab.focus][id];
  const record = lab.evaluations[lab.focus][id];
  return [
    { text: `Sable: ${test.scene}` },
    {
      text: `Status: ${evaluationStatus(lab, lab.focus, id)}. Recorded checkpoint: ${record?.checkpoint || 'none'}. Relevant inputs: ${test.dependencies.join(', ')}. Unrelated training keeps completed work.`,
    },
    { text: test.failure },
    {
      text: `Known unpatched result: ${fails(lab, id) ? 'finding' : 'pass'}. Calibration below the pilot milestone fails; scraped-data provenance fails; autonomous oversight or open autonomy fails the permission test. A current repaired case can pass its retest. Findings never resolve by waiting.`,
    },
    {
      text: `Probe 2k/2 capacity; investigate 2k/1; fix 4k/3. Every accepted operation costs one attention. Six testing capacity per shift; unused capacity does not carry over. Fixes never replace retesting. ${lab.testingBudget} capacity remains.`,
    },
  ];
}
