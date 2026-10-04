import { LAB_CONTENT } from './content.js';
import { forecast } from './management.js';
import { PERSONNEL } from './personnel.js';
import { forecastShift, labReportLines } from './forecast.js';
import { orientationEntries, orientationRows } from './orientation.js';

/**
 * Build selectable rows from the current terminal or handheld menu.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[][]} Labels and operations.
 */
export function labEntries(state) {
  const page = state.menu.page;
  if (page === 'orientation') return orientationEntries(state);
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
      ['Evaluate checkpoint / 6k', 'evaluate'],
      ['Deploy evaluated model', 'deploy'],
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
      ['Balanced shifts', 'policy:balanced'],
      ['Protected shifts', 'policy:careful'],
      ['Sprint / burnout risk', 'policy:sprint'],
    ];
  if (page === 'contracts') return named(LAB_CONTENT.contracts, 'contract');
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
      ['Evaluate checkpoint / 6k', 'evaluate'],
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
      ['End shift / settle costs', 'shift'],
      ['Repay debt / up to 20k', 'repay'],
      ['Shift report', 'page:report'],
      ['Inspect next shift', 'page:forecast'],
    ];
  return [
    ['Ledger / end shift', 'page:ledger'],
    ['Lab dashboard', 'page:dashboard'],
    ['Research console', 'page:research'],
    ['People and recruitment', 'page:recruitment'],
    ['Shift report', 'page:report'],
    ['Story and controls', 'guide'],
    ['Assign B', 'page:assign'],
    ['Save options', 'page:saves'],
    ['Pause', 'page:paused'],
    ['Fullscreen', 'fullscreen'],
    ['Return to lab', 'close'],
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
  if (state.menu.page === 'orientation') return orientationRows(state);
  const lab = state.lab;
  const f = forecast(lab);
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
            `${index + Math.max(0, state.menu.selected - 2) === state.menu.selected ? '>' : ' '} ${label}`
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
          `CASH ${lab.cash}k DEBT ${lab.debt}k`,
          `TRUST ${lab.trust} MORALE ${lab.morale}`,
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
        ([label], index) => `${index + start === selected ? '>' : ' '} ${label}`
      ),
    'A CHOOSE / B BACK / X CLOSE',
  ];
}
