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
 * @property {{organizations?: string[], offerings?: string[], processes?: string[], inputs?: string[], outputs?: string[], relationships?: string[]}} [industryGraphReferences] Optional opaque graph entity IDs.
 */

/** @typedef {{formatVersion: number, scenario: SampleSupplyScenario, baseline: object, signal: object, rankingCriterion: string, rankedMitigations: object[], assumptions: object}} SupplyResponseExport */

/**
 * @typedef {object} SupplyChainDataAdapters
 * @property {(file: File) => Promise<string>} [readFileTextFn] Local file reader.
 * @property {(plan: SupplyResponseExport) => void} [downloadPlanFn] Download adapter.
 */

/**
 * @typedef {object} PageDependencies
 * @property {Document} documentObj Browser document.
 * @property {typeof planSupplyChain} [planSupplyChainFn] Pure planner seam.
 * @property {SupplyChainDataAdapters} [dataAdapters] File and download effects.
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
 * @param {PageDependencies} dependencies Browser document and optional effect seams.
 * @returns {() => void} Removes installed listeners.
 */
export function startSupplyChainNowcastingPage(dependencies) {
  const documentObj = dependencies.documentObj;
  const planSupplyChainFn = dependencies.planSupplyChainFn ?? planSupplyChain;
  const dataAdapters = dependencies.dataAdapters ?? {};
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
  const scenarioJson = /** @type {HTMLTextAreaElement|null} */ (
    documentObj.querySelector('#scenario-json')
  );
  const scenarioFile = /** @type {HTMLInputElement|null} */ (
    documentObj.querySelector('#scenario-file')
  );
  const importButton = documentObj.querySelector('#import-scenario');
  const exportButton = documentObj.querySelector('#export-plan');
  const dataStatus = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#data-status')
  );
  const disruptionButton = documentObj.querySelector('#disruption-button');
  const status = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#scenario-status')
  );
  const baseline = documentObj.querySelector('#baseline-result');
  const signal = documentObj.querySelector('#warning-signal');
  const routeTable = documentObj.querySelector('#network-routes');
  const mitigationBody = documentObj.querySelector('#mitigation-results');
  let scenario = /** @type {SampleSupplyScenario} */ (createSampleScenario());
  let dataOrigin = 'Synthetic sample';
  let disrupted = false;

  syncScenarioControls(documentObj, scenario, false);
  if (scenarioJson) scenarioJson.value = JSON.stringify(scenario, null, 2);

  if (
    !warningSelect ||
    !routeSelect ||
    !severitySelect ||
    !durationInput ||
    !rankingSelect ||
    !scenarioJson ||
    !scenarioFile ||
    !importButton ||
    !exportButton ||
    !dataStatus ||
    !disruptionButton ||
    !status ||
    !baseline ||
    !signal ||
    !routeTable ||
    !mitigationBody
  )
    return () => {};

  let latestPlan =
    /** @type {Exclude<ReturnType<typeof planSupplyChain>, {error: string}>|null} */ (
      null
    );
  const render = () => {
    const result = planSupplyChainFn(scenario);
    if ('error' in result) {
      latestPlan = null;
      status.textContent = result.issues.join(' ');
      status.dataset.state = 'error';
      baseline.textContent = 'No plan available';
      signal.textContent = 'Correct the sample inputs to continue.';
      mitigationBody.replaceChildren();
      return;
    }

    latestPlan = result;
    syncScenarioContext(documentObj, scenario, dataOrigin);
    status.dataset.state = 'ready';
    status.textContent = disrupted
      ? 'Hypothetical disruption active. No supplier is contacted and no route is changed.'
      : `${dataOrigin} ready. Apply the disruption to compare response options.`;
    status.textContent += demandCoverageWarning(result);
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
          formatWarningRequirement(candidate.minimumWarningLeadDays)
        ),
        cell(
          documentObj,
          candidate.feasible
            ? 'Feasible'
            : formatInfeasibleReason(candidate.reason)
        ),
        cell(documentObj, `${candidate.shortfallAvoidedUnits} units`),
        cell(documentObj, `${candidate.remainingShortfallUnits} units`),
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
    updateDisruptionSeverity(false);
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
  /** @param {string} text User-supplied JSON. @returns {void} Updates the active scenario only after validation. */
  const importScenarioText = text => {
    try {
      const source = text.trimStart();
      const isCsv = !source.startsWith('{');
      const candidate = isCsv
        ? scenarioFromCsv(text)
        : scenarioFromParsedJson(JSON.parse(text));
      const validation = planSupplyChainFn(candidate);
      if ('error' in validation) {
        setDataStatus(dataStatus, validation.issues.join(' '), 'error');
        return;
      }
      scenario = /** @type {SampleSupplyScenario} */ (candidate);
      dataOrigin = isCsv ? 'Imported CSV scenario' : 'Imported JSON scenario';
      disrupted = scenario.disruption.reductionPercent > 0;
      syncScenarioControls(documentObj, scenario);
      scenarioJson.value = JSON.stringify(scenario, null, 2);
      setDataStatus(
        dataStatus,
        isCsv
          ? 'CSV scenario imported and validated.'
          : 'Scenario imported and validated.',
        'ready'
      );
      render();
    } catch (error) {
      setDataStatus(dataStatus, errorMessage(error), 'error');
    }
  };
  const removeDataControlListeners = bindScenarioDataControls({
    scenarioJson,
    scenarioFile,
    importButton,
    exportButton,
    dataStatus,
    dataAdapters,
    importScenarioText,
    getScenario: () => scenario,
    getPlan: () => latestPlan,
    getDataOrigin: () => dataOrigin,
  });
  const toggleDisruption = () => {
    updateDisruptionSeverity(true);
  };
  /** @param {boolean} shouldToggle Whether to flip the disruption active state. @returns {void} Applies the selected disruption severity. */
  const updateDisruptionSeverity = shouldToggle => {
    if (shouldToggle) disrupted = !disrupted;
    scenario.disruption.reductionPercent = selectedDisruptionReduction(
      severitySelect,
      disrupted
    );
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
    removeDataControlListeners();
    disruptionButton.removeEventListener('click', toggleDisruption);
  };
}

/**
 * @param {HTMLSelectElement} severitySelect Severity control.
 * @param {boolean} disrupted Whether disruption is active.
 * @returns {number} Active capacity reduction.
 */
function selectedDisruptionReduction(severitySelect, disrupted) {
  return disrupted ? Number(severitySelect.value) : 0;
}

/**
 * @param {Record<string, any>} controller Elements, adapters, and scenario accessors for data controls.
 * @returns {() => void} Removes all installed data listeners.
 */
function bindScenarioDataControls(controller) {
  const importPastedScenario = () =>
    controller.importScenarioText(controller.scenarioJson.value);
  const importScenarioFile = async () => {
    const file = controller.scenarioFile.files?.[0];
    if (!file) return;
    try {
      const readFileTextFn =
        controller.dataAdapters.readFileTextFn ??
        /** @type {(selectedFile: File) => Promise<string>} */ (
          selectedFile => selectedFile.text()
        );
      controller.importScenarioText(await readFileTextFn(file));
    } catch (error) {
      setDataStatus(controller.dataStatus, errorMessage(error), 'error');
    }
  };
  const exportResponsePlan = () => {
    const plan = controller.getPlan();
    if (!plan) {
      setDataStatus(
        controller.dataStatus,
        'Correct the scenario before exporting.',
        'error'
      );
      return;
    }
    if (!controller.dataAdapters.downloadPlanFn) {
      setDataStatus(
        controller.dataStatus,
        'Plan download is unavailable.',
        'error'
      );
      return;
    }
    try {
      controller.dataAdapters.downloadPlanFn(
        makeSupplyResponseExport(
          controller.getScenario(),
          plan,
          controller.getDataOrigin()
        )
      );
      setDataStatus(
        controller.dataStatus,
        'Auditable response plan exported.',
        'ready'
      );
    } catch (error) {
      setDataStatus(controller.dataStatus, errorMessage(error), 'error');
    }
  };
  controller.importButton.addEventListener('click', importPastedScenario);
  controller.scenarioFile.addEventListener('change', importScenarioFile);
  controller.exportButton.addEventListener('click', exportResponsePlan);
  return () => {
    controller.importButton.removeEventListener('click', importPastedScenario);
    controller.scenarioFile.removeEventListener('change', importScenarioFile);
    controller.exportButton.removeEventListener('click', exportResponsePlan);
  };
}

/**
 * @param {Document} documentObj Browser document.
 * @param {SampleSupplyScenario} scenario Scenario to reflect.
 * @param {boolean} [selectSeverity] Whether to reflect severity in the control.
 * @returns {void} Updates visible assumption controls.
 */
function syncScenarioControls(documentObj, scenario, selectSeverity = true) {
  const routeSelect = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector('#disruption-route')
  );
  if (routeSelect) {
    routeSelect.replaceChildren(
      ...scenario.routes.map(route =>
        makeOption(documentObj, route.id, route.id)
      )
    );
    routeSelect.value = scenario.disruption.routeId;
  }
  if (selectSeverity)
    setSelectValue(
      documentObj,
      '#disruption-severity',
      scenario.disruption.reductionPercent,
      `${scenario.disruption.reductionPercent}%`
    );
  setSelectValue(
    documentObj,
    '#warning-lead',
    scenario.disruption.warningLeadDays,
    `${scenario.disruption.warningLeadDays} days`
  );
  setSelectValue(
    documentObj,
    '#ranking-criterion',
    scenario.rankingCriterion,
    scenario.rankingCriterion
  );
  const durationInput = /** @type {HTMLInputElement|null} */ (
    documentObj.querySelector('#disruption-duration')
  );
  if (durationInput)
    durationInput.value = String(scenario.disruption.durationDays);
}

/**
 * @param {Document} documentObj Browser document.
 * @param {unknown} value Option value.
 * @param {string} label Visible option text.
 * @returns {HTMLOptionElement} New select option.
 */
function makeOption(documentObj, value, label) {
  const option = documentObj.createElement('option');
  option.value = String(value);
  option.textContent = label;
  return option;
}

/**
 * @param {Document} documentObj Browser document.
 * @param {string} selector Select query.
 * @param {unknown} value Selected value.
 * @param {string} label Fallback option label.
 * @returns {void} Selects the requested option.
 */
function setSelectValue(documentObj, selector, value, label) {
  const select = /** @type {HTMLSelectElement|null} */ (
    documentObj.querySelector(selector)
  );
  if (!select) return;
  const normalized = String(value);
  if (![...select.options].some(option => option.value === normalized))
    select.append(makeOption(documentObj, normalized, label));
  select.value = normalized;
}

/**
 * @param {unknown} parsed Parsed user value.
 * @returns {unknown} Scenario object or envelope payload.
 */
function scenarioFromParsedJson(parsed) {
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'scenario' in parsed
  )
    return parsed.scenario;
  return parsed;
}

/**
 * Convert the documented record-oriented CSV dialect to planner input.
 * @param {string} text CSV source.
 * @returns {SampleSupplyScenario} Parsed scenario.
 */
function scenarioFromCsv(text) {
  const [header, ...records] = parseCsvRows(text);
  const columns = header?.map(value => value.trim()) ?? [];
  if (columns[0] !== 'record' || columns[1] !== 'id')
    throw new Error('CSV must start with record,id columns.');
  const rows = records.filter(row => row.some(value => value.trim() !== ''));
  /**
   * @param {string[]} row CSV cells.
   * @returns {Record<string, string>} Column values.
   */
  const values = row =>
    Object.fromEntries(
      columns.map((column, index) => [column, row[index]?.trim() ?? ''])
    );
  /** @type {Record<string, string>[]} */
  const parsedRows = rows.map((row, index) => {
    if (row.length > columns.length)
      throw new Error(`CSV row ${index + 2} has more values than its header.`);
    return values(row);
  });
  /**
   * @param {string} name Record kind.
   * @returns {Record<string, string>} The single matching record.
   */
  const getOne = name => {
    const matches = parsedRows.filter(row => row.record === name);
    if (matches.length !== 1)
      throw new Error(`CSV must contain exactly one ${name} record.`);
    return matches[0];
  };
  /**
   * @param {Record<string, string>} row CSV record.
   * @param {string} field Numeric field.
   * @returns {number} Parsed number.
   */
  const number = (row, field) => {
    if (row[field] === '')
      throw new Error(`CSV ${row.record} is missing ${field}.`);
    const value = Number(row[field]);
    if (!Number.isFinite(value))
      throw new Error(`CSV ${row.record} has invalid ${field}.`);
    return value;
  };
  /**
   * @param {Record<string, string>} row CSV record.
   * @param {string} field Required text field.
   * @returns {string} Non-empty text.
   */
  const textValue = (row, field) => {
    if (!row[field]) throw new Error(`CSV ${row.record} is missing ${field}.`);
    return row[field];
  };
  const meta = getOne('meta');
  const destination = getOne('destination');
  const disruption = getOne('disruption');
  /**
   * @param {string} kind Record type.
   * @returns {Record<string, string>[]} Matching records.
   */
  const entityRows = kind => parsedRows.filter(row => row.record === kind);
  const unknownType = parsedRows.find(
    row =>
      ![
        'meta',
        'supplier',
        'destination',
        'route',
        'disruption',
        'mitigation',
        'industry-reference',
      ].includes(row.record)
  );
  if (unknownType)
    throw new Error(`CSV has unknown record type ${unknownType.record}.`);
  const references = /** @type {Record<string, string[]>} */ ({});
  const referenceCollectionByKind = /** @type {Record<string, string>} */ ({
    organization: 'organizations',
    offering: 'offerings',
    process: 'processes',
    input: 'inputs',
    output: 'outputs',
    relationship: 'relationships',
  });
  entityRows('industry-reference').forEach(row => {
    const kind = textValue(row, 'kind');
    const collection = referenceCollectionByKind[kind];
    if (!collection)
      throw new Error(`CSV industry reference has unknown kind ${kind}.`);
    references[collection] ??= [];
    references[collection].push(textValue(row, 'id'));
  });
  return {
    horizonDays: number(meta, 'horizonDays'),
    rankingCriterion: /** @type {SampleSupplyScenario['rankingCriterion']} */ (
      textValue(meta, 'rankingCriterion')
    ),
    suppliers: entityRows('supplier').map(row => ({
      id: textValue(row, 'id'),
      capacityUnitsPerDay: number(row, 'capacityUnitsPerDay'),
      unit: textValue(row, 'unit'),
    })),
    destination: {
      id: textValue(destination, 'id'),
      dailyDemandUnits: number(destination, 'dailyDemandUnits'),
      startingInventoryUnits: number(destination, 'startingInventoryUnits'),
      maxBufferUnits: number(destination, 'maxBufferUnits'),
      unit: textValue(destination, 'unit'),
    },
    routes: entityRows('route').map(row => ({
      id: textValue(row, 'id'),
      fromId: textValue(row, 'fromId'),
      toId: textValue(row, 'toId'),
      capacityUnitsPerDay: number(row, 'capacityUnitsPerDay'),
      maxCapacityUnitsPerDay: number(row, 'maxCapacityUnitsPerDay'),
      leadTimeDays: number(row, 'leadTimeDays'),
      unitCostCents: number(row, 'unitCostCents'),
    })),
    disruption: {
      routeId: textValue(disruption, 'routeId'),
      startsDay: number(disruption, 'startsDay'),
      durationDays: number(disruption, 'durationDays'),
      reductionPercent: number(disruption, 'reductionPercent'),
      warningLeadDays: number(disruption, 'warningLeadDays'),
    },
    mitigations: entityRows('mitigation').map(row => ({
      id: textValue(row, 'id'),
      kind: /** @type {'capacity'|'buffer'} */ (textValue(row, 'kind')),
      routeId: row.routeId || undefined,
      capacityUnitsPerDay: optionalNumber(row, 'capacityUnitsPerDay', number),
      bufferUnits: optionalNumber(row, 'bufferUnits', number),
      leadTimeDays: number(row, 'leadTimeDays'),
      unitCostCents: number(row, 'unitCostCents'),
    })),
    ...(Object.keys(references).length
      ? { industryGraphReferences: references }
      : {}),
  };
}

/**
 * Parse comma-separated records with quoted commas and escaped quote support.
 * Newlines inside quoted fields are rejected because this compact dataset has
 * no multiline text fields.
 * @param {string} text CSV source.
 * @returns {string[][]} Parsed rows.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else if (character === '\n' || character === '\r')
        throw new Error('CSV quoted fields cannot contain line breaks.');
      else field += character;
    } else if (character === '"' && field === '') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * @param {Record<string, string>} row CSV record.
 * @param {string} field Column name.
 * @param {(row: Record<string, string>, field: string) => number} parseNumber Numeric parser.
 * @returns {number|undefined} Optional value.
 */
function optionalNumber(row, field, parseNumber) {
  return row[field] === '' ? undefined : parseNumber(row, field);
}

/**
 * @param {HTMLElement} element Live status element.
 * @param {string} message Status text.
 * @param {'ready'|'error'} state Status category.
 * @returns {void} Updates accessible feedback.
 */
function setDataStatus(element, message, state) {
  element.textContent = message;
  element.dataset.state = state;
}

/**
 * @param {unknown} error Thrown parser, reader, or download error.
 * @returns {string} Safe status message.
 */
function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Could not read scenario data.';
}

/**
 * @param {SampleSupplyScenario} scenario Base assumptions and mitigations.
 * @param {Exclude<ReturnType<typeof planSupplyChain>, {error: string}>} plan Calculated response.
 * @param {string} dataOrigin Scenario provenance label.
 * @returns {SupplyResponseExport} Auditable export record.
 */
function makeSupplyResponseExport(scenario, plan, dataOrigin) {
  return {
    formatVersion: 1,
    scenario,
    baseline: plan.baseline,
    signal: plan.signal,
    rankingCriterion: plan.rankingCriterion,
    rankedMitigations: plan.rankedMitigations,
    assumptions: {
      dataOrigin,
      constraints: {
        horizonDays: scenario.horizonDays,
        suppliers: scenario.suppliers,
        destination: scenario.destination,
        routes: scenario.routes,
      },
      uncertaintyNotes: [
        'Inputs and unit costs are user-supplied or synthetic assumptions.',
        'No live disruption data, verified ETAs, or supplier availability is used.',
      ],
      advisoryOnly: true,
      noExternalActionsTaken: true,
    },
  };
}

/**
 * @param {Document} documentObj Browser document.
 * @param {SampleSupplyScenario} scenario Active validated assumptions.
 * @param {string} dataOrigin Active source label.
 * @returns {void} Reflects imported assumptions without retaining sample copy.
 */
function syncScenarioContext(documentObj, scenario, dataOrigin) {
  setContextText(
    documentObj,
    '#plan-context',
    `${dataOrigin.toUpperCase()} · ${scenario.horizonDays}-DAY PLAN`
  );
  setContextText(
    documentObj,
    '#scenario-summary',
    `${scenario.destination.id} needs ${scenario.destination.dailyDemandUnits} units/day, with ${scenario.destination.startingInventoryUnits} units in starting stock. Plan horizon: ${scenario.horizonDays} days. Change assumptions to compare hypothetical options.`
  );
  setContextText(
    documentObj,
    '#network-heading',
    `Suppliers → ${scenario.destination.id}`
  );
}

/**
 * @param {Document} documentObj Browser document.
 * @param {string} selector Optional context label.
 * @param {string} text Active scenario description.
 * @returns {void} Replaces sample copy when its label is present.
 */
function setContextText(documentObj, selector, text) {
  const element = documentObj.querySelector(selector);
  if (element) element.textContent = text;
}

/**
 * @param {Exclude<ReturnType<typeof planSupplyChain>, {error: string}>} plan Calculated response options.
 * @returns {string} Warning when no feasible option covers the entire shortage.
 */
function demandCoverageWarning(plan) {
  if (plan.baseline.totalShortfallUnits === 0) return '';
  if (
    plan.rankedMitigations.some(
      candidate => candidate.feasible && candidate.remainingShortfallUnits === 0
    )
  )
    return '';
  return ' No feasible option covers all demand. Adjust capacity, timing, or demand assumptions.';
}

/**
 * @param {number|null} days Minimum warning for arrival by the horizon.
 * @returns {string} Timing requirement independent of capacity and shortfall.
 */
function formatWarningRequirement(days) {
  if (days === null) return 'Too slow for horizon';
  if (days === 0) return 'No early warning needed';
  return `${days} ${days === 1 ? 'day' : 'days'} before disruption`;
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
