import { createHeatPumpPresentation } from '../../logic/core/industrial-heat-pump/presentation.js';
const FORMAT_NUMBER = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
});
const FORMAT_CURRENCY = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
export const presentation = createHeatPumpPresentation({
  number: value => Reflect.apply(FORMAT_NUMBER.format, FORMAT_NUMBER, [value]),
  currency: value =>
    Reflect.apply(FORMAT_CURRENCY.format, FORMAT_CURRENCY, [value]),
});
