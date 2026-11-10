import { parseHeatPumpFieldValue, parseHeatPumpScenario } from '../src/logic/boundary/industrial-heat-pump/presentation-input.js';
import { createHeatPumpPresentation } from '../src/logic/core/industrial-heat-pump/presentation.js';
import type { HeatPumpAssumptions, HeatPumpPublicComparison } from '../src/logic/core/industrial-heat-pump/industrial-heat-pump.js';

const presentation = createHeatPumpPresentation({number: value => String(value), currency: value => String(value)});
declare const assumptions: HeatPumpAssumptions;
declare const comparison: HeatPumpPublicComparison;
for (const update of presentation.comparisonUpdates(assumptions, comparison)) {
  if (update.kind === 'text') {
    const value: string = update.value();
    void value;
    // @ts-expect-error Text projections do not contain list items.
    update.items;
  } else {
    const items: string[] = update.items;
    void items;
    // @ts-expect-error List projections do not contain a text formatter.
    update.value();
  }
}
declare const unknownInput: unknown;
// @ts-expect-error Raw unknown assumptions cannot enter trusted presentation.
presentation.comparisonUpdates(unknownInput, comparison);
// @ts-expect-error Numeric-only formatters cannot handle opaque public slots.
createHeatPumpPresentation({number: (value: number) => String(value), currency: value => String(value)});

const field = parseHeatPumpFieldValue({value: '2'});
if (field.ok) {const candidate: number = field.evidence; void candidate;}
// @ts-expect-error Failure results must be narrowed before reading numeric evidence.
const unnarrowed: number = field.evidence;
void unnarrowed;
// @ts-expect-error The selector boundary consumes unparsed strings, not numbers.
parseHeatPumpScenario(2);
const message: string | undefined = presentation.fieldError('heatPumpCop', []).message();
void message;
// @ts-expect-error Missing legacy message entries are explicitly optional.
const guaranteedMessage: string = presentation.fieldError('heatPumpCop', []).message();
void guaranteedMessage;
