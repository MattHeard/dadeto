import { createValidationError, isRecord } from '../algZooValidation/index.js';
import { ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS } from '../algZooCoverageCostAnalysis/index.js';

const TARGET_COUNT = 16;

/**
 * Render a deterministic Markdown report from a validated coverage-cost analysis.
 * @param {unknown} result Analyzer result.
 * @returns {{valid: true, markdown: string}|{valid: false, errors: Array<{code: string, index?: number}>}} Render result or stable validation errors.
 */
export function renderAlgZooCoverageCostReportV1(result) {
  const errors = validateAnalysisResult(result);
  if (errors.length > 0) return { valid: false, errors };

  const analysis = /** @type {Record<string, any>} */ (result).analysis;
  const rows = /** @type {Array<Record<string, any>>} */ (analysis.pairs);
  const pairsById = new Map(rows.map(pair => [pair.targetId, pair]));
  const sections = [
    '# AlgZoo M16,10 map-coverage cost analysis',
    '',
    `- Protocol version: ${escapeCell(analysis.protocolVersion)}`,
    `- Target pairs: ${analysis.pairCount}`,
    `- Bootstrap: ${escapeCell(analysis.bootstrap.method)}; ${analysis.bootstrap.replicateCount} replicates; seed ${analysis.bootstrap.seed}; 95% interval`,
    `- Interpretation: ${escapeCell(analysis.interpretation)}`,
  ];

  for (const trend of analysis.trends) {
    sections.push('', `## ${trend.metric}`, '');
    if (trend.status === 'measured') {
      sections.push(
        `OLS slope: ${formatNumber(trend.slope)}; 95% paired bootstrap interval: [${formatNumber(trend.interval.lower)}, ${formatNumber(trend.interval.upper)}]; valid replicates: ${trend.validBootstrapReplicates}/${analysis.bootstrap.replicateCount}.`
      );
    } else {
      sections.push(`Trend not estimable: ${escapeCell(trend.reason)}.`);
    }
    sections.push(
      '',
      '| Target | Coverage | Control cost | Treatment cost | Log-cost difference | Control attempt | Treatment attempt | Measurement |',
      '| --- | ---: | ---: | ---: | ---: | --- | --- | --- |'
    );

    for (const observation of trend.pairs) {
      const pair = /** @type {Record<string, any>} */ (
        pairsById.get(observation.targetId)
      );
      sections.push(
        `| ${observation.targetId} | ${formatNumber(observation.mapCoverage)} | ${formatNumber(observation.controlCost)} | ${formatNumber(observation.treatmentCost)} | ${formatNumber(observation.logCostDifference)} | ${escapeCell(pair.control.attemptStatus)} | ${escapeCell(pair.treatment.attemptStatus)} | ${escapeCell(observation.reason ?? 'complete')} |`
      );
    }
  }

  return { valid: true, markdown: `${sections.join('\n')}\n` };
}

/**
 * Validate the analyzer output shape needed for a faithful report.
 * @param {unknown} result Candidate result.
 * @returns {Array<{code: string, index?: number}>} Stable errors.
 */
function validateAnalysisResult(result) {
  if (
    !isRecord(result) ||
    result.valid !== true ||
    !isRecord(result.analysis)
  ) {
    return createValidationError('invalid-analysis-result');
  }
  const analysis = result.analysis;
  if (
    typeof analysis.protocolVersion !== 'string' ||
    !Number.isInteger(analysis.pairCount) ||
    analysis.pairCount !== TARGET_COUNT ||
    typeof analysis.interpretation !== 'string' ||
    !isRecord(analysis.bootstrap) ||
    typeof analysis.bootstrap.method !== 'string' ||
    !Array.isArray(analysis.pairs) ||
    analysis.pairs.length !== TARGET_COUNT ||
    !Array.isArray(analysis.trends) ||
    analysis.trends.length !== ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS.length
  ) {
    return createValidationError('invalid-analysis-metadata');
  }

  for (let index = 0; index < TARGET_COUNT; index += 1) {
    const pair = analysis.pairs[index];
    if (
      !isRecord(pair) ||
      !Number.isInteger(pair.targetId) ||
      !Number.isFinite(pair.mapCoverage) ||
      !isRecord(pair.control) ||
      !isRecord(pair.treatment) ||
      typeof pair.control.attemptStatus !== 'string' ||
      typeof pair.treatment.attemptStatus !== 'string'
    ) {
      return createValidationError('invalid-analysis-pair', index);
    }
  }

  for (
    let index = 0;
    index < ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS.length;
    index += 1
  ) {
    const trend = analysis.trends[index];
    if (
      !isRecord(trend) ||
      trend.metric !== ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS[index] ||
      !['measured', 'not-estimable'].includes(trend.status) ||
      !Array.isArray(trend.pairs) ||
      trend.pairs.length !== TARGET_COUNT
    ) {
      return createValidationError('invalid-analysis-trend', index);
    }
    for (let pairIndex = 0; pairIndex < TARGET_COUNT; pairIndex += 1) {
      const observation = trend.pairs[pairIndex];
      if (
        !isRecord(observation) ||
        !Number.isInteger(observation.targetId) ||
        !analysis.pairs.some(pair => pair.targetId === observation.targetId)
      ) {
        return createValidationError('invalid-analysis-trend', index);
      }
    }
  }
  return [];
}

/**
 * Format a finite number without locale-dependent notation.
 * @param {unknown} value Numeric value or null.
 * @returns {string} Stable report cell.
 */
function formatNumber(value) {
  if (value === null) return 'not-estimable';
  return Number.isFinite(value) ? String(value) : 'not-estimable';
}

/**
 * Keep untrusted status and metadata strings inside one Markdown cell.
 * @param {unknown} value Text value.
 * @returns {string} Escaped single-line cell.
 */
function escapeCell(value) {
  return String(value).replace(/[|`\r\n]/g, character => {
    if (character === '|') return '\\|';
    if (character === '`') return '\\`';
    return ' ';
  });
}
