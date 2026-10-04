/** @type {Record<string, string[]>} Authored transparent 12px pixel sprites. */
export const ART = {
  terminal:
    '............ /..kkkkkkkk../..kcccccck../..kcaaacck../..kccaccck../..kkkkkkkk../.....kk...../..aaaaaaaa../..akkkkkka../............ /............ /............'
      .replaceAll(' ', '')
      .split('/'),
  rack: '..kkkkkkkk../..kaaaaaak../..kcccccck../..kakkkkak../..kcccccck../..kakkkkak../..kcccccck../..kakkkkak../..kcccccck../..kkkkkkkk../...k....k.../............'.split(
    '/'
  ),
  staff:
    '....hhhh..../...hhhhhh.../...hsssshh../...hsksss.../....ssss..../...cccccc.../..sccaccas../..sccaccas../...cccccc.../...kk.kk..../...kk.kk..../............'.split(
      '/'
    ),
};

/**
 * Author a terminal with its own operation identifier.
 * @param {string} id Terminal identity.
 * @param {number} x Grid column.
 * @param {number} y Grid row.
 * @returns {object} Shared engine prop.
 */
function terminal(id, x, y) {
  return {
    id,
    x,
    y,
    kind: 'terminal',
    art: ART.terminal,
    colours: ['#493f79', '#244052', '#f9c597', '#6af5d5'],
  };
}

/**
 * Construct an authored room with visible connecting doors.
 * @param {string} name Room name.
 * @param {object[]} exits Connections.
 * @param {object[]} objects Interactables.
 * @returns {object} Shared engine map.
 */
function room(name, exits, objects) {
  return {
    name,
    width: 13,
    height: 9,
    palette: 'lab',
    weather: 'indoor',
    blocked: ['1,1', '2,1', '3,1', '9,1', '10,1', '11,1'],
    exits,
    objects,
  };
}

/**
 * Author an option with shared baseline effects and explicit departures.
 * @param {string} name Handheld label.
 * @param {Record<string, number>} effects Non-default operating effects.
 * @param {string} detail Disclosed tradeoffs.
 * @returns {Record<string, any>} Complete immutable setting definition.
 */
function setting(name, effects, detail) {
  return {
    name,
    compute: 1,
    pace: 1,
    hazard: 0,
    fee: 0,
    cost: 6,
    ...effects,
    detail,
  };
}

/** @type {Record<string, any>} Immutable chapter content; economic units are thousands of credits. */
export const LAB_CONTENT = {
  incidents: {
    heat: {
      name: 'Overheating',
      owner: 'ion',
      trigger: 'Active training demand exceeds cooling.',
      response: 'Install four cooling units',
      responseCost: 20,
      cost: 20,
      trustLoss: 8,
    },
    evaluation: {
      name: 'Evaluation gap',
      owner: 'sable',
      trigger:
        'Research has no evaluator, or a deployed checkpoint lacks current evidence.',
      response: 'Complete three representative probes',
      responseDetail:
        'Inspect Sable for free. Each outstanding probe is 2k; findings require 2k investigation, 4k repair and a 2k retest.',
      responseCost: 6,
      cost: 24,
      trustLoss: 12,
    },
    rights: {
      name: 'Data rights',
      owner: 'ada',
      trigger: 'Scraped data is in use after research begins.',
      response: 'Replace data and pay licensing',
      responseCost: 12,
      cost: 16,
      trustLoss: 10,
    },
    support: {
      name: 'Support overload',
      owner: 'ion',
      trigger:
        'Live-user support and queued tickets exceed service-staff capacity.',
      response: 'Fund triage and recovery',
      responseCost: 8,
      cost: 12,
      trustLoss: 6,
    },
  },
  start: { map: 'office', x: 6, y: 5, facing: 'up', name: 'Director' },
  maps: {
    office: room(
      'Director Office',
      [
        { x: 0, y: 4, map: 'commons', to: [11, 4] },
        { x: 12, y: 4, map: 'compute', to: [1, 4] },
        { x: 6, y: 8, map: 'clinic', to: [6, 1] },
      ],
      [terminal('ledger', 6, 4), terminal('board', 9, 6)]
    ),
    compute: room(
      'Compute Vault',
      [
        { x: 0, y: 4, map: 'office', to: [11, 4] },
        { x: 12, y: 4, map: 'evaluation', to: [1, 4] },
      ],
      [
        terminal('infrastructure', 6, 4),
        { ...terminal('rack', 9, 3), art: ART.rack },
      ]
    ),
    evaluation: room(
      'Evaluation Suite',
      [{ x: 0, y: 4, map: 'compute', to: [11, 4] }],
      [terminal('research', 6, 4), terminal('evaluation', 9, 6)]
    ),
    commons: room(
      'Staff Commons',
      [{ x: 12, y: 4, map: 'office', to: [1, 4] }],
      [terminal('recruitment', 6, 4), terminal('archive', 3, 6)]
    ),
    clinic: room(
      'Night Clinic',
      [{ x: 6, y: 0, map: 'office', to: [6, 7] }],
      [terminal('contracts', 6, 4), terminal('community', 9, 6)]
    ),
  },
  npcs: [
    {
      id: 'ada',
      name: 'Ada / research',
      map: 'evaluation',
      x: 4,
      y: 4,
      art: ART.staff,
      colours: ['#302637', '#a665e8', '#efbfa8', '#6af5d5'],
    },
    {
      id: 'ion',
      name: 'Ion / infrastructure',
      map: 'compute',
      x: 4,
      y: 4,
      art: ART.staff,
      colours: ['#b36c43', '#526896', '#edb691', '#ffcf69'],
    },
    {
      id: 'sable',
      name: 'Sable / safety',
      map: 'commons',
      x: 4,
      y: 4,
      art: ART.staff,
      colours: ['#d2d8e5', '#486274', '#eccaa9', '#f183c8'],
    },
    {
      id: 'mae',
      name: 'Mae / community',
      map: 'clinic',
      x: 4,
      y: 4,
      art: ART.staff,
      colours: ['#333357', '#d4778d', '#bc947d', '#8be9ff'],
    },
  ],
  projects: {
    atlas: {
      name: 'Atlas / clinic triage',
      identity:
        'Clinical reliability: a recommendation, never a verdict on who deserves care.',
      milestones: { prototype: 6, pilot: 20, release: 38 },
      specialties: {
        triage: setting(
          'Clinic triage',
          {},
          'General clinic triage. Baseline pace and risk.'
        ),
        bedside: setting(
          'Bedside support',
          { pace: 0.9, hazard: -2 },
          'Conservative bedside advice: 90% research pace, training hazard -2.'
        ),
        emergency: setting(
          'Emergency routing',
          { pace: 1.15, hazard: 3 },
          'Urgent routing: 115% pace, hazard +3. Speed is not clinical certainty.'
        ),
      },
      target: 38,
      compute: 3,
      hazard: 2,
      revenue: 16,
      trust: 8,
    },
    ghost: {
      name: 'Ghost / autonomous agents',
      identity:
        'Autonomous permissions: decide which doors an agent may open, not just how clever it is.',
      milestones: { prototype: 12, pilot: 32, release: 64 },
      specialties: {
        assistant: setting(
          'Audited assistant',
          {},
          'Audited task assistance. Baseline pace and risk; external actions need approval.'
        ),
        maintenance: setting(
          'Bounded maintenance',
          { pace: 1.1, hazard: -2 },
          'Bounded maintenance tasks: 110% pace, hazard -2. No open-ended mission authority.'
        ),
        autonomous: setting(
          'Open autonomy',
          { pace: 1.2, hazard: 4 },
          'Open-ended planning: 120% pace, hazard +4. More permission needs more scrutiny.'
        ),
      },
      target: 64,
      compute: 5,
      hazard: 6,
      revenue: 29,
      trust: 3,
    },
    lumen: {
      name: 'Lumen / public interpreter',
      identity:
        'Community coverage: a language counts only when its speakers can actually use the service.',
      milestones: { prototype: 8, pilot: 24, release: 48 },
      specialties: {
        civic: setting(
          'Civic interpretation',
          {},
          'Public-service interpretation. Baseline pace and risk.'
        ),
        dialects: setting(
          'Neighborhood dialects',
          { pace: 0.85, hazard: -1 },
          'Neighborhood language coverage: 85% pace, hazard -1. Listening takes time.'
        ),
        commerce: setting(
          'Trade translation',
          { pace: 1.2, hazard: 2 },
          'Narrow commercial translation: 120% pace, hazard +2. A receipt is not a clinic conversation.'
        ),
      },
      target: 48,
      compute: 4,
      hazard: 3,
      revenue: 21,
      trust: 12,
    },
  },
  researchSettings: {
    size: {
      standard: setting(
        'Standard',
        {},
        'Standard model: baseline compute demand, pace and hazard.'
      ),
      compact: setting(
        'Compact',
        { compute: 0.75, pace: 1.1, hazard: -1 },
        'Compact model: 75% compute demand, 110% throughput yield, hazard -1. Smaller demand can mean less total progress.'
      ),
      frontier: setting(
        'Frontier scale',
        { compute: 1.5, pace: 0.9, hazard: 2, cost: 18 },
        'Frontier scale: 150% demand, 90% throughput yield, hazard +2. Extra scale is useless without cooling.'
      ),
    },
    hosting: {
      local: setting(
        'Local racks',
        {},
        'Local training uses your racks. No recurring hosting fee.'
      ),
      district: setting(
        'District pool',
        { compute: 0.5, pace: 2, hazard: 2, fee: 6, cost: 10 },
        'Simulated district hosting halves local demand and doubles its yield; 6k each shift, hazard +2 for remote custody.'
      ),
      edge: setting(
        'Edge appliances',
        { compute: 0.5, pace: 1.2, hazard: -1, fee: 2, cost: 8 },
        'Edge appliances: half local demand, 120% yield, hazard -1; 2k each shift. Cooler, but generally slower.'
      ),
    },
    oversight: {
      assisted: setting(
        'Assisted review',
        {},
        'Assisted review keeps a human approval boundary. Baseline pace and hazard.'
      ),
      human: setting(
        'Human-led',
        { pace: 0.85, hazard: -2 },
        'Human-led operation: 85% pace, hazard -2. Automation proposes; people decide.'
      ),
      autonomous: setting(
        'Autonomous',
        { pace: 1.2, hazard: 3, cost: 8 },
        'Autonomous operation: 120% pace, hazard +3. Fast work can create expensive mistakes.'
      ),
    },
  },
  contracts: {
    clinic: {
      name: 'Night Clinic',
      advance: 28,
      daily: 7,
      deadline: 12,
      project: 'atlas',
      trust: 5,
    },
    transit: {
      name: 'Free Transit Union',
      advance: 35,
      daily: 9,
      deadline: 18,
      project: 'lumen',
      trust: 7,
    },
    helios: {
      name: 'Helios surveillance',
      advance: 70,
      daily: 15,
      deadline: 10,
      project: 'ghost',
      trust: -18,
    },
  },
  staffStories: {
    ada: 'Ada: Helios erased my mentor from a paper. Let us build something whose authors cannot disappear.',
    ion: 'Ion: Every GPU is a space heater with delusions. Give me cooling before you ask for miracles.',
    sable:
      'Sable: The old director hid a failed evaluation. I will stay if the incident register stays open.',
    mae: 'Mae: The clinic needs translation, not a machine that decides who deserves a bed. Ask us before deployment.',
  },
  introduction: [
    {
      text: 'NEON COVENANT. The city predicts everything except who gets left behind.',
    },
    {
      text: 'You inherit a frontier AI lab, 180k credits, four tired staff, and 28 shifts before Helios calls in the debt.',
    },
    {
      text: 'Build useful models without breaking your team. Walk to people and terminals. A talks. X opens the lab menu.',
    },
    {
      text: 'Mae needs Atlas for the night clinic. Ion reports a failed cooling bank: eight compute units, only four cooling.',
    },
    {
      text: 'Repairs cost 20k. Declining means slower research, not failure. The first-shift guide lets you compare and choose real orders.',
    },
    {
      text: 'Only END SHIFT advances payroll and research. Each shift has six decision points. Y binds a shortcut to B.',
      choices: [
        { label: 'Plan the first shift', command: 'page:orientation' },
        { label: 'Explore freely' },
      ],
    },
  ],
};
