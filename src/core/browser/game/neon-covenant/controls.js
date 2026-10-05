import {
  RELATIONSHIP_CONTENT,
  RELATIONSHIP_RULES,
} from './relationshipContent.js';
import { LAB_CONTENT } from './content.js';
import { forecast } from './management.js';
import { PERSONNEL } from './personnel.js';
import { forecastShift, labReportLines } from './forecast.js';
import { orientationEntries, orientationRows } from './orientation.js';
import { researchOptions } from './research.js';
import { EVALUATION_CASES } from './evaluationContent.js';
import { evaluationStatus } from './evaluation.js';
import { INFRASTRUCTURE, infrastructureEffects } from './infrastructure.js';
import { DEPLOYMENT_PROFILES, OPERATING_RULES } from './operationsContent.js';
import { availableContractPackages, contractTerms } from './contracts.js';
import {
  actForShift,
  availableChapterScenes,
  chapterSceneLabel,
} from './campaign.js';
import { SCENARIOS } from './scenarios.js';

/**
 * Render the selected window consistently across bounded handheld menus.
 * @param {Record<string, any>} state Open menu state.
 * @returns {string[]} Three visible choices, including the selected marker.
 */
function selectionRows(state) {
  const start = Math.max(0, state.menu.selected - 2);
  return labEntries(state)
    .slice(start, start + 3)
    .map(
      ([label], index) =>
        `${start + index === state.menu.selected ? '›' : ' '} ${label}`
    );
}

/**
 * Route evidence work to Sable while pricing the actual paid interventions.
 * @param {string} prefix Preview or commit operation prefix.
 * @returns {string[][]} Authored incident-navigation rows.
 */
function incidentRows(prefix) {
  return Object.entries(LAB_CONTENT.incidents).map(([id, definition]) =>
    incidentRow(prefix, id, definition)
  );
}

/**
 * Describe a single recovery action without inventing blanket release evidence.
 * @param {string} prefix Preview or commit instruction.
 * @param {string} id Authored incident.
 * @param {Record<string, any>} definition Disclosed costs and response.
 * @returns {string[]} Price label and operation.
 */
function incidentRow(prefix, id, definition) {
  if (id === 'evaluation') return ['Sable / inspect test cases', 'page:tests'];
  return [
    `${definition.name} / ${definition.responseCost}k`,
    `${prefix}:${id}`,
  ];
}

/**
 * List individual partner standings in the stakeholder controller.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[][]} Authored groups and visible scores.
 */
function stakeholderEntries(state) {
  return Object.entries(LAB_CONTENT.stakeholders)
    .map(([id, entry]) => [
      `${entry.name} / ${state.lab.stakeholderStanding[id]}`,
      `page:stakeholder:${id}`,
    ])
    .concat([['Back to lab', 'page:main']]);
}

/**
 * List actions available for one stakeholder profile.
 * @param {string} page Stakeholder controller page.
 * @returns {string[][]} Conversation and return actions.
 */
function stakeholderProfileEntries(page) {
  return [
    ['Hear their concerns', `stakeholder-story:${page.slice(12)}`],
    ['All stakeholders', 'page:stakeholders'],
  ];
}

/**
 * List authored personal arcs and available relationship orders.
 * @param {string} page Relationship profile controller page.
 * @returns {string[][]} Story, promise and earned interaction actions.
 */
function relationshipEntries(page) {
  const id = page.slice(13);
  const person = RELATIONSHIP_CONTENT[id];
  const rows = [
    ['Read story and terms', `arc-story:${id}`],
    ['Accept permanent promise / 1 AP', `promise:${id}`],
    ['Disagree / 1 AP', `arc:disagree:${id}`],
    [`Repair / ${person.repairCost}k / 1 AP`, `arc:repair:${id}`],
  ];
  if (id === 'ada')
    rows.push([
      `Protect authors / ${RELATIONSHIP_RULES.attributionCost}k`,
      'arc:protect:ada',
    ]);
  if (id === 'ion') rows.push(['Inspect operating limits', 'page:forecast']);
  if (id === 'sable')
    rows.push(
      ['Publish register / 12k', 'audit'],
      ['Review test evidence', 'page:tests']
    );
  if (id === 'mae')
    rows.push(
      ['Review Atlas / 1 AP', 'arc:consult:atlas'],
      ['Review Lumen / 1 AP', 'arc:consult:lumen']
    );
  return rows.concat([['Other relationships', 'page:relationships']]);
}

/**
 * List authored packages for a client agreement.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string} page Contract controller page.
 * @returns {string[][]} Available package offers and return action.
 */
function contractEntries(state, page) {
  const id = page.slice(9);
  const offers = state.lab.contracts.includes(id)
    ? []
    : availableContractPackages(state.lab, id).map(packageId => {
        const offer = LAB_CONTENT.contracts[id].packages[packageId];
        return [
          `${offer.name} / +${offer.advance}k`,
          `contract-offer:${id}:${packageId}`,
        ];
      });
  return offers.concat([['All agreements', 'page:contracts']]);
}

/**
 * Build selectable rows from the current terminal or handheld menu.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[][]} Labels and operations.
 */
export function labEntries(state) {
  const page = state.menu.page;
  if (page === 'scenarios')
    return Object.entries(SCENARIOS)
      .map(([id, scenario]) => [scenario.name, `scenario:brief:${id}`])
      .concat([['Back to lab', 'page:main']]);
  if (page === 'planning')
    return [
      [`Undo latest / ${state.lab.planning.orders.length}`, 'plan:undo'],
      [`Clear draft / ${state.lab.planning.orders.length}`, 'plan:clear'],
      ['Back to lab', 'page:main'],
    ];
  if (page === 'distress')
    return [
      ['Inspect Helios bridge note', 'rescue-offer:heliosBridge'],
      ['Inspect clinic cooperative note', 'rescue-offer:clinicCovenant'],
      ['Back to lab', 'page:main'],
    ];
  if (page === 'campaign')
    return [
      ['Current act briefing', 'campaign-story:act'],
      ...availableChapterScenes(state.lab, state.world.day).map(id => [
        chapterSceneLabel(id),
        `campaign-story:${id}`,
      ]),
      ['Back to lab', 'page:main'],
    ];
  if (page === 'relationships')
    return Object.entries(RELATIONSHIP_CONTENT)
      .map(([id, person]) => [person.name, `page:relationship:${id}`])
      .concat([['Back to lab', 'page:main']]);
  if (page === 'stakeholders') return stakeholderEntries(state);
  if (page.startsWith('stakeholder:')) return stakeholderProfileEntries(page);
  if (page.startsWith('relationship:')) return relationshipEntries(page);
  if (page === 'operations')
    return [
      ['Read clients and invoices', 'operations-story'],
      ...Object.keys(DEPLOYMENT_PROFILES).map(id => [
        id,
        `page:deployment:${id}`,
      ]),
      ['Back to lab', 'page:main'],
    ];
  if (page.startsWith('deployment:')) {
    const id = page.slice(11);
    return [
      ['Inspect clients and costs', 'operations-story'],
      [
        `Maintain / ${DEPLOYMENT_PROFILES[id].maintenanceCost}k`,
        `service:maintain:${id}`,
      ],
      [`Triage queue / ${OPERATING_RULES.triageCost}k`, `service:triage:${id}`],
      ['Other deployments', 'page:operations'],
    ];
  }
  if (page === 'tests')
    return Object.entries(EVALUATION_CASES[state.lab.focus])
      .map(([id, test]) => [test.name, `page:testcase:${id}`])
      .concat([['Back to research', 'page:research']]);
  if (page.startsWith('testcase:')) {
    const id = page.slice(9);
    return [
      ['Read case and evidence', `case:${id}`],
      ['Run probe / 2k / 2 TC', `test:probe:${id}`],
      ['Investigate / 2k / 1 TC', `test:investigate:${id}`],
      ['Fix / 4k / 3 TC', `test:fix:${id}`],
      ['Other cases', 'page:tests'],
    ];
  }
  if (page === 'orientation') return orientationEntries(state);
  if (page === 'program')
    return [
      ['Program and milestones', 'program-story'],
      ...['size', 'hosting', 'specialization', 'oversight'].map(axis => [
        axis,
        `page:setting:${axis}`,
      ]),
      ['Back to research', 'page:research'],
    ];
  if (page.startsWith('setting:')) {
    const axis = page.slice(8);
    return Object.entries(researchOptions(state.lab.focus, axis))
      .map(([value, option]) => [
        `${option.name} / ${state.lab.programs[state.lab.focus].settings[axis] === value ? 'active' : `${option.cost}k`}`,
        `setting:${axis}:${value}`,
      ])
      .concat([['Back to program', 'page:program']]);
  }
  if (page === 'incidents')
    return incidentRows('preview:incident').concat([
      ['Commit a response', 'page:responses'],
      ['Back', 'page:main'],
    ]);
  if (page === 'responses')
    return incidentRows('incident').concat([
      ['Inspect costs first', 'page:incidents'],
    ]);
  const named = (
    /** @type {Record<string, any>} */ records,
    /** @type {string} */ prefix
  ) =>
    Object.entries(records).map(([id, entry]) => [
      entry.name,
      `${prefix}:${id}`,
    ]);
  if (page === 'research')
    return [
      ...named(LAB_CONTENT.projects, 'focus'),
      ['Sable / test cases', 'page:tests'],
      ['Deploy evaluated model', 'deploy'],
      ['Configure program', 'page:program'],
    ];
  if (page === 'forecast')
    return [
      ['Read shift forecast', 'preview-shift'],
      ['Compare possible orders', 'page:comparisons'],
      ['Back to ledger', 'page:ledger'],
    ];
  if (page === 'comparisons')
    return [
      ['Compute / 30k', 'preview:racks'],
      ['Cooling / 20k', 'preview:cooling'],
      ['Protected shifts', 'preview:policy:careful'],
      ['Move Jun to service', 'preview:assign:jun:service'],
      ['Back to forecast', 'page:forecast'],
    ];
  if (page === 'infrastructure' || page === 'rack')
    return [
      ['Add compute / 30k', 'racks'],
      ['Add cooling / 20k', 'cooling'],
      ...Object.entries(INFRASTRUCTURE).map(([id, option]) => [
        `${option.name} / ${option.cost}k`,
        `infra-choice:${id}`,
      ]),
      ['Balanced shifts', 'policy:balanced'],
      ['Protected shifts', 'policy:careful'],
      ['Sprint / burnout risk', 'policy:sprint'],
    ];
  if (page === 'contracts')
    return Object.entries(LAB_CONTENT.contracts)
      .map(([id, deal]) => [deal.name, `page:contract:${id}`])
      .concat([['Stakeholder standings', 'page:stakeholders']]);
  if (page.startsWith('contract:')) return contractEntries(state, page);
  if (page === 'recruitment')
    return [
      ...state.lab.employees.map(
        (/** @type {Record<string, any>} */ person) => [
          `${person.name} / ${person.role}`,
          `page:employee:${person.id}`,
        ]
      ),
      ['Recruit candidates', 'page:candidates'],
      ['Employee inbox', 'page:inbox'],
    ];
  if (page.startsWith('employee:'))
    return ['research', 'safety', 'service']
      .map(role => [`Assign to ${role}`, `assign:${page.slice(9)}:${role}`])
      .concat([['Listen to concerns', `thoughts:${page.slice(9)}`]]);
  if (page === 'candidates')
    return Object.entries(PERSONNEL)
      .filter(
        ([id]) =>
          !['ada', 'jun', 'sable', 'ion'].includes(id) &&
          !state.lab.employees.some(
            (/** @type {Record<string, any>} */ person) => person.id === id
          )
      )
      .map(([id, person]) => [
        `${person.name} / ${person.role} / 18k`,
        `hire:${id}`,
      ])
      .concat([['Staff console', 'page:recruitment']]);
  if (page === 'inbox')
    return state.lab.employees.map(
      (/** @type {Record<string, any>} */ person) => [
        person.name,
        `page:employee:${person.id}`,
      ]
    );
  if (page === 'evaluation')
    return [
      ['Sable / test cases', 'page:tests'],
      ['Publish audit / 12k', 'audit'],
      ['Deploy evaluated model', 'deploy'],
      ['Licensed data', 'data:licensed'],
      ['Scraped data / legal risk', 'data:scraped'],
    ];
  if (page === 'community')
    return [
      ['Clinic covenant', 'promise:mae'],
      ['Team recovery / 8k', 'rest'],
      ['Publish audit / 12k', 'audit'],
    ];
  if (page === 'saves')
    return [
      ['Save now', 'save'],
      ['Load slot 1', 'slot:0'],
      ['Load slot 2', 'slot:1'],
      ['Load slot 3', 'slot:2'],
      ['Export save', 'export'],
      ['Import save', 'import'],
      ['Reset this slot', 'page:reset'],
    ];
  if (page === 'reset')
    return [
      ['Keep this campaign', 'close'],
      ['Erase this slot', 'reset'],
    ];
  if (page === 'assign')
    return [
      ['Ledger', 'bind:ledger'],
      ['Research terminal', 'bind:research'],
      ['Shift report', 'bind:report'],
      ['Team console', 'bind:recruitment'],
    ];
  if (page === 'report' || page === 'archive')
    return [
      ['Next report page', 'report-next'],
      ['Back', 'page:main'],
    ];
  if (page === 'ledger' || page === 'board')
    return [
      ['End shift / permanent; clear draft', 'shift'],
      ['Repay debt / up to 20k', 'repay'],
      ['Shift report', 'page:report'],
      ['Inspect next shift', 'page:forecast'],
    ];
  return [
    ...(state.lab.distress.status === 'open'
      ? [
          [
            `Emergency runway / ${state.lab.distress.shiftsRemaining} shifts`,
            'page:distress',
          ],
        ]
      : []),
    ['Campaign / act briefing', 'page:campaign'],
    ['Ledger / end shift', 'page:ledger'],
    ['Planning Desk / undo drafts', 'page:planning'],
    ['Short scenarios / replace this slot', 'page:scenarios'],
    ['Lab dashboard', 'page:dashboard'],
    ['Incident register', 'page:incidents'],
    ['Research console', 'page:research'],
    ['Deployment operations', 'page:operations'],
    ['Contracts and partners', 'page:contracts'],
    ['Stakeholder standings', 'page:stakeholders'],
    ['People and recruitment', 'page:recruitment'],
    ['Relationships and promises', 'page:relationships'],
    ['Ion / infrastructure', 'page:infrastructure'],
    ['Shift report', 'page:report'],
    ['Story and controls', 'guide'],
    ['Assign B', 'page:assign'],
    ['Save options', 'page:saves'],
    ['Pause', 'page:paused'],
    ['Fullscreen', 'fullscreen'],
    ['Return to lab', 'close'],
    [
      state.audioMuted ? 'Sound: OFF / enable' : 'Sound: ON / mute',
      'audio-toggle',
    ],
    ['First-shift guide', 'page:orientation'],
  ];
}

/**
 * Produce compact, scrolling, pixel-font controller rows.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[]} Bounded panel lines.
 */
export function labMenuRows(state) {
  if (!state.menu) return [];
  if (['orientation', 'scenarios'].includes(state.menu.page))
    return specialMenuRows(state);
  if (state.menu.page === 'campaign') {
    const act = actForShift(state.world.day);
    return choicePanel(state, [
      `ACT / ${act.title}`,
      `SHIFT ${state.world.day} / ${act.startShift}-${act.endShift}`,
      act.pressure,
    ]);
  }
  const lab = state.lab;
  const f = forecast(lab);
  if (state.menu.page === 'planning')
    return choicePanel(state, [
      `DRAFT ${lab.planning.orders.length}/6 / ASSIGN, PROGRAM, INFRA`,
      'UNDO RETURNS PRICE AND 1 AP',
      'SHIFT / CONTRACT / PROMISE / DATA ARE FINAL',
    ]);
  if (state.menu.page === 'ledger')
    return choicePanel(state, [
      `SHIFT ${state.world.day} / CASH ${lab.cash}k`,
      'SETTLEMENT IS PERMANENT',
      'ALL DRAFT UNDO EXPIRES',
    ]);
  if (state.menu.page === 'distress')
    return choicePanel(state, [
      'EMERGENCY RUNWAY / INSOLVENCY PAUSED',
      `${lab.distress.shiftsRemaining} SETTLEMENTS TO INTERVENE`,
      lab.rescueFinancing
        ? `NOTE SIGNED / ${lab.rescueFinancing.id.toUpperCase()}`
        : 'COMPARE TWO NOTES / ONE MAY BE SIGNED',
    ]);
  if (
    state.menu.page === 'relationships' ||
    state.menu.page.startsWith('relationship:')
  ) {
    const id = state.menu.page.slice(13);
    const record = lab.relationships[id];
    return choicePanel(state, [
      record
        ? `${RELATIONSHIP_CONTENT[id].name.toUpperCase()} / ${record.stage}`
        : 'PEOPLE AND PROMISES',
      record
        ? `BOND ${record.score} PROOF ${record.streak}/2`
        : 'ACCEPTANCE IS NOT PROOF',
      record
        ? `BREACH ${record.breaches} REPAIR ${record.repairs} / PROMISES STICK`
        : `ATTENTION ${lab.decisions} CASH ${lab.cash}k`,
    ]);
  }
  if (state.menu.page === 'stakeholders')
    return choicePanel(state, [
      'WHO THE LAB AFFECTS',
      `WF ${lab.stakeholderStanding.workforce} CL ${lab.stakeholderStanding.clinic} TU ${lab.stakeholderStanding.transit}`,
      `RG ${lab.stakeholderStanding.regulator} IV ${lab.stakeholderStanding.investor} / 100`,
    ]);
  if (state.menu.page.startsWith('stakeholder:')) {
    const id = state.menu.page.slice(12);
    const entry = LAB_CONTENT.stakeholders[id];
    return choicePanel(state, [
      entry.name.toUpperCase(),
      `STANDING ${lab.stakeholderStanding[id]}/100`,
      `WATCHES: ${entry.concern.toUpperCase()}`,
    ]);
  }
  if (state.menu.page.startsWith('contract:')) {
    const id = state.menu.page.slice(9);
    const entry = LAB_CONTENT.contracts[id];
    const signed = lab.contracts.includes(id);
    const terms = contractTerms(lab, id);
    return choicePanel(state, [
      entry.name.toUpperCase(),
      signed
        ? `${terms.name.toUpperCase()} / DUE ${terms.deadline}`
        : `PROJECT ${entry.project.toUpperCase()} / UNSIGNED`,
      signed
        ? `MAX ${terms.daily}k / SERVICE ${terms.serviceCost}k`
        : `SELECT TERMS / ATTENTION ${lab.decisions}`,
    ]);
  }
  if (
    state.menu.page === 'operations' ||
    state.menu.page.startsWith('deployment:')
  ) {
    const id = state.menu.page.slice(11);
    const service = lab.deployments[id];
    return choicePanel(state, [
      service ? `${id.toUpperCase()} / SERVICE` : 'LIVE DEPLOYMENTS',
      `INFERENCE ${f.inferenceDemand}/${f.inferenceAvailable} SUPPORT ${f.supportDemand}/${f.supportCapacity}`,
      service
        ? `ADOPT ${service.adoption}% HEALTH ${service.maintenance}% Q${service.backlog}`
        : `INVOICE ${f.income}k CONSULT ${f.service}k`,
    ]);
  }
  if (state.menu.page === 'tests' || state.menu.page.startsWith('testcase:')) {
    const context =
      state.menu.page === 'tests'
        ? `PROGRAM ${lab.focus.toUpperCase()} / ${lab.research[lab.focus]}`
        : `${state.menu.page.slice(9).toUpperCase()}: ${evaluationStatus(lab, lab.focus, state.menu.page.slice(9))}`;
    return choicePanel(state, [
      'SABLE / EVALUATION',
      `TEST ${lab.testingBudget}/6 / ATTENTION ${lab.decisions}`,
      context,
    ]);
  }
  if (state.menu.page === 'program' || state.menu.page.startsWith('setting:')) {
    return [
      `${lab.focus.toUpperCase()} / PROGRAM`,
      `TRAINING ${lab.research[lab.focus]}/${LAB_CONTENT.projects[lab.focus].target}`,
      `MILESTONE: ${lab.programs[lab.focus].milestones.at(-1) || 'not yet'}`,
      ...selectionRows(state),
      'A INSPECT B BACK X CLOSE',
    ];
  }
  if (state.menu.page === 'forecast' || state.menu.page === 'comparisons') {
    const projected = forecastShift(state);
    return [
      state.menu.page.toUpperCase(),
      `CLOSE ${projected.closingCash}k / +${projected.researchGain} RESEARCH`,
      `LIMIT: ${projected.bottleneck.kind.toUpperCase()}`,
      ...labEntries(state)
        .slice(
          Math.max(0, state.menu.selected - 2),
          Math.max(0, state.menu.selected - 2) + 3
        )
        .map(
          ([label], index) =>
            `${index + Math.max(0, state.menu.selected - 2) === state.menu.selected ? '›' : ' '} ${label}`
        ),
      'A READ / B BACK / X CLOSE',
    ];
  }
  const person = lab.employees.find(
    (/** @type {Record<string, any>} */ entry) =>
      `employee:${entry.id}` === state.menu.page
  );
  const info = person
    ? [
        `${person.name}: ${person.specialty}`,
        `FATIGUE ${person.fatigue} MORALE ${person.morale}`,
      ]
    : state.menu.page === 'dashboard'
      ? [
          ...scenarioStatus(lab.scenario),
          `CASH ${lab.cash}k DEBT ${lab.debt}k`,
          `TRUST ${lab.trust} MORALE ${lab.morale}`,
          `WF${lab.stakeholderStanding.workforce} CL${lab.stakeholderStanding.clinic} TU${lab.stakeholderStanding.transit} RG${lab.stakeholderStanding.regulator} IV${lab.stakeholderStanding.investor}`,
          `RISK ${lab.risk} WATCH ${lab.scrutiny}`,
          `TEAM R${lab.teams.research} E${lab.teams.safety} S${lab.teams.service}`,
          `GPU ${f.throughput}/${f.demand} COOL ${lab.cooling}`,
          `PROGRESS +${f.progress}/SHIFT`,
        ]
      : state.menu.page === 'report' || state.menu.page === 'archive'
        ? labReportLines(lab.report).slice(
            (state.menu.reportPage || 0) * 3,
            (state.menu.reportPage || 0) * 3 + 3
          )
        : state.menu.page === 'infrastructure'
          ? [
              `COMPUTE ${lab.compute} COOLING ${lab.cooling}`,
              `EQUIPMENT ${f.infrastructure}k / SHIFT`,
              `RELIABILITY ${Math.max(0, Math.min(100, 100 + infrastructureEffects(lab).reliability))}%`,
            ]
          : [
              `${lab.cash}k / ${lab.decisions} DECISIONS`,
              `RISK ${lab.risk} / TRUST ${lab.trust}`,
            ];
  const entries = labEntries(state);
  const selected = state.menu.selected;
  const available = Math.max(1, 7 - info.length);
  const start = Math.max(0, selected - available + 1);
  return [
    state.menu.page.toUpperCase(),
    ...info,
    ...entries
      .slice(start, start + available)
      .map(
        ([label], index) => `${index + start === selected ? '›' : ' '} ${label}`
      ),
    'A CHOOSE / B BACK / X CLOSE',
  ];
}

/**
 * Resolve menus whose rows are independent of the operating ledger.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[]} Authored orientation or scenario panel.
 */
function specialMenuRows(state) {
  if (state.menu.page === 'orientation') return orientationRows(state);
  return scenarioMenuRows(state);
}

/**
 * Build the compact list header for a selected scenario.
 * @param {Record<string, any>} state Scenario menu state.
 * @returns {string[]} Header and save-safety notice.
 */
function scenarioMenuRows(state) {
  const scenario = Object.values(SCENARIOS)[state.menu.selected];
  return choicePanel(state, [
    'SHORT CAMPAIGNS / SAVE SLOTS',
    scenario?.objective || 'Choose an authored scenario.',
    'START REPLACES THIS SLOT',
  ]);
}

/**
 * Show current short-campaign progress only while a scenario is active or retained.
 * @param {Record<string, any> | undefined} scenario Saved optional scenario.
 * @returns {string[]} Compact status line, or no extra line for ordinary campaigns.
 */
function scenarioStatus(scenario) {
  if (!scenario) return [];
  return [`SCENARIO ${scenario.status.toUpperCase()} / ${scenario.settled}`];
}

/**
 * Compose a management panel with one shared selection window and footer.
 * @param {Record<string, any>} state Menu owner.
 * @param {string[]} context Title and two explanatory rows.
 * @returns {string[]} Seven handheld rows.
 */
function choicePanel(state, context) {
  return [...context, ...selectionRows(state), 'A CHOOSE B BACK X CLOSE'];
}
