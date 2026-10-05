import { INFRASTRUCTURE } from './infrastructure.js';
import { researchOptions } from './research.js';

/**
 * Create the bounded inverse ledger for uncommitted shift orders.
 * @returns {{orders: object[]}} Empty planning history.
 */
export function createPlanning() {
  return { orders: [] };
}

/**
 * Run a reversible order and retain only its field-specific inverse.
 * @param {Record<string, any>} state Campaign before the order.
 * @param {string} command Authored controller operation.
 * @param {Function} execute Existing management command boundary.
 * @returns {Record<string, any>} Applied campaign and updated undo history.
 */
export function applyPlanningOrder(state, command, execute) {
  const inverse = describeOrder(state.lab, command);
  if (!inverse) return execute(state, command);
  const applied = execute(state, command);
  if (applied.lab.decisions !== state.lab.decisions - 1) return applied;
  const planning = { orders: state.lab.planning.orders.concat(inverse) };
  const lab = Object.assign({}, applied.lab, { planning });
  return Object.assign({}, applied, { lab });
}

/**
 * Refund and reverse the latest valid draft without rolling back other actions.
 * @param {Record<string, any>} state Current campaign.
 * @returns {Record<string, any>} Campaign after one inverse operation.
 */
export function undoPlanningOrder(state) {
  const orders = state.lab.planning.orders;
  if (!orders.length) return { ...state, toast: 'No draft order to undo.' };
  if (!validPlanning(state.lab)) return planningNotice(state);
  const lab = structuredClone(state.lab);
  const [inverse] = lab.planning.orders.splice(-1);
  applyInverse(lab, inverse);
  return planningNotice(
    state,
    `Undid ${inverse.kind} order. Its price and attention were returned.`,
    lab
  );
}

/**
 * Reverse every pending draft, preserving intervening permanent decisions.
 * @param {Record<string, any>} state Current campaign.
 * @returns {Record<string, any>} Campaign after clearing the reversible plan.
 */
export function clearPlanningOrders(state) {
  const lab = structuredClone(state.lab);
  if (!validPlanning(lab)) return planningNotice(state);
  const orders = lab.planning.orders.splice(0).reverse();
  if (!orders.length)
    return { ...state, toast: 'The planning draft is empty.' };
  for (const inverse of orders) applyInverse(lab, inverse);
  return planningNotice(
    state,
    `Cleared ${orders.length} draft orders; their prices and attention were returned.`,
    lab
  );
}

/**
 * Validate the inverse stack against the exact currently applied fields.
 * @param {Record<string, any>} lab Imported management ledger.
 * @returns {boolean} Whether every inverse is safe and bounded.
 */
export function validPlanning(lab) {
  const orders = lab.planning?.orders;
  if (
    !lab.planning ||
    Object.keys(lab.planning).length !== 1 ||
    !Array.isArray(orders) ||
    orders.length > 6
  )
    return false;
  if (
    orders.length &&
    (!lab.programs || !lab.infrastructure || !Array.isArray(lab.employees))
  )
    return false;
  const projected = structuredClone(lab);
  return [...orders].reverse().every(inverse => {
    if (!validInverse(projected, inverse)) return false;
    applyInverse(projected, inverse);
    return true;
  });
}

/**
 * Upgrade an older Neon campaign with an empty planning ledger.
 * @param {Record<string, any>} state Legacy game state.
 * @returns {Record<string, any>} Current campaign or unchanged state.
 */
export function migratePlanning(state) {
  if (state.lab?.rulesVersion !== 10) return state;
  return {
    ...state,
    lab: { ...state.lab, rulesVersion: 11, planning: createPlanning() },
    toast: 'Planning Desk unlocked. Existing campaign decisions are preserved.',
  };
}

/**
 * Derive an inverse only for the three explicitly reversible command families.
 * @param {Record<string, any>} lab Current management ledger.
 * @param {string} command Candidate operation.
 * @returns {Record<string, any> | undefined} Trusted inverse when reversible.
 */
function describeOrder(lab, command) {
  const parts = command.split(':');
  if (parts[0] === 'assign' && parts.length === 3) {
    const person = findEmployee(lab, parts[1]);
    if (person && ['research', 'safety', 'service'].includes(parts[2]))
      return {
        kind: 'assignment',
        employee: person.id,
        from: person.role,
        to: parts[2],
      };
  }
  if (parts[0] === 'configure' && parts.length === 3) {
    const project = lab.focus;
    const options = researchOptions(project, parts[1]);
    const option = options[parts[2]];
    if (option && lab.programs[project].settings[parts[1]] !== parts[2])
      return {
        kind: 'configuration',
        project,
        axis: parts[1],
        from: lab.programs[project].settings[parts[1]],
        to: parts[2],
        previousEvaluation: lab.evaluated[project],
      };
  }
  if (parts[0] === 'infra' && parts.length === 2 && INFRASTRUCTURE[parts[1]])
    return {
      kind: 'infrastructure',
      id: parts[1],
      countBefore: lab.infrastructure[parts[1]],
    };
  return undefined;
}

/**
 * Find a named employee in the current roster.
 * @param {Record<string, any>} lab Current management ledger.
 * @param {string} id Stable employee identity.
 * @returns {Record<string, any> | undefined} Matching employee when present.
 */
function findEmployee(lab, id) {
  return lab.employees.find(
    (/** @type {Record<string, any>} */ person) => person.id === id
  );
}

/**
 * Check a single inverse while walking the stack from newest to oldest.
 * @param {Record<string, any>} lab Projected current ledger.
 * @param {Record<string, any>} inverse Candidate inverse entry.
 * @returns {boolean} Whether the entry matches the live authored fields.
 */
function validInverse(lab, inverse) {
  if (!inverse || typeof inverse !== 'object') return false;
  if (inverse.kind === 'assignment') {
    const person = findEmployee(lab, inverse.employee);
    return Boolean(
      Object.keys(inverse).length === 4 &&
        person &&
        ['research', 'safety', 'service'].includes(inverse.from) &&
        ['research', 'safety', 'service'].includes(inverse.to) &&
        person.role === inverse.to
    );
  }
  if (inverse.kind === 'configuration') {
    if (!['atlas', 'ghost', 'lumen'].includes(inverse.project)) return false;
    if (!(inverse.project in lab.programs)) return false;
    const options = researchOptions(inverse.project, inverse.axis);
    return Boolean(
      Object.keys(inverse).length === 6 &&
        Object.hasOwn(options, inverse.from) &&
        Object.hasOwn(options, inverse.to) &&
        Number.isFinite(inverse.previousEvaluation) &&
        lab.programs[inverse.project].settings[inverse.axis] === inverse.to
    );
  }
  if (inverse.kind === 'infrastructure') {
    const option = INFRASTRUCTURE[inverse.id];
    return Boolean(
      Object.keys(inverse).length === 3 &&
        option &&
        Object.hasOwn(INFRASTRUCTURE, inverse.id) &&
        Number.isInteger(inverse.countBefore) &&
        lab.infrastructure[inverse.id] === inverse.countBefore + 1 &&
        inverse.countBefore < option.limit &&
        lab.compute >= option.compute &&
        lab.cooling >= option.cooling
    );
  }
  return false;
}

/**
 * Apply only the saved inverse fields, never a whole historical lab snapshot.
 * @param {Record<string, any>} lab Mutable management ledger.
 * @param {Record<string, any>} inverse Validated inverse order.
 * @returns {void} Targeted ledger mutation.
 */
function applyInverse(lab, inverse) {
  if (inverse.kind === 'assignment') {
    const person = /** @type {Record<string, any>} */ (
      findEmployee(lab, inverse.employee)
    );
    lab.teams[person.role]--;
    person.role = inverse.from;
    lab.teams[person.role]++;
  }
  if (inverse.kind === 'configuration') {
    const option = researchOptions(inverse.project, inverse.axis)[inverse.to];
    lab.cash += option.cost;
    lab.programs[inverse.project].settings[inverse.axis] = inverse.from;
    if (lab.evaluated[inverse.project] === 0)
      lab.evaluated[inverse.project] = inverse.previousEvaluation;
  }
  if (inverse.kind === 'infrastructure') {
    const option = INFRASTRUCTURE[inverse.id];
    lab.cash += option.cost;
    lab.infrastructure[inverse.id]--;
    lab.compute -= option.compute;
    lab.cooling -= option.cooling;
  }
  lab.decisions = Math.min(6, lab.decisions + 1);
}

/**
 * Return consistent Planning Desk feedback without replacing unrelated state.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} [toast] Player-facing operation result.
 * @param {Record<string, any>} [lab] Updated lab ledger, if an order changed.
 * @returns {Record<string, any>} Campaign carrying the Planning Desk result.
 */
function planningNotice(
  state,
  toast = 'Planning history is invalid; nothing was changed.',
  lab
) {
  const result = { ...state, toast };
  return lab ? { ...result, lab } : result;
}
