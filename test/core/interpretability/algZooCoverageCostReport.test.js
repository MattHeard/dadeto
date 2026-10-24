import { analyzeAlgZooCoverageCostTrendV1 } from '../../../src/core/interpretability/algZooCoverageCostAnalysis/index.js';
import { renderAlgZooCoverageCostReportV1 } from '../../../src/core/interpretability/algZooCoverageCostReport/index.js';
import { createAlgZooCoverageCostInput } from '../../fixtures/interpretability/algZooCoverageCostInput.js';

describe('AlgZoo coverage-cost report renderer', () => {
  it('renders four deterministic resource sections and all paired target rows', () => {
    const analysis = analyzeAlgZooCoverageCostTrendV1(
      createAlgZooCoverageCostInput()
    );
    const first = renderAlgZooCoverageCostReportV1(analysis);
    const second = renderAlgZooCoverageCostReportV1(analysis);

    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(second).toEqual(first);
    expect(first.markdown).toContain('Protocol version: 1.1');
    expect(first.markdown.match(/^## /gm)).toHaveLength(4);
    expect(first.markdown.match(/^\| [0-9]+ \|/gm)).toHaveLength(64);
    expect(first.markdown).toContain('failed');
    expect(first.markdown).toContain('OLS slope:');
    expect(first.markdown).toContain('valid replicates:');
  });

  it('keeps partial measurements in the report with explicit reasons', () => {
    const input = createAlgZooCoverageCostInput();
    input.pairs[4].treatment.costMeasurementStatus = 'partial';
    const result = renderAlgZooCoverageCostReportV1(
      analyzeAlgZooCoverageCostTrendV1(input)
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.markdown).toContain(
      'Trend not estimable: incomplete-pair-costs.'
    );
    expect(result.markdown).toContain('partial-cost-measurement');
    expect(result.markdown.match(/^\| [0-9]+ \|/gm)).toHaveLength(64);
  });

  it('escapes untrusted attempt labels and rejects malformed analyzer output', () => {
    const input = createAlgZooCoverageCostInput();
    input.pairs[0].control.attemptStatus = 'failed|<line>`\ninjected';
    const result = renderAlgZooCoverageCostReportV1(
      analyzeAlgZooCoverageCostTrendV1(input)
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.markdown).toContain('failed\\|<line>\\` injected');
    expect(result.markdown).not.toContain('injected\n');
    expect(renderAlgZooCoverageCostReportV1(null)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-result' }],
    });
    expect(
      renderAlgZooCoverageCostReportV1({ valid: true, analysis: { pairs: [] } })
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-metadata' }],
    });
  });

  it('fails closed on malformed pair and trend records and formats nonfinite cells', () => {
    const analysis = analyzeAlgZooCoverageCostTrendV1(
      createAlgZooCoverageCostInput()
    );
    const malformedPair = structuredClone(analysis);
    malformedPair.analysis.pairs[0] = null;
    expect(renderAlgZooCoverageCostReportV1(malformedPair)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-pair', index: 0 }],
    });

    const malformedTrend = structuredClone(analysis);
    malformedTrend.analysis.trends[0].status = 'unknown';
    expect(renderAlgZooCoverageCostReportV1(malformedTrend)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-trend', index: 0 }],
    });

    const unmatchedTrendPair = structuredClone(analysis);
    unmatchedTrendPair.analysis.trends[0].pairs[0].targetId = 99;
    expect(renderAlgZooCoverageCostReportV1(unmatchedTrendPair)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-trend', index: 0 }],
    });

    const nonfiniteObservation = structuredClone(analysis);
    nonfiniteObservation.analysis.trends[0].pairs[0].controlCost = Infinity;
    const rendered = renderAlgZooCoverageCostReportV1(nonfiniteObservation);
    expect(rendered.valid).toBe(true);
    if (!rendered.valid) return;
    expect(rendered.markdown).toContain('| 5 | 0 | not-estimable |');
  });
});
