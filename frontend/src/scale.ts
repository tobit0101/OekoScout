export interface ColorStop {
  score: number;
  hex: string;
}

export const SCORE_COLOR_STOPS: readonly ColorStop[] = [
  { score: 11, hex: '#D73027' },
  { score: 25, hex: '#F46D43' },
  { score: 40, hex: '#FDAE61' },
  { score: 50, hex: '#FEE08B' },
  { score: 60, hex: '#A6D96A' },
  { score: 72, hex: '#66BD63' },
  { score: 85, hex: '#1A9850' },
];

export const NO_SCORE_COLOR = '#9E9E9E';

export const LEGEND_TICKS: readonly number[] = [11, 25, 40, 55, 70, 85];

const SCALE_MIN = SCORE_COLOR_STOPS[0].score;
const SCALE_MAX = SCORE_COLOR_STOPS[SCORE_COLOR_STOPS.length - 1].score;

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function scoreColor(score: number): string {
  if (score <= SCALE_MIN) return SCORE_COLOR_STOPS[0].hex;
  if (score >= SCALE_MAX) return SCORE_COLOR_STOPS[SCORE_COLOR_STOPS.length - 1].hex;

  const upperIndex = SCORE_COLOR_STOPS.findIndex((stop) => stop.score >= score);
  const lower = SCORE_COLOR_STOPS[upperIndex - 1];
  const upper = SCORE_COLOR_STOPS[upperIndex];
  const t = (score - lower.score) / (upper.score - lower.score);
  const from = hexToRgb(lower.hex);
  const to = hexToRgb(upper.hex);
  return rgbToHex(from.map((channel, i) => channel + (to[i] - channel) * t));
}

export function scoreLabel(score: number): string {
  if (score < 25) return 'Sehr gering';
  if (score < 40) return 'Gering';
  if (score < 55) return 'Mittel';
  if (score < 70) return 'Hoch';
  return 'Sehr hoch';
}

export function scalePosition(score: number): number {
  return ((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

export const SCORE_GRADIENT_CSS = `linear-gradient(90deg, ${SCORE_COLOR_STOPS.map(
  (stop) => `${stop.hex} ${scalePosition(stop.score).toFixed(2)}%`,
).join(', ')})`;
