import { LAB_CONTENT } from './content.js';
import { endShift, forecast, manageLab } from './management.js';
import { wrapDialogueText } from '../mosslight-valley/renderer.js';
import { hostingCost } from './research.js';

/**
 * Explain the constraint that a director can actually change before settlement.
 * @param {Record<string, any>} lab Current lab.
 * @param {Record<string, any>} flow Operating capacity and per-client invoices.
 * @returns {Record<string, string>} Dominant constraint and actionable advice.
 */
function bottleneck(lab, flow) {
  const constrained = flow.operations.projects.find(
    (/** @type {Record<string, any>} */ row) => row.bottleneck.kind !== 'none'
  );
  if (constrained) return constrained.bottleneck;
  if (lab.research[lab.focus] >= LAB_CONTENT.projects[lab.focus].target)
    return {
      kind: 'checkpoint',
      advice:
        'Training is complete. Evaluate the current checkpoint and release, or select a new program.',
    };
  if (!lab.teams.research)
    return {
      kind: 'staffing',
      advice:
        'No researchers are assigned. Move a named employee into research; hardware alone cannot start training.',
    };
  if (lab.cooling < Math.min(flow.demand, lab.compute))
    return {
      kind: 'cooling',
      advice:
        'Cooling limits throughput. Repair cooling before adding more compute.',
    };
  if (lab.compute < Math.min(flow.demand, lab.cooling))
    return {
      kind: 'compute',
      advice:
        'Compute limits throughput. More racks help only while cooling has spare capacity.',
    };
  if (lab.morale < 50)
    return {
      kind: 'morale',
      advice:
        'Low morale reduces research yield. Arrange recovery or protect the next shift.',
    };
  return {
    kind: 'demand',
    advice:
      'Hardware meets the current research demand. Extra hardware alone adds no progress; staffing or a different program changes demand.',
  };
}

/**
 * Describe pending contracts without inventing income before actual fulfillment.
 * @param {Record<string, any>} state Current campaign.
 * @param {Record<string, any>} next Settlement projection.
 * @returns {Record<string, any>[]} Exact deadline exposure.
 */
function deadlines(state, next) {
  return state.lab.contracts
    .filter(
      (/** @type {string} */ id) =>
        !state.lab.fulfilled.includes(id) && !state.lab.expired.includes(id)
    )
    .map((/** @type {string} */ id) => {
      const deal = LAB_CONTENT.contracts[id];
      return {
        id,
        name: deal.name,
        shiftsRemaining: Math.max(0, deal.deadline - state.world.day),
        clawback: Math.ceil(deal.advance / 2),
        delivery: next.lab.fulfilled.includes(id),
        missed: next.lab.expired.includes(id),
      };
    });
}

/**
 * Preview the exact next settlement without mutating state, time or attention.
 * @param {Record<string, any>} state Campaign to inspect.
 * @returns {Record<string, any>} Deterministic financial and human forecast.
 */
export function forecastShift(state) {
  const lab = state.lab;
  const flow = forecast(lab);
  const next = endShift(state);
  const change = next.lab;
  return {
    shift: state.world.day,
    closingCash: change.cash,
    cashChange: change.cash - lab.cash,
    researchGain: change.research[lab.focus] - lab.research[lab.focus],
    checkpoint: change.research[lab.focus],
    target: LAB_CONTENT.projects[lab.focus].target,
    closingMorale: change.morale,
    closingRisk: change.risk,
    closingTrust: change.trust,
    incidentCost: lab.outcome ? 0 : change.lastIncidentCost,
    incidentChains: change.incidentChains,
    payroll: flow.payroll,
    power: flow.power,
    hosting: hostingCost(lab),
    income: flow.service + flow.income,
    demand: flow.demand,
    throughput: flow.throughput,
    bottleneck: bottleneck(lab, flow),
    deadlines: deadlines(state, next),
    employees: change.employees.map(
      (/** @type {Record<string, any>} */ person) => ({
        id: person.id,
        name: person.name,
        fatigue: person.fatigue,
        morale: person.morale,
      })
    ),
    report: change.report,
    outcome: change.outcome,
    operations: flow.operations,
    deployments: change.deployments,
  };
}

/**
 * Compare one proposed order against doing nothing, including its actual cost.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} command Management order to preview, never commit.
 * @returns {Record<string, any>} Free, reversible comparison.
 */
export function compareOrder(state, command) {
  const proposed = manageLab(state, command);
  const before = forecastShift(state);
  const after = forecastShift(proposed);
  return {
    command,
    accepted: JSON.stringify(proposed.lab) !== JSON.stringify(state.lab),
    message: proposed.toast,
    cost: state.lab.cash - proposed.lab.cash,
    attention: state.lab.decisions - proposed.lab.decisions,
    progressChange: after.researchGain - before.researchGain,
    closingCashChange: after.closingCash - before.closingCash,
    before,
    after,
  };
}

/**
 * Author readable pages for the shared dialogue presenter rather than clipping.
 * @param {Record<string, any>} state Campaign to inspect.
 * @returns {{text: string}[]} Forecast pages consumed by both game modes.
 */
export function forecastPages(state) {
  const f = forecastShift(state);
  const pages = [
    {
      text: `SHIFT ${f.shift} FORECAST. Closing cash ${f.closingCash}k (${f.cashChange}k change). Income ${f.income}k, payroll ${f.payroll}k, power ${f.power}k, hosting ${f.hosting}k. Reading this forecast costs no attention and never ends a shift.`,
    },
    {
      text: `Research +${f.researchGain}, checkpoint ${f.checkpoint}/${f.target}. Throughput ${f.throughput}/${f.demand}. Constraint: ${f.bottleneck.kind}. ${f.bottleneck.advice}`,
    },
    {
      text: `After settlement: morale ${f.closingMorale}, risk ${f.closingRisk}, trust ${f.closingTrust}. ${incidentWarning(f)}`,
    },
    ...f.employees.map((/** @type {Record<string, any>} */ person) => ({
      text: `${person.name}: projected fatigue ${person.fatigue}, morale ${person.morale}. Protected shifts and recovery reduce fatigue. Talk to this colleague about current concerns.`,
    })),
    ...f.deadlines.map(deadlinePage),
    ...f.operations.projects.map((/** @type {Record<string, any>} */ row) => ({
      text: `${LAB_CONTENT.projects[row.id].name}: ${row.users} users, adoption ${row.adoption}%, reliability ${row.reliability}%. Invoice ${row.revenue}k of ${row.maximumRevenue}k contracted maximum. ${row.bottleneck.advice}`,
    })),
    ...Object.entries(f.incidentChains)
      .filter(([, chain]) => chain.stage !== 'clear')
      .map(([id, chain]) => ({
        text: `${LAB_CONTENT.incidents[id].name}: ${chain.stage}. ${LAB_CONTENT.incidents[id].trigger} Response: ${LAB_CONTENT.incidents[id].responseCost}k. Assign staff or repair the cause. A full warning settlement precedes escalation; unresolved incidents are charged only once.`,
      })),
  ];
  if (f.outcome)
    pages.push({
      text: `Campaign resolution at this settlement: ${f.outcome}. This is a preview only. Return to the ledger if you intend to commit it.`,
    });
  return readableLabPages(pages);
}

/**
 * State incident exposure explicitly even when no remediation will be charged.
 * @param {Record<string, any>} f Current forecast.
 * @returns {string} Deterministic warning.
 */
function incidentWarning(f) {
  if (f.incidentCost)
    return `Warning: this shift incurs ${f.incidentCost}k incident remediation. Repair the warned causes before settling.`;
  return 'No incident remediation is charged by this settlement.';
}

/**
 * Explain the exact state of a pending deadline in an individual readable page.
 * @param {Record<string, any>} deal Deadline exposure.
 * @returns {{text: string}} Contract forecast page.
 */
function deadlinePage(deal) {
  if (deal.delivery)
    return {
      text: `${deal.name}: delivered this shift. Its daily contract revenue begins with the following settlement.`,
    };
  if (deal.missed)
    return {
      text: `${deal.name}: deadline expires this shift. Clawback ${deal.clawback}k and trust loss are included in closing cash and trust.`,
    };
  return {
    text: `${deal.name}: ${deal.shiftsRemaining} shifts until its deadline. Missing it costs ${deal.clawback}k and trust. Evaluate and release the required model, then serve at least 20% adoption at 70% reliability. Training alone is not delivery.`,
  };
}

/**
 * Show why an upgrade helps or fails to address the actual constraint.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} command Proposed operation.
 * @returns {{text: string}[]} Honest no-charge comparison pages.
 */
export function comparisonPages(state, command) {
  const plan = compareOrder(state, command);
  if (!plan.accepted)
    return readableLabPages([
      {
        text: `NO ORDER COMMITTED. ${plan.message} Cash, attention and shift are unchanged.`,
      },
    ]);
  return readableLabPages([
    {
      text: `PREVIEW ONLY: ${plan.message} Cost ${plan.cost}k and ${plan.attention} attention if committed. Nothing has been purchased or changed.`,
    },
    {
      text: `Research gain changes from ${plan.before.researchGain} to ${plan.after.researchGain}. Closing cash changes from ${plan.before.closingCash}k to ${plan.after.closingCash}k, including the order's cost. ${plan.after.bottleneck.advice}`,
    },
    {
      text: 'A continues; B returns to the lab. Use the relevant terminal or staff console to commit the order. Only Ledger: End shift advances the economy.',
    },
  ]);
}

/**
 * Measure report prose once for forecasts and settlement pagination.
 * @param {string[]} report Complete explanatory paragraphs.
 * @returns {string[]} Consecutive bounded rows with no clipped words.
 */
export function labReportLines(report) {
  return report.flatMap(text => wrapDialogueText(text, 28));
}

/**
 * Paginate measured text shared by forecasts and settlement explanations.
 * @param {{text: string, choices?: Record<string, any>[]}[]} nodes Unbounded authored paragraphs.
 * @param {number} [rowLimit] Rows per page, reserving space for choice controls when needed.
 * @returns {{text: string, choices?: Record<string, any>[]}[]} Complete bounded dialogue nodes.
 */
export function readableLabPages(nodes, rowLimit = 6) {
  return nodes.flatMap(node => {
    const rows = labReportLines([node.text]);
    const pages =
      /** @type {{text: string, choices?: Record<string, any>[]}[]} */ ([]);
    for (let start = 0; start < rows.length; start += rowLimit)
      pages.push({ text: rows.slice(start, start + rowLimit).join(' ') });
    if (node.choices) pages[pages.length - 1].choices = node.choices;
    return pages;
  });
}
