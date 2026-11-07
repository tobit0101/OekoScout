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

const MILLION = 1_000_000;

export function formatArea(squareMeters: number): string {
  return `${formatInteger(Math.round(squareMeters))} m²`;
}

export function formatLiters(liters: number): string {
  if (liters >= MILLION) return `${formatDecimal(liters / MILLION)} Mio. L`;
  return `${formatInteger(Math.round(liters))} L`;
}
