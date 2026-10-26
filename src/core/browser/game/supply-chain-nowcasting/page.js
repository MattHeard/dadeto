import { planSupplyChain } from './supply-chain-nowcasting.js';

/**
 * @typedef {object} SampleSupplyScenario
 * @property {number} horizonDays Number of simulated days.
 * @property {{id: string, capacityUnitsPerDay: number, unit: string}[]} suppliers Synthetic suppliers.
 * @property {{id: string, dailyDemandUnits: number, startingInventoryUnits: number, maxBufferUnits: number, unit: string}} destination Demand and inventory.
 * @property {{id: string, fromId: string, toId: string, capacityUnitsPerDay: number, maxCapacityUnitsPerDay: number, leadTimeDays: number, unitCostCents: number}[]} routes Direct routes.
 * @property {{routeId: string, startsDay: number, durationDays: number, reductionPercent: number, warningLeadDays: number}} disruption Hypothetical disruption.
 * @property {'shortfall-then-cost'|'cost-then-shortfall'} rankingCriterion Candidate sorting preference.
 * @property {{id: string, kind: 'capacity'|'buffer', routeId?: string, capacityUnitsPerDay?: number, bufferUnits?: number, leadTimeDays: number, unitCostCents: number}[]} mitigations Candidate options.
 */

/** @returns {object} A small synthetic two-supplier network. */
function createSampleScenario() {
  return {
    horizonDays: 5,
    suppliers: [
      { id: 'north', capacityUnitsPerDay: 10, unit: 'units/day' },
      { id: 'south', capacityUnitsPerDay: 10, unit: 'units/day' },
    ],
    destination: {
      id: 'market',
      dailyDemandUnits: 10,
      startingInventoryUnits: 10,
      maxBufferUnits: 10,
      unit: 'units/day',
    },
    rankingCriterion: 'shortfall-then-cost',
    routes: [
      {
        id: 'north-lane',
        fromId: 'north',
        toId: 'market',
        capacityUnitsPerDay: 10,
        maxCapacityUnitsPerDay: 10,
        leadTimeDays: 0,
        unitCostCents: 5,
      },
      {
        id: 'south-lane',
        fromId: 'south',
        toId: 'market',
        capacityUnitsPerDay: 0,
        maxCapacityUnitsPerDay: 10,
        leadTimeDays: 0,
        unitCostCents: 9,
      },
    ],
    disruption: {
      routeId: 'north-lane',
      startsDay: 2,
      durationDays: 10,
      reductionPercent: 0,
      warningLeadDays: 2,
    },
    mitigations: [
      {
        id: 'alternate-supplier',
        kind: 'capacity',
        routeId: 'south-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 2,
        unitCostCents: 10,
      },
      {
        id: 'late-alternate',
        kind: 'capacity',
        routeId: 'south-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 5,
        unitCostCents: 10,
      },
      {
        id: 'emergency-buffer',
        kind: 'buffer',
        bufferUnits: 10,
        leadTimeDays: 1,
        unitCostCents: 3,
      },
    ],
  };
}

/**
 * Start the no-network supply-chain scenario presenter.
 * @param {{documentObj: Document, planSupplyChainFn?: typeof planSupplyChain}} dependencies Browser document and optional planner seam.
 * @returns {() => void} Removes installed listeners.
 */
export function startSupplyChainNowcastingPage({
  documentObj,
  planSupplyChainFn = planSupplyChain,
}) {
  const warningSelect = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector('#warning-lead')
  );
  const routeSelect = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector('#disruption-route')
  );
  const severitySelect = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector('#disruption-severity')
  );
  const durationInput = /** @type {HTMLInputElement|null} */ (
    documentObj.querySelector('#disruption-duration')
  );
  const rankingSelect = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector('#ranking-criterion')
  );
  const disruptionButton = documentObj.querySelector('#disruption-button');
  const status = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#scenario-status')
  );
  const baseline = documentObj.querySelector('#baseline-result');
  const signal = documentObj.querySelector('#warning-signal');
  const routeTable = documentObj.querySelector('#network-routes');
  const mitigationBody = documentObj.querySelector('#mitigation-results');
  const scenario = /** @type {SampleSupplyScenario} */ (createSampleScenario());
  let disrupted = false;

  if (routeSelect) {
    routeSelect.replaceChildren(
      ...scenario.routes.map(route => {
        const option = documentObj.createElement('option');
        option.value = route.id;
        option.textContent = route.id;
        return option;
      })
    );
  }

  if (
    !warningSelect ||
    !routeSelect ||
    !severitySelect ||
    !durationInput ||
    !rankingSelect ||
    !disruptionButton ||
    !status ||
    !baseline ||
    !signal ||
    !routeTable ||
    !mitigationBody
  )
    return () => {};

  const render = () => {
    const result = planSupplyChainFn(scenario);
    if ('error' in result) {
      status.textContent = result.issues.join(' ');
      status.dataset.state = 'error';
      baseline.textContent = 'No plan available';
      signal.textContent = 'Correct the sample inputs to continue.';
      mitigationBody.replaceChildren();
      return;
    }

    status.dataset.state = 'ready';
    status.textContent = disrupted
      ? 'Hypothetical disruption active. No supplier is contacted and no route is changed.'
      : 'Sample network ready. Apply the disruption to compare response options.';
    baseline.textContent =
      `${result.baseline.totalShortfallUnits} units total shortfall · ` +
      `${result.baseline.totalCostCents}¢ baseline route cost`;
    signal.textContent =
      `${result.signal.status === 'early-warning' ? 'EARLY WARNING' : 'CURRENT RESPONSE'} · ` +
      `${result.signal.leadTimeDays} days of warning · Day ${result.signal.disruptionDay} disruption · hypothetical only`;
    disruptionButton.textContent = disrupted
      ? 'Reset route'
      : 'Apply one-click disruption';

    const routeRows = scenario.routes.map(route => {
      const supplier =
        /** @type {SampleSupplyScenario['suppliers'][number]} */ (
          scenario.suppliers.find(item => item.id === route.fromId)
        );
      const row = documentObj.createElement('tr');
      row.append(
        cell(documentObj, supplier.id),
        cell(documentObj, route.toId),
        cell(
          documentObj,
          `${route.capacityUnitsPerDay} / ${route.maxCapacityUnitsPerDay} units/day`
        ),
        cell(documentObj, `${route.leadTimeDays} days`),
        cell(documentObj, `${route.unitCostCents}¢/unit`),
        cell(
          documentObj,
          disrupted && route.id === scenario.disruption.routeId
            ? 'Disrupted'
            : 'Available'
        )
      );
      return row;
    });
    routeTable.replaceChildren(...routeRows);

    const rows = result.rankedMitigations.map((candidate, index) => {
      const row = documentObj.createElement('tr');
      row.append(
        cell(documentObj, String(index + 1)),
        cell(documentObj, candidate.id),
        cell(
          documentObj,
          candidate.kind === 'buffer'
            ? `${candidate.bufferUnits} units once`
            : `${candidate.capacityUnitsPerDay} units/day`
        ),
        cell(documentObj, `Day ${candidate.arrivalDay}`),
        cell(
          documentObj,
          candidate.feasible
            ? 'Feasible'
            : formatInfeasibleReason(candidate.reason)
        ),
        cell(documentObj, `${candidate.shortfallAvoidedUnits} units`),
        cell(
          documentObj,
          candidate.incrementalCostCents === null
            ? 'Not available'
            : `${candidate.incrementalCostCents}¢`
        )
      );
      return row;
    });
    mitigationBody.replaceChildren(...rows);
  };

  const changeWarningLead = () => {
    scenario.disruption.warningLeadDays = Number(warningSelect.value);
    render();
  };
  const changeDisruptionRoute = () => {
    scenario.disruption.routeId = routeSelect.value;
    render();
  };
  const changeDisruptionSeverity = () => {
    scenario.disruption.reductionPercent = Number(severitySelect.value);
    render();
  };
  const changeDisruptionDuration = () => {
    scenario.disruption.durationDays = Number(durationInput.value);
    render();
  };
  const changeRankingCriterion = () => {
    scenario.rankingCriterion =
      /** @type {SampleSupplyScenario['rankingCriterion']} */ (
        rankingSelect.value
      );
    render();
  };
  const toggleDisruption = () => {
    disrupted = !disrupted;
    scenario.disruption.reductionPercent = disrupted
      ? Number(severitySelect.value)
      : 0;
    render();
  };
  warningSelect.addEventListener('change', changeWarningLead);
  routeSelect.addEventListener('change', changeDisruptionRoute);
  severitySelect.addEventListener('change', changeDisruptionSeverity);
  durationInput.addEventListener('input', changeDisruptionDuration);
  rankingSelect.addEventListener('change', changeRankingCriterion);
  disruptionButton.addEventListener('click', toggleDisruption);
  render();
  return () => {
    warningSelect.removeEventListener('change', changeWarningLead);
    routeSelect.removeEventListener('change', changeDisruptionRoute);
    severitySelect.removeEventListener('change', changeDisruptionSeverity);
    durationInput.removeEventListener('input', changeDisruptionDuration);
    rankingSelect.removeEventListener('change', changeRankingCriterion);
    disruptionButton.removeEventListener('click', toggleDisruption);
  };
}

/**
 * @param {string|null} reason Planner reason code.
 * @returns {string} Human-readable status.
 */
function formatInfeasibleReason(reason) {
  if (reason === 'exceeds-available-capacity') return 'Capacity limit exceeded';
  if (reason === 'exceeds-buffer-capacity') return 'Buffer limit exceeded';
  if (reason === 'arrives-after-horizon') return 'Arrives after the plan';
  return reason ?? 'Infeasible';
}

/**
 * @param {Document} documentObj Browser document.
 * @param {string} value Cell contents.
 * @returns {HTMLTableCellElement} Text-only table cell.
 */
function cell(documentObj, value) {
  const element = documentObj.createElement('td');
  element.textContent = value;
  return element;
}
