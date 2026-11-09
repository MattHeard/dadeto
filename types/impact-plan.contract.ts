import { parseImpactPlanInputs } from '../src/logic/boundary/local/impact-plan-inputs.js';
import { createTrustedCheckImpactPlan } from '../src/logic/core/local/impact-plan.js';
import { createCheckImpactPlan } from '../src/core/local/checkImpactPlan.js';

const parsed = parseImpactPlanInputs({collectionError: {code: 17}});
if (parsed.ok) {
  const plan = createTrustedCheckImpactPlan(parsed.evidence);
  if (plan.mode === 'fallback') {
    const reason: string | {code: number} = plan.reason;
    void reason;
    // @ts-expect-error An opaque payload cannot be silently described as text.
    const text: string = plan.reason;
    void text;
  }
}
const publicPlan = createCheckImpactPlan({collectionError: 17});
if (publicPlan.mode === 'fallback') {
  const reason: string | number = publicPlan.reason;
  void reason;
  // @ts-expect-error The thin composition retains the numeric payload type.
  const text: string = publicPlan.reason;
  void text;
}
// @ts-expect-error Raw option fields are not interpreted trusted input.
createTrustedCheckImpactPlan({changedPaths: ['src/core/a.js']});
// @ts-expect-error Failure results must be narrowed before accessing evidence.
createTrustedCheckImpactPlan(parsed.evidence);
