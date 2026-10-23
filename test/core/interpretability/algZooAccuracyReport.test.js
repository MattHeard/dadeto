import { evaluateAlgZooWholeModelAccuracyV1 } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
import { renderAlgZooWholeModelAccuracyReportV1 } from '../../../src/core/interpretability/algZooAccuracyReport/index.js';

const NOISE_SCALES = [0.01, 0.05, 0.1, 0.2];

/**
 * Create a deterministic report from synthetic unit-test measurements.
 * @param {boolean} [materialVariationMet] Whether to span the preregistered range threshold.
 * @returns {Record<string, any>} Valid evaluator report.
 */
function createReport(materialVariationMet = false) {
  const variants = NOISE_SCALES.flatMap((noiseScale, scaleIndex) =>
    Array.from({ length: 8 }, (_, replicate) => {
      const referenceAccuracy = 0.9 + scaleIndex * 0.01 + replicate * 0.001;
      return {
        variantId:
          scaleIndex === 0 && replicate === 0
            ? 'variant|first'
            : `variant-${String(scaleIndex)}-${String(replicate).padStart(2, '0')}`,
        heldOutSplitId: 'algzoo-held-out-report-test-v1',
        noiseScale,
        referenceAccuracy,
        mechanisticEstimate: referenceAccuracy - 0.01,
        samplingEstimate: referenceAccuracy - 0.04,
        mechanisticCompute: 100000,
        samplingCompute: 100000,
      };
    })
  );
  if (materialVariationMet) {
    variants[variants.length - 1].referenceAccuracy += 0.02;
    variants[variants.length - 1].mechanisticEstimate += 0.02;
    variants[variants.length - 1].samplingEstimate += 0.02;
  }
  const result = evaluateAlgZooWholeModelAccuracyV1({
    heldOutSplitId: 'algzoo-held-out-report-test-v1',
    sampleCountPerVariant: 100000,
    samplingBaseline: {
      method: {
        repository: 'https://github.com/example/sampling-baseline',
        revision: 'a'.repeat(40),
        path: 'baseline/accuracy.js',
      },
      seedCommitment: 'b'.repeat(64),
    },
    variants,
  });
  if (!result.valid) throw new Error('Synthetic accuracy report is invalid.');
  return result.report;
}

describe('AlgZoo whole-model accuracy Markdown report', () => {
  it('renders all variants in stable order and separates whole-model metrics', () => {
    const report = createReport();
    const first = renderAlgZooWholeModelAccuracyReportV1(report);
    const second = renderAlgZooWholeModelAccuracyReportV1(report);

    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(first.markdown).toBe(second.valid ? second.markdown : '');
    expect(first.markdown).toContain('- Evaluation status: `measured`');
    expect(first.markdown).toContain('Variant measurements');
    expect(first.markdown).toContain('variant\\|first');
    expect(first.markdown.match(/^\| variant/gm)).toHaveLength(32);
    expect(first.markdown).toContain(
      'Reference-accuracy uncertainty: not present'
    );
    expect(first.markdown).toContain(
      'does not measure local neuron interpretation progress'
    );
    const variedReport = renderAlgZooWholeModelAccuracyReportV1(
      createReport(true)
    );
    expect(variedReport.valid).toBe(true);
    if (variedReport.valid) {
      expect(variedReport.markdown).toContain(
        '- Material variation condition: met'
      );
    }
    expect(first.markdown.indexOf('variant-0-01')).toBeLessThan(
      first.markdown.indexOf('variant-1-00')
    );
  });

  it('rejects missing, malformed, incomplete, and inconsistent report data', () => {
    expect(renderAlgZooWholeModelAccuracyReportV1(null)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report' }],
    });
    const report = createReport();
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        sampleCountPerVariant: 1,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-metadata' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        samplingBaseline: null,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-baseline' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({ ...report, overall: null })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-overall' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        overall: { ...report.overall, mechanisticMse: Number.NaN },
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-overall' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({ ...report, byNoiseScale: [] })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-scales' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        byNoiseScale: [
          { ...report.byNoiseScale[0], noiseScale: 0.02 },
          ...report.byNoiseScale.slice(1),
        ],
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-scale', index: 0 }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        referenceAccuracyRange: null,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-reference-range' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        overall: { ...report.overall, mechanisticMse: 0 },
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'inconsistent-accuracy-report-overall' }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        byNoiseScale: report.byNoiseScale.map((row, index) =>
          index === 0 ? { ...row, samplingMse: 0 } : row
        ),
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'inconsistent-accuracy-report-scale', index: 0 }],
    });
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        materialVariationMet: !report.materialVariationMet,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'inconsistent-accuracy-report-reference-range' }],
    });
    const badVariant = report.variants.map(row => ({ ...row }));
    badVariant[0].samplingCompute = 1;
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        variants: badVariant,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-variant', index: 0 }],
    });
    const nonnumericVariant = report.variants.map(row => ({ ...row }));
    nonnumericVariant[0].referenceAccuracy = Number.NaN;
    expect(
      renderAlgZooWholeModelAccuracyReportV1({
        ...report,
        variants: nonnumericVariant,
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-report-variant', index: 0 }],
    });
  });
});
