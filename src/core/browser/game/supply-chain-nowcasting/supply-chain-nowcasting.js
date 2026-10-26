/** @typedef {{id: string, capacityUnitsPerDay: number, unit: 'units/day'}} SupplySupplier */
/** @typedef {{id: string, dailyDemandUnits: number, startingInventoryUnits: number, unit: 'units/day'}} SupplyDestination */
/** @typedef {{id: string, fromId: string, toId: string, capacityUnitsPerDay: number, maxCapacityUnitsPerDay: number, leadTimeDays: number}} SupplyRoute */
/** @typedef {{routeId: string, startsDay: number, reductionPercent: number, warningLeadDays: number}} SupplyDisruption */
/** @typedef {{id: string, routeId: string, capacityUnitsPerDay: number, leadTimeDays: number}} SupplyMitigation */
/** @typedef {{horizonDays: number, suppliers: SupplySupplier[], destination: SupplyDestination, routes: SupplyRoute[], disruption: SupplyDisruption, mitigations: SupplyMitigation[]}} SupplyScenario */
/** @typedef {{day: number, deliveries: number, inventoryUnits: number, unmetDemandUnits: number}} SupplyDailyResult */
/** @typedef {{daily: SupplyDailyResult[], totalShortfallUnits: number, firstShortfallDay: number|null}} SupplySimulation */
/** @typedef {SupplyMitigation & {feasible: boolean, arrivalDay: number, shortfallAvoidedUnits: number, reason: string|null}} RankedMitigation */
/** @typedef {{error: 'invalid-input', issues: string[]}} InvalidSupplyPlan */
/** @typedef {{baseline: SupplySimulation, signal: {status: string, decisionDay: number, disruptionDay: number, leadTimeDays: number, hypothetical: true}, rankingCriterion: string, rankedMitigations: RankedMitigation[]}} SupplyPlan */

/**
 * Validate and simulate a small, direct supplier-to-destination network.
 * Quantities are units/day and integer days from scenario start. Values are
 * synthetic assumptions; this module performs no I/O.
 * @param {unknown} input Scenario data.
 * @returns {SupplyPlan|InvalidSupplyPlan} Deterministic plan or validation issues.
 */
export function planSupplyChain(input) {
  const issues = validateSupplyChainInput(input);
  if (issues.length) return { error: 'invalid-input', issues };

  const scenario = /** @type {SupplyScenario} */ (input);
  const { horizonDays, routes, suppliers, disruption, mitigations } = scenario;
  const routeById = new Map(routes.map(route => [route.id, route]));
  const baseline = simulate(scenario, null);
  const decisionDay = Math.max(
    0,
    disruption.startsDay - disruption.warningLeadDays
  );
  const signal = {
    status:
      decisionDay < disruption.startsDay
        ? 'early-warning'
        : 'current-disruption',
    decisionDay,
    disruptionDay: disruption.startsDay,
    leadTimeDays: disruption.warningLeadDays,
    hypothetical: /** @type {const} */ (true),
  };

  const rankedMitigations = mitigations
    .map(mitigation => {
      const route = /** @type {SupplyRoute} */ (
        routeById.get(mitigation.routeId)
      );
      const arrivalDay = decisionDay + mitigation.leadTimeDays;
      const capacityFeasible =
        mitigation.capacityUnitsPerDay <=
          route.maxCapacityUnitsPerDay - route.capacityUnitsPerDay &&
        mitigation.capacityUnitsPerDay <=
          /** @type {SupplySupplier} */ (
            suppliers.find(({ id }) => id === route.fromId)
          ).capacityUnitsPerDay -
            route.capacityUnitsPerDay;
      const feasible = capacityFeasible && arrivalDay <= horizonDays;
      if (!feasible)
        return {
          ...mitigation,
          feasible: false,
          arrivalDay,
          shortfallAvoidedUnits: 0,
          reason: !capacityFeasible
            ? 'exceeds-available-capacity'
            : 'arrives-after-horizon',
        };
      const candidate = simulate(scenario, { ...mitigation, arrivalDay });
      return {
        ...mitigation,
        feasible: true,
        arrivalDay,
        shortfallAvoidedUnits:
          baseline.totalShortfallUnits - candidate.totalShortfallUnits,
        reason: null,
      };
    })
    .sort(
      (left, right) =>
        Number(right.feasible) - Number(left.feasible) ||
        right.shortfallAvoidedUnits - left.shortfallAvoidedUnits ||
        left.id.localeCompare(right.id)
    );

  return {
    baseline,
    signal,
    rankingCriterion: 'shortfall-avoided-units',
    rankedMitigations,
  };
}

/**
 * @param {unknown} input Scenario data.
 * @returns {string[]} Validation issues.
 */
function validateSupplyChainInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return ['Provide a scenario object.'];
  const scenario = /** @type {Record<string, any>} */ (input);
  const issues = [];
  if (!Number.isInteger(scenario.horizonDays) || scenario.horizonDays < 1)
    issues.push('Horizon must be a positive whole number of days.');
  const suppliers = Array.isArray(scenario.suppliers) ? scenario.suppliers : [];
  const routes = Array.isArray(scenario.routes) ? scenario.routes : [];
  const mitigations = Array.isArray(scenario.mitigations)
    ? scenario.mitigations
    : [];
  if (!Array.isArray(scenario.mitigations))
    issues.push('Mitigations must be an array.');
  if (!suppliers.length) issues.push('Provide at least one supplier.');
  if (!routes.length) issues.push('Provide at least one route.');
  if (!scenario.destination || !validId(scenario.destination.id))
    issues.push('Provide a destination with a valid ID.');
  else {
    checkQuantity(
      scenario.destination.dailyDemandUnits,
      'Destination daily demand',
      issues
    );
    checkQuantity(
      scenario.destination.startingInventoryUnits,
      'Starting inventory',
      issues
    );
    if (scenario.destination.unit !== 'units/day')
      issues.push('Destination demand unit must be units/day.');
  }
  uniqueIds(suppliers, 'supplier', issues);
  uniqueIds(routes, 'route', issues);
  uniqueIds(mitigations, 'mitigation', issues);
  const supplierIds = new Set(suppliers.map(({ id }) => id));
  const destinationId = scenario.destination?.id;
  for (const supplier of suppliers) {
    checkQuantity(
      supplier.capacityUnitsPerDay,
      `Supplier ${supplier.id} capacity`,
      issues
    );
    if (supplier.unit !== 'units/day')
      issues.push(`Supplier ${supplier.id} unit must be units/day.`);
  }
  for (const route of routes) {
    if (!supplierIds.has(route.fromId))
      issues.push(`Route ${route.id} must start at a known supplier.`);
    if (route.toId !== destinationId)
      issues.push(
        `Route ${route.id} must end at the destination; only direct routes are supported.`
      );
    if (!supplierIds.has(route.fromId) || route.toId !== destinationId)
      issues.push(`Route ${route.id} creates an unsupported path or cycle.`);
    checkQuantity(
      route.capacityUnitsPerDay,
      `Route ${route.id} capacity`,
      issues
    );
    checkQuantity(
      route.maxCapacityUnitsPerDay,
      `Route ${route.id} maximum capacity`,
      issues
    );
    if (route.capacityUnitsPerDay > route.maxCapacityUnitsPerDay)
      issues.push(`Route ${route.id} capacity exceeds its maximum.`);
    checkWholeNonnegative(
      route.leadTimeDays,
      `Route ${route.id} lead time`,
      issues
    );
    const supplier = suppliers.find(({ id }) => id === route.fromId);
    if (supplier && route.capacityUnitsPerDay > supplier.capacityUnitsPerDay)
      issues.push(`Route ${route.id} capacity exceeds supplier capacity.`);
  }
  const disruption = scenario.disruption;
  if (!disruption || !routes.some(({ id }) => id === disruption.routeId))
    issues.push('Disruption must refer to a known route.');
  else {
    checkWholeNonnegative(disruption.startsDay, 'Disruption start day', issues);
    checkWholeNonnegative(
      disruption.warningLeadDays,
      'Warning lead time',
      issues
    );
    if (
      !Number.isFinite(disruption.reductionPercent) ||
      disruption.reductionPercent < 0 ||
      disruption.reductionPercent > 100
    )
      issues.push('Disruption reduction must be between 0 and 100 percent.');
  }
  for (const mitigation of mitigations) {
    if (!validId(mitigation.id))
      issues.push('Mitigation IDs must be non-empty strings.');
    if (!routes.some(({ id }) => id === mitigation.routeId))
      issues.push(`Mitigation ${mitigation.id} must refer to a known route.`);
    checkQuantity(
      mitigation.capacityUnitsPerDay,
      `Mitigation ${mitigation.id} capacity`,
      issues
    );
    checkWholeNonnegative(
      mitigation.leadTimeDays,
      `Mitigation ${mitigation.id} lead time`,
      issues
    );
  }
  return issues;
}

/**
 * @param {SupplyScenario} input Scenario.
 * @param {(SupplyMitigation & {arrivalDay: number})|null} mitigation Candidate or null.
 * @returns {SupplySimulation} Daily inventory and shortage totals.
 */
function simulate(input, mitigation) {
  const { destination, horizonDays, disruption } = input;
  let inventory = destination.startingInventoryUnits;
  let totalShortfallUnits = 0;
  const daily = [];
  for (let day = 1; day <= horizonDays; day += 1) {
    let deliveries = 0;
    for (const route of input.routes) {
      const supplier = /** @type {SupplySupplier} */ (
        input.suppliers.find(({ id }) => id === route.fromId)
      );
      const baseCapacity = Math.min(
        route.capacityUnitsPerDay,
        supplier.capacityUnitsPerDay
      );
      const disrupted =
        route.id === disruption.routeId && day >= disruption.startsDay;
      const effectiveCapacity = disrupted
        ? baseCapacity * (1 - disruption.reductionPercent / 100)
        : baseCapacity;
      if (day >= route.leadTimeDays + 1) deliveries += effectiveCapacity;
      if (mitigation?.routeId === route.id && day >= mitigation.arrivalDay)
        deliveries += mitigation.capacityUnitsPerDay;
    }
    inventory += deliveries;
    const unmetDemandUnits = Math.max(
      0,
      destination.dailyDemandUnits - inventory
    );
    inventory -= destination.dailyDemandUnits - unmetDemandUnits;
    totalShortfallUnits += unmetDemandUnits;
    daily.push({
      day,
      deliveries,
      inventoryUnits: inventory,
      unmetDemandUnits,
    });
  }
  return {
    daily,
    totalShortfallUnits,
    firstShortfallDay:
      daily.find(({ unmetDemandUnits }) => unmetDemandUnits > 0)?.day ?? null,
  };
}

/**
 * @param {{id?: unknown}[]} records Records with IDs.
 * @param {string} label Entity label.
 * @param {string[]} issues Mutable issue list.
 * @returns {void} Adds issues for missing or duplicate IDs.
 */
function uniqueIds(records, label, issues) {
  const seen = new Set();
  for (const record of records) {
    if (!record || !validId(record.id))
      issues.push(`${label} IDs must be non-empty strings.`);
    else if (seen.has(record.id))
      issues.push(`Duplicate ${label} ID: ${record.id}.`);
    seen.add(record?.id);
  }
}

/**
 * @param {unknown} id Candidate ID.
 * @returns {boolean} Whether the ID is valid.
 */
function validId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

/**
 * @param {unknown} value Quantity.
 * @param {string} label Field label.
 * @param {string[]} issues Mutable issue list.
 * @returns {void} Adds an issue when the quantity is invalid.
 */
function checkQuantity(value, label, issues) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    issues.push(`${label} must be a finite non-negative number.`);
}

/**
 * @param {unknown} value Day count.
 * @param {string} label Field label.
 * @param {string[]} issues Mutable issue list.
 * @returns {void} Adds an issue when the day count is invalid.
 */
function checkWholeNonnegative(value, label, issues) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    issues.push(`${label} must be a non-negative whole number of days.`);
}
