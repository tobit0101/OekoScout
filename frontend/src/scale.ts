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

export interface SimulationColorStop {
  value: number;
  hex: string;
  alpha: number;
}

export const SIMULATION_COLOR_STOPS: readonly SimulationColorStop[] = [
  { value: 0, hex: '#A6D4FF', alpha: 0.85 },
  { value: 0.25, hex: '#5AA9F5', alpha: 0.85 },
  { value: 0.5, hex: '#2A7DEB', alpha: 0.85 },
  { value: 0.75, hex: '#1A50C8', alpha: 0.85 },
  { value: 1, hex: '#0A2A80', alpha: 0.85 },
];

export const SIMULATION_LEGEND_TICKS: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];

export const NO_SCORE_COLOR = '#9E9E9E';
const NO_SCORE_SIMULATION_ALPHA = 0;

const LEGEND_CHECKERBOARD_CSS = 'repeating-conic-gradient(#C4C4C4 0% 25%, #EDEDED 0% 50%) 0 0 / 8px 8px';

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const SIMULATION_GRADIENT_CSS = `linear-gradient(90deg, ${SIMULATION_COLOR_STOPS.map(
  (stop) => `${rgba(stop.hex, stop.alpha)} ${stop.value * 100}%`,
).join(', ')}), ${LEGEND_CHECKERBOARD_CSS}`;

const NO_SCORE_SIMULATION_RGBA = rgba(NO_SCORE_COLOR, NO_SCORE_SIMULATION_ALPHA);

export const NO_SCORE_SIMULATION_CSS = `linear-gradient(${NO_SCORE_SIMULATION_RGBA}, ${NO_SCORE_SIMULATION_RGBA}), ${LEGEND_CHECKERBOARD_CSS}`;

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

function relativeLuminance(rgb: readonly number[]): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const MIN_TEXT_CONTRAST = 4.5;
const DARKEN_STEP = 0.04;

export function scoreTextColor(score: number): string {
  const base = hexToRgb(scoreColor(score));
  for (let amount = 0; amount < 1; amount += DARKEN_STEP) {
    const mixed = base.map((channel) => channel * (1 - amount));
    if (1.05 / (relativeLuminance(mixed) + 0.05) >= MIN_TEXT_CONTRAST) return rgbToHex(mixed);
  }
  return '#000000';
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
