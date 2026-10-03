import { LAB_CONTENT } from './content.js';
import { forecast } from './management.js';

/**
 * Build selectable rows from the current terminal or handheld menu.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[][]} Labels and operations.
 */
export function labEntries(state) {
  const page = state.menu.page;
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
    return ['research', 'safety', 'service'].flatMap(role => [
      [`Move staff to ${role}`, `team:${role}`],
      [`Hire ${role} / 18k`, `hire:${role}`],
    ]);
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
    ];
  return [
    ['Ledger / end shift', 'page:ledger'],
    ['Lab dashboard', 'page:dashboard'],
    ['Research console', 'page:research'],
    ['Shift report', 'page:report'],
    ['Story and controls', 'guide'],
    ['Assign B', 'page:assign'],
    ['Save options', 'page:saves'],
    ['Pause', 'page:paused'],
    ['Fullscreen', 'fullscreen'],
    ['Return to lab', 'close'],
  ];
}

/**
 * Produce compact, scrolling, pixel-font controller rows.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {string[]} Bounded panel lines.
 */
export function labMenuRows(state) {
  if (!state.menu) return [];
  const lab = state.lab;
  const f = forecast(lab);
  const info =
    state.menu.page === 'dashboard'
      ? [
          `CASH ${lab.cash}k DEBT ${lab.debt}k`,
          `TRUST ${lab.trust} MORALE ${lab.morale}`,
          `RISK ${lab.risk} WATCH ${lab.scrutiny}`,
          `TEAM R${lab.teams.research} E${lab.teams.safety} S${lab.teams.service}`,
          `GPU ${f.throughput}/${f.demand} COOL ${lab.cooling}`,
          `PROGRESS +${f.progress}/SHIFT`,
        ]
      : state.menu.page === 'report' || state.menu.page === 'archive'
        ? lab.report.slice(
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
