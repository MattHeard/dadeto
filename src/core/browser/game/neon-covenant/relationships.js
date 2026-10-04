import { clampNumber } from '../../../index.js';
import { evaluationComplete, validEvaluations } from './evaluation.js';
import { validPrograms, researchOptions } from './research.js';
import { deploymentDelivers, validDeployments } from './operations.js';
import { validPersonnel } from './personnel.js';
import {
  RELATIONSHIP_CONTENT,
  RELATIONSHIP_RULES,
} from './relationshipContent.js';

const STAGES = [
  'none',
  'active',
  'warning',
  'fulfilled',
  'breached',
  'repairing',
  'repaired',
];
const EVENTS = [
  'accepted',
  'disagreed',
  'warned',
  'fulfilled',
  'breached',
  'repair-agreed',
  'repair-paused',
  'repaired',
  'protected',
  'consulted',
];
const PUBLIC_PROGRAMS = ['atlas', 'lumen'];

/**
 * Reconstruct active commitments, never fictional historical achievements.
 * @param {Record<string, any>} lab Existing ledger.
 * @param {Record<string, number>} bonds Inherited world relationships.
 * @returns {Record<string, any>} Independent personal arc records.
 */
export function createRelationships(lab, bonds = {}) {
  /** @type {Record<string, any>} */
  const records = {};
  for (const id of Object.keys(RELATIONSHIP_CONTENT)) {
    const person = lab.employees.find(
      (/** @type {Record<string, any>} */ entry) => entry.id === id
    );
    records[id] = {
      score: clampNumber(
        Number.isFinite(bonds[id]) ? bonds[id] : person?.relationship || 0,
        -100,
        100
      ),
      stage: lab.promises.includes(id) ? 'active' : 'none',
      fulfillments: 0,
      disagreements: 0,
      breaches: 0,
      repairs: 0,
      streak: 0,
      warnedAt: 0,
      disagreedAt: 0,
      events: [],
    };
  }
  return records;
}

/**
 * Start explicit policy choices without inferring old purchases or consent.
 * @returns {Record<string, any>} Independent mutable negotiated policies.
 */
export function createCommitmentPolicies() {
  return {
    attribution: false,
    register: false,
    consultations: Object.fromEntries(PUBLIC_PROGRAMS.map(id => [id, null])),
  };
}

/**
 * Capture the exact terms a community partner reviewed, not unrelated settings.
 * @param {Record<string, any>} lab Campaign.
 * @param {string} project Public-service program.
 * @returns {Record<string, string>} Reviewed clinical or language terms.
 */
function consultationTerms(lab, project) {
  const settings = lab.programs[project].settings;
  return {
    oversight: settings.oversight,
    specialization: settings.specialization,
    data: lab.data,
  };
}

/**
 * Compare real choices to authored commitments before any consequences.
 * @param {Record<string, any>} lab Campaign.
 * @param {Record<string, any>} flow Actual management forecast.
 * @returns {Record<string, string>} Good, pending or bad conditions per person.
 */
export function relationshipConditions(lab, flow) {
  const ada =
    lab.data !== 'licensed' ||
    (lab.contracts.includes('helios') &&
      (!lab.commitmentPolicies.attribution ||
        lab.programs.ghost.settings.oversight === 'autonomous'));
  const ion =
    flow.demand > lab.cooling ||
    flow.inferenceDemand > flow.inferenceAvailable ||
    flow.operations.projects.some(
      (/** @type {Record<string, any>} */ row) => row.maintenance < 60
    );
  const sable =
    !lab.commitmentPolicies.register ||
    !lab.teams.safety ||
    lab.deployed.some(
      (/** @type {string} */ id) => !evaluationComplete(lab, id)
    );
  return {
    ada: ada ? 'bad' : 'good',
    ion: ion
      ? 'bad'
      : flow.throughput || flow.operations.projects.length
        ? 'good'
        : 'pending',
    sable: sable ? 'bad' : 'good',
    mae: communityCondition(lab, flow),
  };
}

/**
 * Do not call a future community launch a breach before users even exist.
 * @param {Record<string, any>} lab Campaign.
 * @param {Record<string, any>} flow Actual deployment invoices and reliability.
 * @returns {string} Pending, good or bad public-service fulfillment.
 */
function communityCondition(lab, flow) {
  const publicModels = PUBLIC_PROGRAMS.filter(id => lab.deployed.includes(id));
  if (!publicModels.length) return 'pending';
  return publicModels.every(id => {
    const reviewed = lab.commitmentPolicies.consultations[id];
    const current = consultationTerms(lab, id);
    return (
      reviewed &&
      current.data === 'licensed' &&
      current.oversight !== 'autonomous' &&
      Object.keys(current).every(key => reviewed[key] === current[key]) &&
      deploymentDelivers(flow.operations, id)
    );
  })
    ? 'good'
    : 'bad';
}

/**
 * Keep chronological callbacks bounded, without repeating unresolved penalties.
 * @param {Record<string, any>} record Personal arc.
 * @param {string} type Authored event kind.
 * @param {number} day Actual action or settlement shift.
 * @returns {void} Appends a remembered event.
 */
function remember(record, type, day) {
  record.events = [...record.events, { type, day }].slice(-12);
}

/**
 * Apply explicit terms, disagreement or restitution without advancing shifts.
 * @param {Record<string, any>} lab Mutable planning clone.
 * @param {string} command Canonical promise or arc operation.
 * @param {number} day Current shift.
 * @param {Record<string, any>} flow Actual current capacity and evidence.
 * @returns {string} Honest action feedback; rejected orders leave the ledger untouched.
 */
export function relationshipOrder(lab, command, day, flow) {
  const parts = command.split(':');
  if (
    parts[0] === 'promise' &&
    parts.length === 2 &&
    Object.hasOwn(RELATIONSHIP_CONTENT, parts[1])
  ) {
    const id = parts[1];
    if (lab.promises.includes(id))
      return 'Commitment already recorded. Acceptance is not fulfillment.';
    lab.promises.push(id);
    lab.relationships[id].stage = 'active';
    remember(lab.relationships[id], 'accepted', day);
    return 'Commitment accepted, not fulfilled. Two demonstrated shifts are required; no instant morale or bond reward.';
  }
  if (parts[0] !== 'arc' || parts.length !== 3)
    return 'Choose an authored relationship action.';
  const [, kind, id] = parts;
  if (kind === 'consult') return consult(lab, id, day);
  if (!Object.hasOwn(RELATIONSHIP_CONTENT, id))
    return 'Unknown colleague. No commitment changed.';
  const record = lab.relationships[id];
  if (kind === 'protect' && id === 'ada')
    return protectAuthors(lab, record, day);
  if (kind === 'disagree') {
    if (record.disagreedAt === day)
      return 'This disagreement is already heard this shift.';
    record.disagreements++;
    record.disagreedAt = day;
    record.score = clampNumber(record.score - 1, -100, 100);
    remember(record, 'disagreed', day);
    return 'Disagreement recorded separately. Existing commitments still apply; nobody counted this as a breach.';
  }
  if (kind !== 'repair' || record.stage !== 'breached')
    return 'There is no breached commitment awaiting this repair.';
  if (relationshipConditions(lab, flow)[id] !== 'good')
    return `Correct the cause first. ${RELATIONSHIP_CONTENT[id].condition}`;
  const cost = RELATIONSHIP_CONTENT[id].repairCost;
  if (lab.cash < cost)
    return `Repair needs ${cost}k. Credits and attention unchanged.`;
  lab.cash -= cost;
  record.stage = 'repairing';
  record.streak = 0;
  record.warnedAt = 0;
  remember(record, 'repair-agreed', day);
  return 'Repair agreement accepted. Two safe, demonstrated shifts must follow; this payment does not fix the operating cause or grant release evidence.';
}

/**
 * Negotiate protection without categorically excluding Helios investment.
 * @param {Record<string, any>} lab Campaign clone.
 * @param {Record<string, any>} record Ada's earned trust.
 * @param {number} day Current shift.
 * @returns {string} Actual legal addendum outcome.
 */
function protectAuthors(lab, record, day) {
  if (lab.commitmentPolicies.attribution)
    return 'Authorship and human-veto addendum already negotiated.';
  if (record.score < RELATIONSHIP_RULES.attributionBond)
    return "Earn Ada's trust through demonstrated work before negotiating this addendum.";
  if (lab.cash < RELATIONSHIP_RULES.attributionCost)
    return 'Authorship negotiation needs 8k. No order committed.';
  lab.cash -= RELATIONSHIP_RULES.attributionCost;
  lab.commitmentPolicies.attribution = true;
  remember(record, 'protected', day);
  return 'Enforceable author credit and human veto negotiated for Helios work. Advance and deadline unchanged. Licensed data and non-autonomous Ghost oversight are still required.';
}

/**
 * Record a partner's review, invalidated only by relevant subsequent changes.
 * @param {Record<string, any>} lab Campaign clone.
 * @param {string} project Authored public-service program.
 * @param {number} day Current shift.
 * @returns {string} Review outcome, never invented user delivery.
 */
function consult(lab, project, day) {
  if (!PUBLIC_PROGRAMS.includes(project))
    return 'Mae reviews Atlas or Lumen, not surveillance permissions.';
  const terms = consultationTerms(lab, project);
  if (terms.data !== 'licensed' || terms.oversight === 'autonomous')
    return 'Mae cannot consent to unlicensed records or a model deciding without human approval.';
  const current = lab.commitmentPolicies.consultations[project];
  if (current && Object.keys(terms).every(key => current[key] === terms[key]))
    return 'Mae already reviewed these exact terms. No attention spent.';
  lab.commitmentPolicies.consultations[project] = terms;
  remember(lab.relationships.mae, 'consulted', day);
  return `Mae reviewed ${project}'s actual terms. Consultation is not deployment or delivery. Relevant changes need another review.`;
}

/**
 * Advance earned trust from actual settlements, never from accepting promises.
 * @param {Record<string, any>} lab Mutable settling ledger.
 * @param {Record<string, any>} flow Actual shift forecast.
 * @param {number} day Settled shift.
 * @param {string[]} report Causal report paragraphs.
 * @returns {void} Records proof, warnings, one-time breaches and verified repair.
 */
export function settleRelationships(lab, flow, day, report) {
  const conditions = relationshipConditions(lab, flow);
  for (const id of Object.keys(RELATIONSHIP_CONTENT)) {
    const record = lab.relationships[id];
    if (record.stage === 'none') continue;
    if (conditions[id] === 'bad') settleBreach(lab, id, day, report);
    else if (conditions[id] === 'good') settleProof(lab, id, day, report);
    else record.streak = 0;
  }
}

/**
 * Charge only a newly broken episode, after a full warning settlement.
 * @param {Record<string, any>} lab Campaign.
 * @param {string} id Colleague.
 * @param {number} day Settled shift.
 * @param {string[]} report Causal explanations.
 * @returns {void} Mutates only current relationship consequences.
 */
function settleBreach(lab, id, day, report) {
  const record = lab.relationships[id];
  record.streak = 0;
  if (record.stage === 'breached') return;
  if (record.stage === 'repairing') {
    record.stage = 'breached';
    remember(record, 'repair-paused', day);
    report.push(
      `${RELATIONSHIP_CONTENT[id].name}: repair paused; cause returned, no second breach penalty.`
    );
  } else if (record.stage === 'warning' && day > record.warnedAt) {
    record.stage = 'breached';
    record.breaches++;
    record.score = clampNumber(
      record.score - RELATIONSHIP_RULES.breachBond,
      -100,
      100
    );
    lab.morale = clampNumber(lab.morale - 4, 0, 100);
    remember(record, 'breached', day);
    report.push(
      `${RELATIONSHIP_CONTENT[id].name}: commitment breached. Bond -12, morale -4 once. Correct the cause, then negotiate repair.`
    );
  } else if (record.stage !== 'warning') {
    record.stage = 'warning';
    record.warnedAt = day;
    remember(record, 'warned', day);
    report.push(
      `${RELATIONSHIP_CONTENT[id].name}: commitment warning, no breach charged. ${RELATIONSHIP_CONTENT[id].condition}`
    );
  }
}

/**
 * Require future proof after restitution and avoid farming repeated rewards.
 * @param {Record<string, any>} lab Campaign.
 * @param {string} id Colleague.
 * @param {number} day Settled shift.
 * @param {string[]} report Causal explanations.
 * @returns {void} Changes earned bond only on demonstrated transitions.
 */
function settleProof(lab, id, day, report) {
  const record = lab.relationships[id];
  if (record.stage === 'breached') return;
  if (record.stage === 'warning') record.stage = 'active';
  record.warnedAt = 0;
  record.streak = Math.min(RELATIONSHIP_RULES.proofShifts, record.streak + 1);
  if (record.streak < RELATIONSHIP_RULES.proofShifts) return;
  if (record.stage === 'repairing') {
    record.repairs++;
    record.fulfillments = 1;
    record.stage = 'repaired';
    record.score = clampNumber(
      record.score + RELATIONSHIP_RULES.repairBond,
      -100,
      100
    );
    remember(record, 'repaired', day);
    report.push(
      `${RELATIONSHIP_CONTENT[id].name}: repair demonstrated over two shifts. Bond +6; breach history retained.`
    );
  } else if (!record.fulfillments) {
    record.fulfillments = 1;
    record.stage = 'fulfilled';
    record.score = clampNumber(
      record.score + RELATIONSHIP_RULES.fulfillmentBond,
      -100,
      100
    );
    lab.morale = clampNumber(lab.morale + 2, 0, 100);
    remember(record, 'fulfilled', day);
    report.push(
      `${RELATIONSHIP_CONTENT[id].name}: commitment demonstrated over two shifts. Bond +8, morale +2 once.`
    );
  } else record.stage = record.repairs ? 'repaired' : 'fulfilled';
}

/**
 * Synchronize visible bonds after real events while retaining unrelated actors.
 * @param {Record<string, any>} lab Campaign.
 * @returns {Record<string, number>} Actual personal scores for shared-world callbacks.
 */
export function relationshipBonds(lab) {
  /** @type {Record<string, number>} */
  const scores = {};
  for (const [id, record] of Object.entries(lab.relationships)) {
    scores[id] = record.score;
    const person = lab.employees.find(
      (/** @type {Record<string, any>} */ entry) => entry.id === id
    );
    if (person) person.relationship = record.score;
  }
  return scores;
}

/**
 * Author remembered, contextual scenes and exact actionable terms for inspection.
 * @param {Record<string, any>} lab Campaign.
 * @param {string} id Authored colleague.
 * @param {Record<string, any>} flow Current capacity and evidence.
 * @returns {{text:string}[]} Unpaginated scene paragraphs for both presenters.
 */
export function relationshipPages(lab, id, flow) {
  const definition = RELATIONSHIP_CONTENT[id];
  const record = lab.relationships[id];
  return [
    { text: relationshipScene(lab, id) },
    {
      text: `${definition.name}: ${definition.promise}. ${definition.condition} Current condition: ${relationshipConditions(lab, flow)[id]}. Acceptance takes one attention, grants no fulfillment or instant reward. Two actual shifts prove a promise.`,
    },
    {
      text: `Bond ${record.score}; fulfillment ${record.fulfillments}; disagreement ${record.disagreements}; breaches ${record.breaches}; repairs ${record.repairs}. A breach is charged once after a full warning. Repair needs the real cause corrected, ${definition.repairCost}k, one attention and two future proof shifts. History is never erased.`,
    },
    {
      text: `Remembered: ${record.events.map((/** @type {Record<string, any>} */ event) => `${event.type} on shift ${event.day}`).join('; ') || 'no invented past decisions'}. Disagreement uses one attention, at most once per shift, and is not withdrawal from an existing commitment.`,
    },
  ];
}

/**
 * Choose the same remembered personal scene in conversations and portable menus.
 * @param {Record<string, any>} lab Current ledger.
 * @param {string} id Authored colleague.
 * @returns {string} Current scene, including disagreement without a promise.
 */
export function relationshipScene(lab, id) {
  const record = lab.relationships[id];
  const stage =
    record.stage === 'none' && record.disagreements
      ? 'disagreement'
      : record.stage;
  return RELATIONSHIP_CONTENT[id].scenes[stage];
}

/**
 * Validate policies and memories without repairing corrupt current imports.
 * @param {Record<string, any>} lab Candidate campaign.
 * @param {number} day Candidate current shift.
 * @returns {boolean} Whether every authored arc and policy fits its accounting.
 */
export function validRelationships(lab, day) {
  const policies = lab.commitmentPolicies;
  return Boolean(
    lab.relationships &&
      Object.keys(lab.relationships).length === 4 &&
      Array.isArray(lab.promises) &&
      new Set(lab.promises).size === lab.promises.length &&
      lab.promises.every((/** @type {string} */ id) =>
        Object.hasOwn(RELATIONSHIP_CONTENT, id)
      ) &&
      Object.keys(RELATIONSHIP_CONTENT).every(id =>
        validRecord(lab, id, day)
      ) &&
      policies &&
      typeof policies.attribution === 'boolean' &&
      typeof policies.register === 'boolean' &&
      policies.consultations &&
      Object.keys(policies.consultations).length === 2 &&
      PUBLIC_PROGRAMS.every(id =>
        validConsultation(policies.consultations[id], id)
      )
  );
}

/**
 * Accept old reviewed terms even when current settings have legitimately changed.
 * @param {Record<string, any> | null} terms Saved review.
 * @param {string} id Authored public model.
 * @returns {boolean} Whether a review is bounded authored data.
 */
function validConsultation(terms, id) {
  return (
    terms === null ||
    Boolean(
      terms &&
        Object.keys(terms).length === 3 &&
        terms.data === 'licensed' &&
        terms.oversight !== 'autonomous' &&
        Object.hasOwn(researchOptions(id, 'oversight'), terms.oversight) &&
        Object.hasOwn(
          researchOptions(id, 'specialization'),
          terms.specialization
        )
    )
  );
}

/**
 * Reject contradictory stage, counter and future-memory claims.
 * @param {Record<string, any>} lab Candidate campaign.
 * @param {string} id Authored colleague.
 * @param {number} day Current saved shift.
 * @returns {boolean} Whether the personal record is consistent.
 */
function validRecord(lab, id, day) {
  const record = lab.relationships[id];
  return Boolean(
    record &&
      STAGES.includes(record.stage) &&
      Number.isFinite(record.score) &&
      record.score >= -100 &&
      record.score <= 100 &&
      [
        'fulfillments',
        'disagreements',
        'breaches',
        'repairs',
        'streak',
        'warnedAt',
        'disagreedAt',
      ].every(
        key =>
          Number.isInteger(record[key]) &&
          record[key] >= 0 &&
          record[key] <= 1000
      ) &&
      record.fulfillments <= 1 &&
      record.repairs <= record.breaches &&
      record.streak <= RELATIONSHIP_RULES.proofShifts &&
      record.warnedAt <= day &&
      record.disagreedAt <= day &&
      (record.stage === 'none') === !lab.promises.includes(id) &&
      (!['fulfilled', 'repaired'].includes(record.stage) ||
        record.fulfillments === 1) &&
      (!['breached', 'repairing', 'repaired'].includes(record.stage) ||
        record.breaches > 0) &&
      (record.stage !== 'repaired' || record.repairs > 0) &&
      Array.isArray(record.events) &&
      record.events.length <= 12 &&
      record.events.every(
        (/** @type {Record<string, any>} */ event) =>
          event &&
          EVENTS.includes(event.type) &&
          Number.isInteger(event.day) &&
          event.day > 0 &&
          event.day <= day
      )
  );
}

/**
 * Add future arcs without changing inherited operating or financial histories.
 * @param {Record<string, any>} state Rules-five campaign.
 * @returns {Record<string, any>} Upgraded candidate, or untouched invalid/current save.
 */
export function migrateRelationships(state) {
  if (
    state.lab?.rulesVersion !== 5 ||
    !validPersonnel(state.lab) ||
    !validPrograms(state.lab) ||
    !validEvaluations(state.lab) ||
    !validDeployments(state.lab) ||
    !Array.isArray(state.lab.promises) ||
    !state.world ||
    !Number.isInteger(state.world.day)
  )
    return state;
  const ledger = {
    ...state.lab,
    rulesVersion: 6,
    relationships: createRelationships(state.lab, state.world.relationships),
    commitmentPolicies: createCommitmentPolicies(),
  };
  const upgraded = {
    ...state,
    lab: ledger,
    toast:
      'Relationship ledger upgraded. Existing promises stay active, without invented fulfillment or breaches. Balances, service and original backup preserved.',
  };
  return validRelationships(upgraded.lab, state.world.day) ? upgraded : state;
}
