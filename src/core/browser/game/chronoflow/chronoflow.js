const DEFAULT_DT = 1 / 60;
const MAX_DT = 0.1;
const MAX_FACE_FLUX = 0.25;
const PRESSURE_STRENGTH = 0.5;
const INERTIA_STRENGTH = 0.12;
const MOMENTUM_GAIN = 4;
const GRAVITY = 0.15;
const PRESSURE_ITERATIONS = 24;
/** @type {Array<{dx: number, dy: number, axis: 'x'|'y', verticalHead: number}>} */
const NEIGHBOR_DIRECTIONS = [
  { dx: 1, dy: 0, axis: 'x', verticalHead: 0 },
  { dx: 0, dy: 1, axis: 'y', verticalHead: 1 },
];

/**
 * @typedef {object} FluidState
 * @property {number} width Grid width in cells.
 * @property {number} height Grid height in cells.
 * @property {number} tick Completed fixed simulation steps.
 * @property {number} viscosity Velocity damping in [0, 1].
 * @property {number[]} volume Water volume per cell in [0, 1].
 * @property {number[]} velocityX Horizontal cell velocity.
 * @property {number[]} velocityY Vertical cell velocity; positive is down.
 * @property {boolean[]} solids Solid-cell mask.
 */

/**
 * @typedef {{cell: number, volume: number}} FluidTransfer
 * @typedef {{dt?: number, sources?: FluidTransfer[], drains?: FluidTransfer[]}} FluidStepOptions
 */

/**
 * Create a bounded grid state for the deterministic Chronoflow solver.
 * @param {{width: number, height: number, viscosity?: number, volume?: number[], velocityX?: number[], velocityY?: number[], solids?: boolean[]}} config Initial grid configuration.
 * @returns {FluidState} Independent fluid state.
 */
export function createFluidState(config) {
  const { width, height } = config;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('Fluid dimensions must be positive safe integers.');
  }

  const cellCount = width * height;
  if (!Number.isSafeInteger(cellCount)) {
    throw new RangeError('Fluid grid is too large.');
  }
  const viscosity = config.viscosity ?? 0.08;
  if (!Number.isFinite(viscosity) || viscosity < 0 || viscosity > 1) {
    throw new RangeError('Fluid viscosity must be between 0 and 1.');
  }

  return {
    width,
    height,
    tick: 0,
    viscosity,
    volume: normalizeCellNumbers(config.volume, cellCount, 'volume', {
      min: 0,
      max: 1,
    }),
    velocityX: normalizeCellNumbers(
      config.velocityX,
      cellCount,
      'horizontal velocity',
      { min: -1, max: 1 }
    ),
    velocityY: normalizeCellNumbers(
      config.velocityY,
      cellCount,
      'vertical velocity',
      { min: -1, max: 1 }
    ),
    solids: normalizeSolids(config.solids, cellCount),
  };
}

/**
 * Advance one deterministic finite-volume step.
 * Face fluxes are planned from hydrostatic head and damped momentum, then
 * applied simultaneously with a donor-volume limiter. This preserves water
 * mass across closed boundaries while keeping every cell in [0, 1].
 * @param {FluidState} state Current state.
 * @param {FluidStepOptions} [options] Fixed step, sources, and drains.
 * @returns {{state: FluidState, sourced: number, drained: number}} Next state and applied boundary volumes.
 */
export function stepFluid(state, options = {}) {
  assertFluidState(state);
  const dt = options.dt ?? DEFAULT_DT;
  if (!Number.isFinite(dt) || dt <= 0 || dt > MAX_DT) {
    throw new RangeError(
      `Fluid step must be greater than 0 and at most ${MAX_DT}.`
    );
  }

  const volume = [...state.volume];
  const sourced = applyTransfers(volume, state.solids, options.sources, true);
  const drained = applyTransfers(volume, state.solids, options.drains, false);
  const faces = planFaceFluxes(state, volume, dt);
  const outgoing = Array(volume.length).fill(0);
  const incoming = Array(volume.length).fill(0);
  for (const face of faces) {
    const donor = face.amount >= 0 ? face.first : face.second;
    const receiver = face.amount >= 0 ? face.second : face.first;
    outgoing[donor] += Math.abs(face.amount);
    incoming[receiver] += Math.abs(face.amount);
  }

  const delta = Array(volume.length).fill(0);
  const momentumX = Array(volume.length).fill(0);
  const momentumY = Array(volume.length).fill(0);
  for (const face of faces) {
    const donor = face.amount >= 0 ? face.first : face.second;
    const receiver = face.amount >= 0 ? face.second : face.first;
    const donorScale =
      outgoing[donor] > volume[donor] ? volume[donor] / outgoing[donor] : 1;
    const capacity = 1 - volume[receiver];
    const receiverScale =
      incoming[receiver] > capacity ? capacity / incoming[receiver] : 1;
    const amount = face.amount * Math.min(donorScale, receiverScale);
    delta[face.first] -= amount;
    delta[face.second] += amount;
    if (face.axis === 'x') {
      momentumX[face.first] += amount;
      momentumX[face.second] += amount;
    } else {
      momentumY[face.first] += amount;
      momentumY[face.second] += amount;
    }
  }

  const nextVolume = volume.map((cellVolume, index) => {
    const next = cellVolume + delta[index];
    return Math.min(1, Math.max(0, next));
  });
  const advectedVelocityX = state.velocityX.map((velocity, index) =>
    nextVolume[index] === 0 || state.solids[index]
      ? 0
      : clampVelocity(
          velocity * (1 - state.viscosity) + momentumX[index] * MOMENTUM_GAIN
        )
  );
  const advectedVelocityY = state.velocityY.map((velocity, index) => {
    if (nextVolume[index] === 0 || state.solids[index]) return 0;
    return clampVelocity(
      velocity * (1 - state.viscosity) +
        momentumY[index] * MOMENTUM_GAIN +
        GRAVITY * dt
    );
  });

  const advectedVelocity = advectVelocityField({
    width: state.width,
    height: state.height,
    velocityX: advectedVelocityX,
    velocityY: advectedVelocityY,
    solids: state.solids,
    dt,
  });
  const projectedVelocity = projectVelocity({
    width: state.width,
    height: state.height,
    velocityX: advectedVelocity.velocityX,
    velocityY: advectedVelocity.velocityY,
    solids: state.solids,
  });
  return {
    state: {
      ...state,
      tick: state.tick + 1,
      volume: nextVolume,
      velocityX: projectedVelocity.velocityX,
      velocityY: projectedVelocity.velocityY,
    },
    sourced,
    drained,
  };
}

/**
 * Semi-Lagrangian backtrace and bilinear sample of the cell-centered field.
 * @param {{width: number, height: number, velocityX: number[], velocityY: number[], solids: boolean[], dt: number}} grid Velocity field and fixed step.
 * @returns {{velocityX: number[], velocityY: number[]}} Advected field.
 */
export function advectVelocityField(grid) {
  const { velocityX, velocityY, dt } = grid;
  const { velocityX: nextX, velocityY: nextY } = createVelocityBuffers(grid);
  forEachFluidCell(grid, (cell, x, y) => {
    const sourceX = x - velocityX[cell] * dt;
    const sourceY = y - velocityY[cell] * dt;
    nextX[cell] = sampleVelocity(velocityX, { x: sourceX, y: sourceY }, grid);
    nextY[cell] = sampleVelocity(velocityY, { x: sourceX, y: sourceY }, grid);
  });
  return {
    velocityX: nextX.map(clampVelocity),
    velocityY: nextY.map(clampVelocity),
  };
}

/**
 * Copy velocity arrays while enforcing zero velocity in solid cells.
 * @param {{width: number, height: number, velocityX: number[], velocityY: number[], solids: boolean[]}} grid Velocity field.
 * @returns {{velocityX: number[], velocityY: number[]}} Mutable working arrays.
 */
function createVelocityBuffers(grid) {
  return {
    velocityX: grid.velocityX.map((value, cell) =>
      grid.solids[cell] ? 0 : value
    ),
    velocityY: grid.velocityY.map((value, cell) =>
      grid.solids[cell] ? 0 : value
    ),
  };
}

/**
 * Visit fluid cells in stable row-major order.
 * @param {{width: number, height: number, solids: boolean[]}} grid Grid geometry.
 * @param {(cell: number, x: number, y: number) => void} visit Cell operation.
 * @returns {void}
 */
function forEachFluidCell(grid, visit) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const cell = y * grid.width + x;
      if (!grid.solids[cell]) visit(cell, x, y);
    }
  }
}

/**
 * Sample a scalar cell field by clamped bilinear interpolation, excluding solids.
 * @param {number[]} field Cell values.
 * @param {{x: number, y: number}} point Grid coordinate.
 * @param {{width: number, height: number, solids: boolean[]}} grid Sampling grid.
 * @returns {number} Interpolated value from available fluid cells.
 */
function sampleVelocity(field, point, grid) {
  const { width, height, solids } = grid;
  const { x, y } = point;
  const sampleX = Math.min(width - 1, Math.max(0, x));
  const sampleY = Math.min(height - 1, Math.max(0, y));
  const left = Math.floor(sampleX);
  const right = Math.min(width - 1, left + 1);
  const top = Math.floor(sampleY);
  const bottom = Math.min(height - 1, top + 1);
  const fractionX = sampleX - left;
  const fractionY = sampleY - top;
  const samples = [
    { cell: top * width + left, weight: (1 - fractionX) * (1 - fractionY) },
    { cell: top * width + right, weight: fractionX * (1 - fractionY) },
    { cell: bottom * width + left, weight: (1 - fractionX) * fractionY },
    { cell: bottom * width + right, weight: fractionX * fractionY },
  ];
  let weightedValue = 0;
  let totalWeight = 0;
  for (const sample of samples) {
    if (solids[sample.cell] || sample.weight === 0) continue;
    weightedValue += field[sample.cell] * sample.weight;
    totalWeight += sample.weight;
  }
  return weightedValue / totalWeight;
}

/**
 * Project the cell-centered velocity field toward zero discrete divergence.
 * Fixed Jacobi iterations and neighbor order keep replay deterministic.
 * @param {{width: number, height: number, velocityX: number[], velocityY: number[], solids: boolean[]}} grid Cell-centered velocity grid.
 * @returns {{velocityX: number[], velocityY: number[]}} Projected velocities.
 */
function projectVelocity(grid) {
  const { width, height, velocityX, velocityY, solids } = grid;
  let pressure = Array(width * height).fill(0);
  for (let iteration = 0; iteration < PRESSURE_ITERATIONS; iteration += 1) {
    const nextPressure = [...pressure];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cell = y * width + x;
        if (solids[cell]) continue;
        const left = cell - 1;
        const right = cell + 1;
        const up = cell - width;
        const down = cell + width;
        const neighbors = [];
        if (x > 0 && !solids[left]) neighbors.push(left);
        if (x + 1 < width && !solids[right]) neighbors.push(right);
        if (y > 0 && !solids[up]) neighbors.push(up);
        if (y + 1 < height && !solids[down]) neighbors.push(down);
        if (neighbors.length === 0) continue;
        const divergence =
          (x + 1 < width && !solids[right]
            ? (velocityX[cell] + velocityX[right]) / 2
            : 0) -
          (x > 0 && !solids[left]
            ? (velocityX[left] + velocityX[cell]) / 2
            : 0) +
          (y + 1 < height && !solids[down]
            ? (velocityY[cell] + velocityY[down]) / 2
            : 0) -
          (y > 0 && !solids[up] ? (velocityY[up] + velocityY[cell]) / 2 : 0);
        nextPressure[cell] =
          (neighbors.reduce((sum, neighbor) => sum + pressure[neighbor], 0) -
            divergence) /
          neighbors.length;
      }
    }
    pressure = nextPressure;
  }

  const { velocityX: projectedX, velocityY: projectedY } =
    createVelocityBuffers(grid);
  forEachFluidCell(grid, (cell, x, y) => {
    if (x + 1 < width && !solids[cell + 1]) {
      projectedX[cell] -= pressure[cell + 1] - pressure[cell];
    }
    if (y + 1 < height && !solids[cell + width]) {
      projectedY[cell] -= pressure[cell + width] - pressure[cell];
    }
    projectedX[cell] = clampVelocity(projectedX[cell]);
    projectedY[cell] = clampVelocity(projectedY[cell]);
  });
  return { velocityX: projectedX, velocityY: projectedY };
}

/**
 * Normalize initial per-cell values and enforce physical bounds.
 * @param {number[] | undefined} values Input values.
 * @param {number} cellCount Required array size.
 * @param {string} label Field label for errors.
 * @param {{min: number, max: number}} bounds Accepted range.
 * @returns {number[]} A copied, validated array.
 */
function normalizeCellNumbers(values, cellCount, label, bounds) {
  if (values === undefined) return Array(cellCount).fill(0);
  if (!Array.isArray(values) || values.length !== cellCount) {
    throw new RangeError(`${label} must contain one value per cell.`);
  }
  return values.map(value => {
    if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      throw new RangeError(
        `${label} values must be between ${bounds.min} and ${bounds.max}.`
      );
    }
    return value;
  });
}

/**
 * Normalize the solid-cell mask.
 * @param {boolean[] | undefined} values Input mask.
 * @param {number} cellCount Required array size.
 * @returns {boolean[]} A copied mask.
 */
function normalizeSolids(values, cellCount) {
  if (values === undefined) return Array(cellCount).fill(false);
  if (!Array.isArray(values) || values.length !== cellCount) {
    throw new RangeError('Solid mask must contain one value per cell.');
  }
  if (values.some(value => typeof value !== 'boolean')) {
    throw new TypeError('Solid mask entries must be boolean.');
  }
  return [...values];
}

/**
 * Validate a state supplied to the solver.
 * @param {FluidState} state Candidate state.
 * @returns {void}
 */
function assertFluidState(state) {
  if (
    !state ||
    !Number.isSafeInteger(state.width) ||
    !Number.isSafeInteger(state.height)
  ) {
    throw new TypeError('A valid fluid state is required.');
  }
  const count = state.width * state.height;
  if (
    state.width <= 0 ||
    state.height <= 0 ||
    !Number.isSafeInteger(count) ||
    !Array.isArray(state.volume) ||
    !Array.isArray(state.velocityX) ||
    !Array.isArray(state.velocityY) ||
    !Array.isArray(state.solids) ||
    state.volume.length !== count ||
    state.velocityX.length !== count ||
    state.velocityY.length !== count ||
    state.solids.length !== count
  ) {
    throw new TypeError('Fluid state arrays must match its grid dimensions.');
  }
}

/**
 * Apply explicit source or drain amounts before internal flow.
 * @param {number[]} volume Mutable working volumes.
 * @param {boolean[]} solids Solid-cell mask.
 * @param {FluidTransfer[] | undefined} transfers Requested transfers.
 * @param {boolean} isSource Whether to add or remove water.
 * @returns {number} Actual water volume added or removed.
 */
function applyTransfers(volume, solids, transfers, isSource) {
  if (transfers === undefined) return 0;
  if (!Array.isArray(transfers)) {
    throw new TypeError('Fluid transfers must be an array.');
  }
  let transferredVolume = 0;
  for (const transfer of transfers) {
    if (
      !Number.isSafeInteger(transfer?.cell) ||
      transfer.cell < 0 ||
      transfer.cell >= volume.length ||
      solids[transfer.cell] ||
      !Number.isFinite(transfer.volume) ||
      transfer.volume <= 0
    ) {
      throw new RangeError(
        'Fluid transfer must target a free cell with positive volume.'
      );
    }
    const index = transfer.cell;
    const available = isSource ? 1 - volume[index] : volume[index];
    const applied = Math.min(available, transfer.volume);
    volume[index] += isSource ? applied : -applied;
    transferredVolume += applied;
  }
  return transferredVolume;
}

/**
 * Plan conservative fluxes between neighboring non-solid cells.
 * @param {FluidState} state Current velocity and geometry.
 * @param {number[]} volume Working water volumes after boundary transfers.
 * @param {number} dt Fixed step size.
 * @returns {Array<{first: number, second: number, axis: 'x'|'y', amount: number}>} Signed face flows.
 */
function planFaceFluxes(state, volume, dt) {
  /** @type {Array<{first: number, second: number, axis: 'x'|'y', amount: number}>} */
  const faces = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const first = y * state.width + x;
      if (state.solids[first]) continue;
      for (const direction of NEIGHBOR_DIRECTIONS) {
        const nextX = x + direction.dx;
        const nextY = y + direction.dy;
        if (nextX >= state.width || nextY >= state.height) continue;
        const second = nextY * state.width + nextX;
        if (state.solids[second]) continue;
        const velocity =
          direction.axis === 'x' ? state.velocityX : state.velocityY;
        faces.push({
          first,
          second,
          axis: direction.axis,
          amount: calculateFaceFlux(
            volume[first] - volume[second] + direction.verticalHead,
            (velocity[first] + velocity[second]) / 2,
            dt
          ),
        });
      }
    }
  }
  return faces;
}

/**
 * Convert pressure head and momentum into a bounded face flux.
 * @param {number} headDifference Surface-head difference across a face.
 * @param {number} faceVelocity Mean velocity along the face axis.
 * @param {number} dt Fixed step size.
 * @returns {number} Signed transfer from the first cell to the second.
 */
function calculateFaceFlux(headDifference, faceVelocity, dt) {
  const predicted =
    (headDifference * PRESSURE_STRENGTH + faceVelocity * INERTIA_STRENGTH) * dt;
  return Math.min(MAX_FACE_FLUX, Math.max(-MAX_FACE_FLUX, predicted));
}

/**
 * Keep cell velocity within the stable normalized solver range.
 * @param {number} velocity Candidate velocity.
 * @returns {number} Bounded velocity.
 */
function clampVelocity(velocity) {
  return Math.min(1, Math.max(-1, velocity));
}
