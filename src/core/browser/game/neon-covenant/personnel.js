import { createIncidentChains, incidentThoughts } from './incidents.js';
import { deploymentForecast } from './operations.js';

/** @type {Record<string, any>} Authored employees and recruit candidates. */
export const PERSONNEL = {
  ada: {
    name: 'Ada',
    role: 'research',
    specialty: 'clinical reliability',
    wage: 3,
  },
  jun: {
    name: 'Jun',
    role: 'research',
    specialty: 'language coverage',
    wage: 3,
  },
  sable: {
    name: 'Sable',
    role: 'safety',
    specialty: 'adversarial testing',
    wage: 3,
  },
  ion: {
    name: 'Ion',
    role: 'service',
    specialty: 'thermal engineering',
    wage: 3,
  },
  tess: { name: 'Tess', role: 'safety', specialty: 'data rights', wage: 3 },
  rafi: {
    name: 'Rafi',
    role: 'research',
    specialty: 'efficient models',
    wage: 3,
  },
  nell: { name: 'Nell', role: 'service', specialty: 'clinic support', wage: 3 },
  bao: {
    name: 'Bao',
    role: 'research',
    specialty: 'agent permissions',
    wage: 3,
  },
  kit: {
    name: 'Kit',
    role: 'service',
    specialty: 'hardware recovery',
    wage: 3,
  },
  ora: { name: 'Ora', role: 'safety', specialty: 'community review', wage: 3 },
};

/** @type {string[]} The four people on the inherited payroll. */
const FOUNDERS = ['ada', 'jun', 'sable', 'ion'];

/**
 * Instantiate mutable personal state from an authored employee.
 * @param {string} id Employee identity.
 * @param {number} morale Inherited morale.
 * @returns {Record<string, any>} Persistent employee.
 */
function employee(id, morale) {
  return { id, ...PERSONNEL[id], fatigue: 0, morale, relationship: 0 };
}

/**
 * Start a roster with two researchers, one evaluator and one operator.
 * @returns {Record<string, any>[]} Independent employee records.
 */
export function createPersonnel() {
  return FOUNDERS.map(id => employee(id, 75));
}

/**
 * Count the actual people assigned to each operating team.
 * @param {Record<string, any>[]} employees Persistent roster.
 * @returns {Record<string, number>} Derived staffing totals.
 */
export function personnelTeams(employees) {
  const counts = /** @type {Record<string, number>} */ ({
    research: 0,
    safety: 0,
    service: 0,
  });
  for (const person of employees) counts[person.role]++;
  return counts;
}

/**
 * Generate actionable concerns from current conditions, never a random reroll.
 * @param {Record<string, any>} lab Lab ledger.
 * @param {Record<string, any>} person Employee to consult.
 * @returns {string[]} Current employee thoughts.
 */
export function employeeThoughts(lab, person) {
  const concerns = incidentThoughts(lab, person.id);
  if (person.fatigue >= 40)
    concerns.push(
      'I need recovery time. Protect a shift or arrange team rest.'
    );
  if (lab.cooling < lab.compute)
    concerns.push(
      'Cooling cannot serve every rack. Ask Ion about repairs before buying more compute.'
    );
  if (lab.data === 'scraped')
    concerns.push(
      'Who consented to this dataset? Switch to licensed data or resolve the rights complaint.'
    );
  if (!lab.teams.safety)
    concerns.push(
      'Nobody is evaluating our work. Assign someone to safety before release.'
    );
  const services = deploymentForecast(lab);
  if (services.supportDemand > services.supportCapacity)
    concerns.push(
      'Support is overloaded. Assign an operator before taking more users.'
    );
  if (!concerns.length)
    concerns.push(
      `My ${person.specialty} work has room to breathe. Thank you for listening.`
    );
  return concerns;
}

/**
 * Check a versioned roster without repairing corrupt current saves.
 * @param {Record<string, any>} lab Candidate ledger.
 * @returns {boolean} Whether all roster accounting agrees.
 */
export function validPersonnel(lab) {
  if (
    ![1, 2, 3, 4, 5, 6, 7, 8].includes(lab.rulesVersion) ||
    !Array.isArray(lab.employees)
  )
    return false;
  if (!lab.employees.every(validEmployee)) return false;
  const ids = lab.employees.map(person => person.id);
  if (new Set(ids).size !== ids.length) return false;
  const totals = personnelTeams(lab.employees);
  return (
    lab.hired === ids.length &&
    Object.keys(totals).every(role => totals[role] === lab.teams?.[role])
  );
}

/**
 * Validate a portable individual before any roster calculations.
 * @param {Record<string, any>} person Imported employee.
 * @returns {boolean} Whether identity and personal metrics are valid.
 */
function validEmployee(person) {
  return Boolean(
    person &&
      typeof person.id === 'string' &&
      typeof person.name === 'string' &&
      typeof person.specialty === 'string' &&
      ['research', 'safety', 'service'].includes(person.role) &&
      ['wage', 'fatigue', 'morale', 'relationship'].every(key =>
        Number.isFinite(person[key])
      ) &&
      person.wage === 3 &&
      person.fatigue >= 0 &&
      person.fatigue <= 100 &&
      person.morale >= 0 &&
      person.morale <= 100
  );
}

/**
 * Reconstruct legacy people to exactly match saved team counts and payroll.
 * @param {Record<string, any>} lab Legacy ledger.
 * @returns {Record<string, any>[]} Named roster preserving assignments.
 */
function legacyPersonnel(lab) {
  const people = [];
  const available = [...FOUNDERS];
  for (const role of ['research', 'safety', 'service']) {
    for (let index = 0; index < lab.teams[role]; index++) {
      const match =
        available.find(id => PERSONNEL[id].role === role) || available[0];
      const person = /** @type {Record<string, any>} */ (
        match
          ? employee(match, lab.morale)
          : legacyColleague(people.length, lab.morale)
      );
      person.role = role;
      people.push(person);
      available.splice(available.indexOf(match), 1);
    }
  }
  return people;
}

/**
 * Preserve anonymous legacy hires without pretending they are new candidates.
 * @param {number} index Stable roster position.
 * @param {number} morale Legacy morale.
 * @returns {Record<string, any>} Migrated colleague.
 */
function legacyColleague(index, morale) {
  return {
    id: `legacy-${index}`,
    name: `Colleague ${index + 1}`,
    specialty: 'legacy lab operations',
    wage: 3,
    fatigue: 0,
    morale,
    relationship: 0,
  };
}

/**
 * Upgrade only unversioned ledgers; invalid inputs remain invalid for validation.
 * @param {Record<string, any>} state Portable campaign.
 * @returns {Record<string, any>} Migrated state or original candidate.
 */
export function migratePersonnel(state) {
  const lab = state.lab;
  if (lab?.rulesVersion === 1 && validPersonnel(lab))
    return {
      ...state,
      lab: {
        ...lab,
        rulesVersion: 2,
        incidentChains: createIncidentChains(),
        lastIncidentCost: 0,
        incidentGrace: 2,
        introductionComplete: true,
        remoteAdministration: true,
      },
      toast:
        'Incident rules upgraded. Ledger preserved; two protected settlements. Original slot backed up.',
    };
  if (!lab || Object.hasOwn(lab, 'rulesVersion')) return state;
  if (
    !lab.teams ||
    !['research', 'safety', 'service'].every(
      role =>
        Number.isInteger(lab.teams[role]) &&
        lab.teams[role] >= 0 &&
        lab.teams[role] <= 100
    )
  )
    return state;
  if (
    Object.values(lab.teams).reduce((sum, count) => sum + count, 0) !==
    lab.hired
  )
    return state;
  const migrated = {
    ...lab,
    rulesVersion: 2,
    incidentChains: createIncidentChains(),
    lastIncidentCost: 0,
    employees: legacyPersonnel(lab),
    introductionComplete: true,
    remoteAdministration: true,
    incidentGrace: 2,
  };
  return {
    ...state,
    lab: migrated,
    toast:
      'Save upgraded. Ledger preserved; original slot backed up. X: lab menu.',
  };
}

/**
 * Execute an explicit personnel order, leaving rejected orders untouched.
 * @param {Record<string, any>} lab Mutable cloned ledger.
 * @param {string} command Named assignment or candidate hire.
 * @returns {string} Director feedback.
 */
export function personnelOrder(lab, command) {
  const [kind, id, role] = command.split(':');
  if (kind === 'assign') return reassign(lab, id, role);
  const candidate = PERSONNEL[id];
  if (!candidate || FOUNDERS.includes(id))
    return 'Choose a named recruit at the staff console.';
  if (
    lab.employees.some(
      (/** @type {Record<string, any>} */ person) => person.id === id
    )
  )
    return 'This colleague already works here.';
  if (lab.cash < 18) return 'Need 18k credits. Order rejected.';
  lab.cash -= 18;
  lab.employees.push(employee(id, lab.morale));
  refreshTeams(lab);
  return `${candidate.name} hired: ${candidate.specialty}. Payroll +3k/shift.`;
}

/**
 * Assign a selected person, not an automatically chosen donor.
 * @param {Record<string, any>} lab Mutable ledger.
 * @param {string} id Selected employee.
 * @param {string} role Destination team.
 * @returns {string} Assignment feedback.
 */
function reassign(lab, id, role) {
  const person = lab.employees.find(
    (/** @type {Record<string, any>} */ entry) => entry.id === id
  );
  if (!person || !['research', 'safety', 'service'].includes(role))
    return 'Choose an employee and a valid team.';
  if (person.role === role) return `${person.name} already works in ${role}.`;
  person.role = role;
  refreshTeams(lab);
  return `${person.name} assigned to ${role}. Their specialty remains ${person.specialty}.`;
}

/**
 * Keep compatibility totals derived from the roster after a personnel order.
 * @param {Record<string, any>} lab Mutable ledger.
 */
function refreshTeams(lab) {
  lab.teams = personnelTeams(lab.employees);
  lab.hired = lab.employees.length;
}

/**
 * Settle personal fatigue alongside the existing economic shift.
 * @param {Record<string, any>} lab Mutable ledger.
 */
export function settlePersonnel(lab) {
  const strain = /** @type {Record<string, number>} */ ({
    balanced: 3,
    sprint: 10,
    careful: -8,
  })[lab.policy];
  for (const person of lab.employees) {
    person.fatigue = Math.max(0, Math.min(100, person.fatigue + strain));
    person.morale = lab.morale;
  }
}
