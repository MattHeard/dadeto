/** @typedef {{id: string, capacityUnitsPerDay: number, unit: 'units/day'}} SupplySupplier */
/** @typedef {{id: string, dailyDemandUnits: number, startingInventoryUnits: number, maxBufferUnits: number, unit: 'units/day'}} SupplyDestination */
/** @typedef {{id: string, fromId: string, toId: string, capacityUnitsPerDay: number, maxCapacityUnitsPerDay: number, leadTimeDays: number, unitCostCents: number}} SupplyRoute */
/** @typedef {{routeId: string, startsDay: number, durationDays: number, reductionPercent: number, warningLeadDays: number}} SupplyDisruption */
/** @typedef {{id: string, kind: 'capacity'|'buffer', routeId?: string, capacityUnitsPerDay?: number, bufferUnits?: number, leadTimeDays: number, unitCostCents: number}} SupplyMitigation */
/** @typedef {{organizations?: string[], offerings?: string[], processes?: string[], inputs?: string[], outputs?: string[], relationships?: string[]}} IndustryGraphReferences */
/** @typedef {{horizonDays: number, suppliers: SupplySupplier[], destination: SupplyDestination, routes: SupplyRoute[], disruption: SupplyDisruption, rankingCriterion: 'shortfall-then-cost'|'cost-then-shortfall', mitigations: SupplyMitigation[], industryGraphReferences?: IndustryGraphReferences}} SupplyScenario */
/** @typedef {{day: number, deliveries: number, inventoryUnits: number, unmetDemandUnits: number, costCents: number}} SupplyDailyResult */
/** @typedef {{daily: SupplyDailyResult[], totalShortfallUnits: number, firstShortfallDay: number|null, totalCostCents: number}} SupplySimulation */
/** @typedef {SupplyMitigation & {feasible: boolean, arrivalDay: number, minimumWarningLeadDays: number|null, shortfallAvoidedUnits: number, incrementalCostCents: number|null, reason: string|null}} RankedMitigation */
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
  const {
    horizonDays,
    routes,
    suppliers,
    disruption,
    mitigations,
    rankingCriterion,
  } = scenario;
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
      const arrivalDay = decisionDay + mitigation.leadTimeDays;
      const minimumWarningLeadDays = warningRequiredForArrival(
        mitigation.leadTimeDays,
        disruption.startsDay,
        horizonDays
      );
      const route = mitigation.routeId
        ? routeById.get(mitigation.routeId)
        : undefined;
      const supplier = route
        ? suppliers.find(({ id }) => id === route.fromId)
        : undefined;
      const capacityFeasible =
        mitigation.kind === 'buffer'
          ? /** @type {number} */ (mitigation.bufferUnits) <=
            scenario.destination.maxBufferUnits
          : Boolean(
              route &&
                supplier &&
                /** @type {number} */ (mitigation.capacityUnitsPerDay) <=
                  route.maxCapacityUnitsPerDay - route.capacityUnitsPerDay &&
                /** @type {number} */ (mitigation.capacityUnitsPerDay) <=
                  supplier.capacityUnitsPerDay -
                    allocatedCapacity(routes, route.fromId)
            );
      const feasible = capacityFeasible && arrivalDay <= horizonDays;
      if (!feasible)
        return {
          ...mitigation,
          feasible: false,
          arrivalDay,
          minimumWarningLeadDays,
          shortfallAvoidedUnits: 0,
          incrementalCostCents: null,
          reason: !capacityFeasible
            ? mitigation.kind === 'buffer'
              ? 'exceeds-buffer-capacity'
              : 'exceeds-available-capacity'
            : 'arrives-after-horizon',
        };
      const candidate = simulate(scenario, { ...mitigation, arrivalDay });
      return {
        ...mitigation,
        feasible: true,
        arrivalDay,
        minimumWarningLeadDays,
        shortfallAvoidedUnits:
          baseline.totalShortfallUnits - candidate.totalShortfallUnits,
        incrementalCostCents:
          candidate.totalCostCents - baseline.totalCostCents,
        reason: null,
      };
    })
    .sort((left, right) => compareMitigations(left, right, rankingCriterion));

  return {
    baseline,
    signal,
    rankingCriterion,
    rankedMitigations,
  };
}

/**
 * Find the earliest warning that permits arrival by the last simulated day.
 * Capacity feasibility and avoided shortfall are evaluated separately.
 * @param {number} leadTimeDays Option's fulfillment lead time.
 * @param {number} disruptionDay First disrupted day.
 * @param {number} horizonDays Last day in the planning horizon.
 * @returns {number|null} Warning days required, or null if day zero is too late.
 */
function warningRequiredForArrival(leadTimeDays, disruptionDay, horizonDays) {
  if (leadTimeDays > horizonDays) return null;
  return Math.max(0, disruptionDay + leadTimeDays - horizonDays);
}

/**
 * @param {RankedMitigation} left Candidate on the left side of the ordering.
 * @param {RankedMitigation} right Candidate on the right side of the ordering.
 * @param {SupplyScenario['rankingCriterion']} criterion Selected ranking rule.
 * @returns {number} Sort order for the two candidates.
 */
function compareMitigations(left, right, criterion) {
  const feasibilityOrder = Number(right.feasible) - Number(left.feasible);
  const shortfallOrder =
    right.shortfallAvoidedUnits - left.shortfallAvoidedUnits;
  const costOrder =
    (left.incrementalCostCents ?? Number.POSITIVE_INFINITY) -
    (right.incrementalCostCents ?? Number.POSITIVE_INFINITY);
  if (feasibilityOrder !== 0) return feasibilityOrder;
  if (criterion === 'cost-then-shortfall')
    return costOrder || shortfallOrder || left.id.localeCompare(right.id);
  return shortfallOrder || costOrder || left.id.localeCompare(right.id);
}

/**
 * @param {unknown} input Scenario data.
 * @returns {string[]} Validation issues.
 */
function validateSupplyChainInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return ['Provide a scenario object.'];
  const scenario = /** @type {Record<string, any>} */ (input);
  const issues = /** @type {string[]} */ ([]);
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
  if (
    !['shortfall-then-cost', 'cost-then-shortfall'].includes(
      scenario.rankingCriterion
    )
  )
    issues.push(
      'Ranking criterion must be shortfall-then-cost or cost-then-shortfall.'
    );
  checkDestination(scenario.destination, issues);
  checkIndustryGraphReferences(scenario.industryGraphReferences, issues);
  uniqueIds(suppliers, 'supplier', issues);
  uniqueIds(routes, 'route', issues);
  uniqueIds(mitigations, 'mitigation', issues);
  const destinationId = scenario.destination?.id;
  suppliers.forEach(supplier => checkSupplier(supplier, issues));
  routes.forEach(route => checkRoute(route, suppliers, destinationId, issues));
  checkSupplierAllocations(suppliers, routes, issues);
  checkDisruption(scenario.disruption, routes, issues);
  mitigations.forEach(mitigation =>
    checkMitigation(mitigation, routes, issues)
  );
  return issues;
}

/**
 * Validate optional opaque graph IDs without resolving them or affecting the plan.
 * @param {unknown} references Optional graph metadata.
 * @param {string[]} issues Validation issues to append to.
 * @returns {void} No return value.
 */
function checkIndustryGraphReferences(references, issues) {
  if (references === undefined) return;
  if (Object.prototype.toString.call(references) !== '[object Object]') {
    issues.push('Industry graph references must be an object.');
    return;
  }
  const referenceObject = /** @type {Record<string, any>} */ (references);
  const kinds = [
    'organizations',
    'offerings',
    'processes',
    'inputs',
    'outputs',
    'relationships',
  ];
  for (const kind of kinds) {
    const ids = referenceObject[kind];
    if (ids === undefined) continue;
    if (!Array.isArray(ids)) {
      issues.push(`Industry graph ${kind} must be an array of opaque IDs.`);
      continue;
    }
    ids.forEach((id, index) => {
      if (typeof id !== 'string' || !validId(id))
        issues.push(`Industry graph ${kind}[${index}] must be a non-empty ID.`);
    });
  }
}

/**
 * @param {Record<string, any>} destination Destination data.
 * @param {string[]} issues Validation issues to append to.
 * @returns {void} No return value.
 */
function checkDestination(destination, issues) {
  if (!destination || !validId(destination.id)) {
    issues.push('Provide a destination with a valid ID.');
    return;
  }
  checkQuantity(
    destination.dailyDemandUnits,
    'Destination daily demand',
    issues
  );
  checkQuantity(
    destination.startingInventoryUnits,
    'Starting inventory',
    issues
  );
  checkQuantity(destination.maxBufferUnits, 'Maximum buffer capacity', issues);
  if (destination.unit !== 'units/day')
    issues.push('Destination demand unit must be units/day.');
}

/**
 * @param {Record<string, any>} supplier Supplier data.
 * @param {string[]} issues Validation issues to append to.
 * @returns {void} No return value.
 */
function checkSupplier(supplier, issues) {
  if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
    issues.push('Supplier records must be objects.');
    return;
  }
  checkQuantity(
    supplier.capacityUnitsPerDay,
    `Supplier ${supplier.id} capacity`,
    issues
  );
  if (supplier.unit !== 'units/day')
    issues.push(`Supplier ${supplier.id} unit must be units/day.`);
}

/**
 * @param {Record<string, any>} route Route data.
 * @param {Record<string, any>[]} suppliers Supplier records.
 * @param {unknown} destinationId Destination ID.
 * @param {string[]} issues Mutable issues.
 * @returns {void}
 */
function checkRoute(route, suppliers, destinationId, issues) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) {
    issues.push('Route records must be objects.');
    return;
  }
  const supplierIds = new Set(suppliers.map(supplier => supplier?.id));
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
  checkNonnegativeInteger(
    route.unitCostCents,
    `Route ${route.id} unit cost in cents`,
    issues
  );
  if (route.capacityUnitsPerDay > route.maxCapacityUnitsPerDay)
    issues.push(`Route ${route.id} capacity exceeds its maximum.`);
  checkNonnegativeInteger(
    route.leadTimeDays,
    `Route ${route.id} lead time`,
    issues
  );
  const supplier = suppliers.find(supplier => supplier?.id === route.fromId);
  if (supplier && route.capacityUnitsPerDay > supplier.capacityUnitsPerDay)
    issues.push(`Route ${route.id} capacity exceeds supplier capacity.`);
}

/**
 * Sum the supplier capacity already reserved across its outgoing routes.
 * @param {SupplyRoute[]} routes Route allocations.
 * @param {unknown} supplierId Supplier whose allocation is needed.
 * @returns {number} Total reserved units per day.
 */
function allocatedCapacity(routes, supplierId) {
  return routes
    .filter(route => route && route.fromId === supplierId)
    .reduce((total, route) => total + route.capacityUnitsPerDay, 0);
}

/**
 * Reject a network that allocates the same supplier output more than once.
 * @param {Record<string, any>[]} suppliers Supplier records.
 * @param {SupplyRoute[]} routes Route allocations.
 * @param {string[]} issues Validation issues.
 * @returns {void} Appends errors for overallocated suppliers.
 */
function checkSupplierAllocations(suppliers, routes, issues) {
  for (const supplier of suppliers) {
    if (
      supplier &&
      allocatedCapacity(routes, supplier.id) > supplier.capacityUnitsPerDay
    )
      issues.push(
        `Supplier ${supplier.id} total route capacity exceeds supplier capacity.`
      );
  }
}

/**
 * @param {Record<string, any>} disruption Disruption data.
 * @param {Record<string, any>[]} routes Routes available to the scenario.
 * @param {string[]} issues Validation issues to append to.
 * @returns {void} No return value.
 */
function checkDisruption(disruption, routes, issues) {
  if (!disruption || !routes.some(route => route?.id === disruption.routeId)) {
    issues.push('Disruption must refer to a known route.');
    return;
  }
  checkNonnegativeInteger(disruption.startsDay, 'Disruption start day', issues);
  checkNonnegativeInteger(
    disruption.durationDays,
    'Disruption duration',
    issues
  );
  if (disruption.durationDays < 1)
    issues.push('Disruption duration must be at least one day.');
  checkNonnegativeInteger(
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

/**
 * @param {Record<string, any>} mitigation Mitigation data.
 * @param {Record<string, any>[]} routes Routes available to the scenario.
 * @param {string[]} issues Validation issues to append to.
 * @returns {void} No return value.
 */
function checkMitigation(mitigation, routes, issues) {
  if (
    !mitigation ||
    typeof mitigation !== 'object' ||
    Array.isArray(mitigation)
  ) {
    issues.push('Mitigation records must be objects.');
    return;
  }
  if (!validId(mitigation.id))
    issues.push('Mitigation IDs must be non-empty strings.');
  if (!['capacity', 'buffer'].includes(mitigation.kind))
    issues.push(`Mitigation ${mitigation.id} kind must be capacity or buffer.`);
  if (mitigation.kind === 'capacity') {
    if (!routes.some(route => route?.id === mitigation.routeId))
      issues.push(`Mitigation ${mitigation.id} must refer to a known route.`);
    checkQuantity(
      mitigation.capacityUnitsPerDay,
      `Mitigation ${mitigation.id} capacity`,
      issues
    );
  } else if (mitigation.kind === 'buffer') {
    checkQuantity(
      mitigation.bufferUnits,
      `Mitigation ${mitigation.id} buffer units`,
      issues
    );
  }
  checkNonnegativeInteger(
    mitigation.unitCostCents,
    `Mitigation ${mitigation.id} unit cost in cents`,
    issues
  );
  checkNonnegativeInteger(
    mitigation.leadTimeDays,
    `Mitigation ${mitigation.id} lead time`,
    issues
  );
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
  let totalCostCents = 0;
  const daily = [];
  for (let day = 1; day <= horizonDays; day += 1) {
    let deliveries = 0;
    let costCents = 0;
    for (const route of input.routes) {
      const supplier = /** @type {SupplySupplier} */ (
        input.suppliers.find(({ id }) => id === route.fromId)
      );
      const baseCapacity = Math.min(
        route.capacityUnitsPerDay,
        supplier.capacityUnitsPerDay
      );
      const disrupted =
        route.id === disruption.routeId &&
        day >= disruption.startsDay &&
        day < disruption.startsDay + disruption.durationDays;
      const effectiveCapacity = disrupted
        ? baseCapacity * (1 - disruption.reductionPercent / 100)
        : baseCapacity;
      if (day >= route.leadTimeDays + 1) {
        deliveries += effectiveCapacity;
        costCents += effectiveCapacity * route.unitCostCents;
      }
      if (
        mitigation?.kind === 'capacity' &&
        mitigation.routeId === route.id &&
        day >= Math.max(1, mitigation.arrivalDay)
      ) {
        const extra = /** @type {number} */ (mitigation.capacityUnitsPerDay);
        deliveries += extra;
        costCents += extra * mitigation.unitCostCents;
      }
    }
    if (
      mitigation?.kind === 'buffer' &&
      day === Math.max(1, mitigation.arrivalDay)
    ) {
      const buffer = /** @type {number} */ (mitigation.bufferUnits);
      deliveries += buffer;
      costCents += buffer * mitigation.unitCostCents;
    }
    inventory += deliveries;
    const unmetDemandUnits = Math.max(
      0,
      destination.dailyDemandUnits - inventory
    );
    inventory -= destination.dailyDemandUnits - unmetDemandUnits;
    totalShortfallUnits += unmetDemandUnits;
    totalCostCents += costCents;
    daily.push({
      day,
      deliveries,
      inventoryUnits: inventory,
      unmetDemandUnits,
      costCents: Math.round(costCents),
    });
  }
  return {
    daily,
    totalShortfallUnits,
    totalCostCents: Math.round(totalCostCents),
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
function checkNonnegativeInteger(value, label, issues) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    issues.push(`${label} must be a non-negative whole number.`);
}
