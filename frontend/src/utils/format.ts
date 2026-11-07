const ONE_DECIMAL = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const INTEGER = new Intl.NumberFormat('de-DE');

export function formatDecimal(value: number): string {
  return ONE_DECIMAL.format(value);
}

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}
