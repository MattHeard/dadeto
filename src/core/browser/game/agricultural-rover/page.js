import {
  compareRoverScenarios,
  estimateRoverFeasibility,
  maximumBreakEvenOperatingCost,
  minimumBreakEvenCoverage,
  validateRoverInput,
} from './agricultural-rover.js';

/**
 * @typedef {object} RoverScenarioInput
 * @property {'weeding'} jobType Current modeled task.
 * @property {number} areaSquareMeters Field area.
 * @property {number} operatingWindowMinutes Available work window.
 * @property {{laborHoursPerHectare: number, hourlyCostCents: number, evidence: 'observed'|'assumed'}} baseline Existing process.
 * @property {{machineCount: number, effectiveCoverageSquareMetersPerHour: number, batteryRuntimeMinutes: number, chargeMinutes: number, downtimePercent: number, supervisionHoursPerMachineHour: number, interventionsPerMachineHour: number, interventionMinutes: number, operatorHourlyCostCents: number, operatingCostCentsPerMachineHour: number, upfrontCostCents: number, comparableJobs: number}} rover Hypothetical fleet.
 */
/**
 * @typedef {object} RoverEstimateDisplay
 * @property {number} elapsedHours Estimated elapsed hours.
 * @property {boolean} fitsOperatingWindow Whether the job fits the window.
 * @property {number} coveredAreaSquareMeters Area covered in the window.
 * @property {number} interventionCount Expected intervention count.
 * @property {number} roverAllInJobCostCents Total estimated job cost.
 * @property {number} manualCostCents Manual baseline cost.
 */

/**
 * Start the client-only Agricultural Rover comparison page.
 * @param {{documentObj: Document, windowObj: Window & typeof globalThis}} deps Browser objects.
 * @returns {void} The page is wired in place.
 */
export function startAgriculturalRoverPage({ documentObj, windowObj }) {
  const form = /** @type {HTMLFormElement} */ (
    documentObj.querySelector('#rover-form')
  );
  const status = /** @type {HTMLElement} */ (
    documentObj.querySelector('#status')
  );
  const resultContent = /** @type {HTMLElement} */ (
    documentObj.querySelector('#result-content')
  );
  const importInput = /** @type {HTMLInputElement} */ (
    documentObj.querySelector('#import-file')
  );
  let currentReport = /** @type {Record<string, any>|null} */ (null);

  const DEFAULTS = {
    jobType: /** @type {'weeding'} */ ('weeding'),
    areaSquareMeters: 10_000,
    operatingWindowHours: 8,
    laborHoursPerHectare: 10,
    baselineHourlyEuro: 25,
    evidence: /** @type {'observed'|'assumed'} */ ('assumed'),
    machineCount: 2,
    coverage: 5_000,
    batteryRuntimeMinutes: 60,
    chargeMinutes: 30,
    downtimePercent: 20,
    supervisionHoursPerMachineHour: 0.25,
    interventionsPerMachineHour: 0.5,
    interventionMinutes: 15,
    operatorHourlyEuro: 30,
    operatingCostEuro: 10,
    upfrontEuro: 2_000,
    comparableJobs: 100,
  };

  const LIMITATIONS = [
    'Effective coverage is an assumption and may not reflect this crop, soil, weather, terrain, or field layout.',
    'The model does not establish weeding quality, crop safety, vendor capability, or regulatory readiness.',
    'Purchase cost is spread evenly across the selected comparable jobs and excludes financing and resale value.',
  ];

  const VENDOR_QUESTIONS = [
    'Was effective coverage measured in fields like yours, and what conditions were recorded?',
    'What is included in downtime, charging, maintenance, and operator intervention figures?',
    'What task-quality and crop-safety evidence supports the claimed weed removal rate?',
    'Which setup, transport, training, support, and seasonal costs are missing from this estimate?',
  ];

  /** @returns {RoverScenarioInput} Unit-explicit scenario parsed from the current form. */
  function readInput() {
    const values = Object.fromEntries(new windowObj.FormData(form));
    /**
     * @param {string} name Form field name.
     * @returns {number} Parsed numeric value.
     */
    const number = name => Number(values[name]);
    return {
      jobType: 'weeding',
      areaSquareMeters: number('areaSquareMeters'),
      operatingWindowMinutes: number('operatingWindowHours') * 60,
      baseline: {
        laborHoursPerHectare: number('laborHoursPerHectare'),
        hourlyCostCents: Math.round(number('baselineHourlyEuro') * 100),
        evidence: /** @type {'observed'|'assumed'} */ (values.evidence),
      },
      rover: {
        machineCount: number('machineCount'),
        effectiveCoverageSquareMetersPerHour: number('coverage'),
        batteryRuntimeMinutes: number('batteryRuntimeMinutes'),
        chargeMinutes: number('chargeMinutes'),
        downtimePercent: number('downtimePercent'),
        supervisionHoursPerMachineHour: number(
          'supervisionHoursPerMachineHour'
        ),
        interventionsPerMachineHour: number('interventionsPerMachineHour'),
        interventionMinutes: number('interventionMinutes'),
        operatorHourlyCostCents: Math.round(number('operatorHourlyEuro') * 100),
        operatingCostCentsPerMachineHour: Math.round(
          number('operatingCostEuro') * 100
        ),
        upfrontCostCents: Math.round(number('upfrontEuro') * 100),
        comparableJobs: number('comparableJobs'),
      },
    };
  }

  /** @param {RoverScenarioInput} input Valid scenario to display in the form. */
  function setFormValues(input) {
    const values = {
      areaSquareMeters: input.areaSquareMeters,
      operatingWindowHours: input.operatingWindowMinutes / 60,
      laborHoursPerHectare: input.baseline.laborHoursPerHectare,
      baselineHourlyEuro: input.baseline.hourlyCostCents / 100,
      evidence: input.baseline.evidence,
      machineCount: input.rover.machineCount,
      coverage: input.rover.effectiveCoverageSquareMetersPerHour,
      batteryRuntimeMinutes: input.rover.batteryRuntimeMinutes,
      chargeMinutes: input.rover.chargeMinutes,
      downtimePercent: input.rover.downtimePercent,
      supervisionHoursPerMachineHour:
        input.rover.supervisionHoursPerMachineHour,
      interventionsPerMachineHour: input.rover.interventionsPerMachineHour,
      interventionMinutes: input.rover.interventionMinutes,
      operatorHourlyEuro: input.rover.operatorHourlyCostCents / 100,
      operatingCostEuro: input.rover.operatingCostCentsPerMachineHour / 100,
      upfrontEuro: input.rover.upfrontCostCents / 100,
      comparableJobs: input.rover.comparableJobs,
    };
    for (const [name, value] of Object.entries(values)) {
      const field = /** @type {HTMLInputElement|HTMLSelectElement} */ (
        form.elements.namedItem(name)
      );
      field.value = String(value);
    }
  }

  /**
   * @param {number} cents Money amount in integer cents.
   * @returns {string} Formatted euro amount.
   */
  function euro(cents) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  }

  /**
   * @param {string} label Metric label.
   * @param {string} value Metric value.
   * @returns {HTMLElement} Safe text-only metric row.
   */
  function metric(label, value) {
    const paragraph = documentObj.createElement('p');
    paragraph.className = 'metric';
    const strong = documentObj.createElement('strong');
    strong.textContent = value;
    paragraph.append(documentObj.createTextNode(`${label}: `), strong);
    return paragraph;
  }

  /** @param {RoverScenarioInput} input Scenario to calculate and display. */
  function renderReport(input) {
    const estimate = estimateRoverFeasibility(input);
    if ('error' in estimate) {
      currentReport = null;
      resultContent.replaceChildren();
      status.textContent = estimate.issues.join(' ');
      return;
    }

    const scenarios = compareRoverScenarios(input);
    const scenarioResults =
      /** @type {Record<string, RoverEstimateDisplay>} */ (scenarios);
    const section = documentObj.createDocumentFragment();
    const cards = documentObj.createElement('div');
    cards.className = 'cards';
    for (const [name, result] of Object.entries(scenarioResults)) {
      const card = documentObj.createElement('article');
      card.className = 'card';
      const heading = documentObj.createElement('h3');
      heading.textContent = `${name[0].toUpperCase()}${name.slice(1)} scenario`;
      card.append(heading);
      card.append(
        metric('Elapsed time', `${result.elapsedHours.toFixed(2)} h`)
      );
      card.append(
        metric('Fits work window', result.fitsOperatingWindow ? 'Yes' : 'No')
      );
      card.append(
        metric(
          'Area covered in window',
          `${Math.round(result.coveredAreaSquareMeters).toLocaleString()} m²`
        )
      );
      card.append(
        metric('Operator interventions', String(result.interventionCount))
      );
      card.append(
        metric('All-in cost per job', euro(result.roverAllInJobCostCents))
      );
      card.append(metric('Manual baseline', euro(result.manualCostCents)));
      cards.append(card);
    }
    section.append(cards);

    const threshold = documentObj.createElement('p');
    threshold.className = 'threshold';
    const speedResult = minimumBreakEvenCoverage(input);
    const costResult = maximumBreakEvenOperatingCost(input);
    const speed = typeof speedResult === 'number' ? speedResult : null;
    const cost = typeof costResult === 'number' ? costResult : null;
    threshold.textContent =
      speed === null || cost === null
        ? 'What must become true? The current labor assumptions leave no operating-cost headroom for parity.'
        : `What must become true? Variable-cost parity needs at least ${speed.toFixed(0)} m² per rover-hour, or running cost at or below ${euro(cost)} per rover-hour (holding other assumptions fixed).`;
    section.append(threshold);
    resultContent.replaceChildren(section);
    status.textContent = `Comparison updated. Baseline evidence: ${input.baseline.evidence}.`;
    currentReport = {
      schemaVersion: 1,
      inputs: input,
      results: {
        base: estimate,
        scenarios: scenarioResults,
        minimumBreakEvenCoverageSquareMetersPerHour: speed,
        maximumBreakEvenOperatingCostCentsPerMachineHour: cost,
      },
      limitations: LIMITATIONS,
      vendorQuestions: VENDOR_QUESTIONS,
    };
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    renderReport(readInput());
  });

  const exportButton = /** @type {HTMLButtonElement} */ (
    documentObj.querySelector('#export-button')
  );
  exportButton.addEventListener('click', () => {
    if (!currentReport) {
      status.textContent = 'Correct the scenario before downloading a brief.';
      return;
    }
    const blob = new windowObj.Blob(
      [`${JSON.stringify(currentReport, null, 2)}\n`],
      {
        type: 'application/json',
      }
    );
    const url = windowObj.URL.createObjectURL(blob);
    const link = documentObj.createElement('a');
    link.href = url;
    link.download = 'agricultural-rover-readiness-brief.json';
    link.click();
    windowObj.URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async () => {
    const file = /** @type {FileList} */ (importInput.files).item(0);
    if (!file) return;
    try {
      const report = JSON.parse(await file.text());
      const issues = validateRoverInput(report.inputs);
      if (report.schemaVersion !== 1 || issues.length)
        throw new Error(issues.join(' ') || 'Unsupported brief version.');
      setFormValues(report.inputs);
      renderReport(readInput());
      status.textContent = `Brief imported and recalculated from its assumptions. Baseline evidence: ${report.inputs.baseline.evidence}.`;
    } catch (error) {
      status.textContent = `Could not import brief: ${error.message}`;
    } finally {
      importInput.value = '';
    }
  });

  const printButton = /** @type {HTMLButtonElement} */ (
    documentObj.querySelector('#print-button')
  );
  printButton.addEventListener('click', () => windowObj.print());

  setFormValues({
    jobType: DEFAULTS.jobType,
    areaSquareMeters: DEFAULTS.areaSquareMeters,
    operatingWindowMinutes: DEFAULTS.operatingWindowHours * 60,
    baseline: {
      laborHoursPerHectare: DEFAULTS.laborHoursPerHectare,
      hourlyCostCents: DEFAULTS.baselineHourlyEuro * 100,
      evidence: DEFAULTS.evidence,
    },
    rover: {
      machineCount: DEFAULTS.machineCount,
      effectiveCoverageSquareMetersPerHour: DEFAULTS.coverage,
      batteryRuntimeMinutes: DEFAULTS.batteryRuntimeMinutes,
      chargeMinutes: DEFAULTS.chargeMinutes,
      downtimePercent: DEFAULTS.downtimePercent,
      supervisionHoursPerMachineHour: DEFAULTS.supervisionHoursPerMachineHour,
      interventionsPerMachineHour: DEFAULTS.interventionsPerMachineHour,
      interventionMinutes: DEFAULTS.interventionMinutes,
      operatorHourlyCostCents: DEFAULTS.operatorHourlyEuro * 100,
      operatingCostCentsPerMachineHour: DEFAULTS.operatingCostEuro * 100,
      upfrontCostCents: DEFAULTS.upfrontEuro * 100,
      comparableJobs: DEFAULTS.comparableJobs,
    },
  });
  renderReport(readInput());
}
