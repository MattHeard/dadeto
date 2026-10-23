import {
  WHOLE_MODEL_NOISE_SCALES,
  WHOLE_MODEL_SAMPLE_COUNT,
  WHOLE_MODEL_VARIANT_COUNT,
} from '../algZooPilotHarness/index.js';

/**
 * Render a validated whole-model accuracy report as deterministic Markdown.
 * @param {unknown} report Stored report returned by evaluateAlgZooWholeModelAccuracyV1.
 * @returns {{valid: true, markdown: string}|{valid: false, errors: Array<{code: string, index?: number}>}} Markdown or stable validation errors.
 */
export function renderAlgZooWholeModelAccuracyReportV1(report) {
  const errors = validateReport(report);
  if (errors.length > 0) return { valid: false, errors };
  const accuracyReport = /** @type {Record<string, any>} */ (report);
  const rows = [...accuracyReport.variants].sort(
    (left, right) =>
      left.noiseScale - right.noiseScale ||
      left.variantId.localeCompare(right.variantId)
  );
  const markdown = [
    '# Whole-model predictive accuracy',
    '',
    '- Evaluation status: `measured`',
    `- Report protocol version: ${markdownCell(accuracyReport.protocolVersion)}`,
    `- Held-out split ID: ${markdownCell(accuracyReport.heldOutSplitId)}`,
    `- Evaluation sequences per variant: ${accuracyReport.sampleCountPerVariant}`,
    `- Perturbed variants: ${accuracyReport.variantCount}`,
    `- Sampling baseline: ${markdownCell(accuracyReport.samplingBaseline.method.repository)}@${markdownCell(accuracyReport.samplingBaseline.method.revision)}:${markdownCell(accuracyReport.samplingBaseline.method.path)}`,
    `- Sampling seed commitment: ${markdownCell(accuracyReport.samplingBaseline.seedCommitment)}`,
    `- Reference accuracy range: ${formatNumber(accuracyReport.referenceAccuracyRange.minimum)}–${formatNumber(accuracyReport.referenceAccuracyRange.maximum)} (spread ${formatNumber(accuracyReport.referenceAccuracyRange.spread)})`,
    `- Material variation condition: ${accuracyReport.materialVariationMet ? 'met' : 'not met'}`,
    '- Reference-accuracy uncertainty: not present in this record; no interval was inferred.',
    '',
    'This section reports whole-model predictive accuracy only. It does not measure local neuron interpretation progress.',
    '',
    '## Overall comparison',
    '',
    '| Method | Mean squared error |',
    '| --- | ---: |',
    `| Mechanistic estimate | ${formatNumber(accuracyReport.overall.mechanisticMse)} |`,
    `| Matched-compute sampling | ${formatNumber(accuracyReport.overall.samplingMse)} |`,
    '',
    '## Per-noise-scale comparison',
    '',
    '| Noise scale | Variants | Mechanistic MSE | Sampling MSE |',
    '| ---: | ---: | ---: | ---: |',
    .../** @type {Array<Record<string, any>>} */ (
      accuracyReport.byNoiseScale
    ).map(
      row =>
        `| ${formatNumber(row.noiseScale)} | ${row.variantCount} | ${formatNumber(row.mechanisticMse)} | ${formatNumber(row.samplingMse)} |`
    ),
    '',
    '## Variant measurements',
    '',
    '| Variant | Noise scale | Reference accuracy | Mechanistic estimate | Sampling estimate | Mechanistic compute | Sampling compute |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(
      row =>
        `| ${markdownCell(row.variantId)} | ${formatNumber(row.noiseScale)} | ${formatNumber(row.referenceAccuracy)} | ${formatNumber(row.mechanisticEstimate)} | ${formatNumber(row.samplingEstimate)} | ${formatNumber(row.mechanisticCompute)} | ${formatNumber(row.samplingCompute)} |`
    ),
    '',
  ].join('\n');
  return { valid: true, markdown: `${markdown}\n` };
}

/**
 * Validate the exact fields consumed by the report renderer.
 * @param {unknown} report Candidate stored report.
 * @returns {Array<{code: string, index?: number}>} Stable validation errors.
 */
function validateReport(report) {
  if (!isRecord(report) || report.schemaVersion !== 1) {
    return [{ code: 'invalid-accuracy-report' }];
  }
  if (
    typeof report.protocolVersion !== 'string' ||
    typeof report.heldOutSplitId !== 'string' ||
    report.heldOutSplitId.trim() === '' ||
    report.sampleCountPerVariant !== WHOLE_MODEL_SAMPLE_COUNT ||
    report.variantCount !== WHOLE_MODEL_VARIANT_COUNT ||
    !Array.isArray(report.variants) ||
    report.variants.length !== WHOLE_MODEL_VARIANT_COUNT
  ) {
    return [{ code: 'invalid-accuracy-report-metadata' }];
  }
  const baseline = report.samplingBaseline;
  if (
    !isRecord(baseline) ||
    !isRecord(baseline.method) ||
    typeof baseline.method.repository !== 'string' ||
    !baseline.method.repository.startsWith('https://') ||
    typeof baseline.method.revision !== 'string' ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(baseline.method.revision) ||
    typeof baseline.method.path !== 'string' ||
    baseline.method.path.trim() === '' ||
    typeof baseline.seedCommitment !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(baseline.seedCommitment)
  ) {
    return [{ code: 'invalid-accuracy-report-baseline' }];
  }
  if (
    !isRecord(report.overall) ||
    !isNonnegativeFinite(report.overall.mechanisticMse) ||
    !isNonnegativeFinite(report.overall.samplingMse)
  ) {
    return [{ code: 'invalid-accuracy-report-overall' }];
  }
  if (
    !Array.isArray(report.byNoiseScale) ||
    report.byNoiseScale.length !== WHOLE_MODEL_NOISE_SCALES.length
  ) {
    return [{ code: 'invalid-accuracy-report-scales' }];
  }
  for (let index = 0; index < WHOLE_MODEL_NOISE_SCALES.length; index += 1) {
    const row = report.byNoiseScale[index];
    if (
      !isRecord(row) ||
      row.noiseScale !== WHOLE_MODEL_NOISE_SCALES[index] ||
      row.variantCount !==
        WHOLE_MODEL_VARIANT_COUNT / WHOLE_MODEL_NOISE_SCALES.length ||
      !isNonnegativeFinite(row.mechanisticMse) ||
      !isNonnegativeFinite(row.samplingMse)
    ) {
      return [{ code: 'invalid-accuracy-report-scale', index }];
    }
  }
  if (
    !isRecord(report.referenceAccuracyRange) ||
    !isProbability(report.referenceAccuracyRange.minimum) ||
    !isProbability(report.referenceAccuracyRange.maximum) ||
    !isNonnegativeFinite(report.referenceAccuracyRange.spread) ||
    typeof report.materialVariationMet !== 'boolean'
  ) {
    return [{ code: 'invalid-accuracy-report-reference-range' }];
  }
  const ids = new Set();
  /** @type {Map<number, Array<Record<string, any>>>} */
  const measurementsByScale = new Map(
    WHOLE_MODEL_NOISE_SCALES.map(noiseScale => [noiseScale, []])
  );
  for (let index = 0; index < report.variants.length; index += 1) {
    const row = report.variants[index];
    if (
      !isRecord(row) ||
      typeof row.variantId !== 'string' ||
      row.variantId.trim() === '' ||
      ids.has(row.variantId) ||
      row.heldOutSplitId !== report.heldOutSplitId ||
      !WHOLE_MODEL_NOISE_SCALES.includes(row.noiseScale) ||
      !isProbability(row.referenceAccuracy) ||
      !isProbability(row.mechanisticEstimate) ||
      !isProbability(row.samplingEstimate) ||
      !isNonnegativeFinite(row.mechanisticCompute) ||
      row.mechanisticCompute === 0 ||
      row.mechanisticCompute !== row.samplingCompute
    ) {
      return [{ code: 'invalid-accuracy-report-variant', index }];
    }
    ids.add(row.variantId);
    measurementsByScale.get(row.noiseScale)?.push(row);
  }
  const variantMse = getMeanSquaredErrors(report.variants);
  if (
    !approximatelyEqual(
      report.overall.mechanisticMse,
      variantMse.mechanistic
    ) ||
    !approximatelyEqual(report.overall.samplingMse, variantMse.sampling)
  ) {
    return [{ code: 'inconsistent-accuracy-report-overall' }];
  }
  for (let index = 0; index < WHOLE_MODEL_NOISE_SCALES.length; index += 1) {
    const noiseScale = WHOLE_MODEL_NOISE_SCALES[index];
    const variants = /** @type {Array<Record<string, any>>} */ (
      measurementsByScale.get(noiseScale)
    );
    const scaleMse = getMeanSquaredErrors(variants);
    const aggregate = report.byNoiseScale[index];
    if (
      variants.length !== 8 ||
      !approximatelyEqual(aggregate.mechanisticMse, scaleMse.mechanistic) ||
      !approximatelyEqual(aggregate.samplingMse, scaleMse.sampling)
    ) {
      return [{ code: 'inconsistent-accuracy-report-scale', index }];
    }
  }
  const referenceAccuracies = report.variants.map(row => row.referenceAccuracy);
  const minimum = Math.min(...referenceAccuracies);
  const maximum = Math.max(...referenceAccuracies);
  const spread = maximum - minimum;
  if (
    !approximatelyEqual(report.referenceAccuracyRange.minimum, minimum) ||
    !approximatelyEqual(report.referenceAccuracyRange.maximum, maximum) ||
    !approximatelyEqual(report.referenceAccuracyRange.spread, spread) ||
    report.materialVariationMet !== spread >= 0.05
  ) {
    return [{ code: 'inconsistent-accuracy-report-reference-range' }];
  }
  return [];
}

/**
 * Recompute paired mean squared error from the stored measurements.
 * @param {Array<Record<string, any>>} variants Report variant measurements.
 * @returns {{mechanistic: number, sampling: number}} Recomputed MSE values.
 */
function getMeanSquaredErrors(variants) {
  let mechanisticTotal = 0;
  let samplingTotal = 0;
  for (const variant of variants) {
    mechanisticTotal +=
      (variant.mechanisticEstimate - variant.referenceAccuracy) ** 2;
    samplingTotal +=
      (variant.samplingEstimate - variant.referenceAccuracy) ** 2;
  }
  return {
    mechanistic: mechanisticTotal / variants.length,
    sampling: samplingTotal / variants.length,
  };
}

/**
 * Compare aggregate floating-point values with a tolerance for summation order.
 * @param {number} actual Stored aggregate.
 * @param {number} expected Aggregate recomputed from the variant rows.
 * @returns {boolean} Whether the values match within numeric tolerance.
 */
function approximatelyEqual(actual, expected) {
  return Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected));
}

/**
 * Check for a non-array record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, any>} Whether the value is a record.
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check for a finite probability value.
 * @param {unknown} value Candidate numeric value.
 * @returns {value is number} Whether the value is in the closed unit interval.
 */
function isProbability(value) {
  if (!Number.isFinite(value)) return false;
  const probability = /** @type {number} */ (value);
  return probability >= 0 && probability <= 1;
}

/**
 * Check for a finite nonnegative measurement.
 * @param {unknown} value Candidate numeric value.
 * @returns {value is number} Whether the value is finite and nonnegative.
 */
function isNonnegativeFinite(value) {
  if (!Number.isFinite(value)) return false;
  return /** @type {number} */ (value) >= 0;
}

/**
 * Format a numeric value without rounding or locale dependence.
 * @param {number} value Finite report value.
 * @returns {string} Stable decimal representation.
 */
function formatNumber(value) {
  return String(value);
}

/**
 * Escape a user-controlled value for a Markdown table cell.
 * @param {string} value Report text.
 * @returns {string} Safe one-line table cell.
 */
function markdownCell(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}
