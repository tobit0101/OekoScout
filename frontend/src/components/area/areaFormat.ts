import { AUSSAGEKRAFT_DISPLAY } from '../../labels';
import { scoreLabel } from '../../scale';
import type { AreaStatsState } from '../../hooks/useAreaSelection';
import type { Aussagekraft, AreaStatsResponse, RainKey } from '../../types/api';
import type { AreaShape } from '../../types/area';
import { formatArea, formatDecimal, formatInteger, formatLiters } from '../../utils/format';

const NO_VALUE = '—';
const LOADING_VALUE = '…';
const COORDINATE_DECIMALS = 5;
const OUTSIDE_TOLERANCE = 0.95;

export const AUSSAGEKRAFT_ORDER: readonly Aussagekraft[] = ['BESTAETIGT', 'NUR_LUFTBILD', 'ANNAHME', 'WIDERSPRUCH'];

export function formatScore(score: number | null): string {
  return score === null ? NO_VALUE : `${formatDecimal(score)} %`;
}

export function labelScoreText(state: AreaStatsState, rainKey: RainKey): string {
  if (state.status === 'loading') return `⌀ ${LOADING_VALUE}`;
  if (state.status !== 'ready') return `⌀ ${NO_VALUE}`;
  return `⌀ ${formatScore(state.stats.score_mittel[rainKey])}`;
}

export function coverageNote(stats: AreaStatsResponse): string | null {
  if (stats.zellen === 0) return 'Keine Zellen im Rechengebiet.';
  if (stats.zellen < stats.flaeche_m2 * OUTSIDE_TOLERANCE) return 'Teile der Fläche liegen außerhalb des Rechengebiets.';
  return null;
}

export function percentOf(count: number, total: number): string {
  return `${formatDecimal((count / total) * 100)} %`;
}

export function buildCopyText(shape: AreaShape, stats: AreaStatsResponse, rainKey: RainKey): string {
  const score = stats.score_mittel[rainKey];
  const lines = [
    'Markierte Fläche',
    `Niederschlag: ${rainKey} mm`,
    `Mittelpunkt: ${shape.center.lat.toFixed(COORDINATE_DECIMALS)}, ${shape.center.lng.toFixed(COORDINATE_DECIMALS)}`,
    `⌀ Schwamm-Score: ${formatScore(score)}${score === null ? '' : ` (${scoreLabel(score)})`}`,
    `Fläche: ${formatArea(stats.flaeche_m2)}`,
    `Zellen im Rechengebiet: ${formatInteger(stats.zellen)}`,
    `davon mit Score: ${formatInteger(stats.zellen_mit_score)}`,
    `Rückhalt bei ${rainKey} mm: ${formatLiters(stats.rueckhalt_liter[rainKey])}`,
    `Abfluss bei ${rainKey} mm: ${formatLiters(stats.abfluss_liter[rainKey])}`,
    ...AUSSAGEKRAFT_ORDER.map((key) => `Aussagekraft ${AUSSAGEKRAFT_DISPLAY[key].label}: ${formatInteger(stats.aussagekraft[key])}`),
  ];
  return lines.join('\n');
}

export interface AussagekraftEntry {
  key: Aussagekraft;
  label: string;
  color: string;
  count: number;
  share: string;
}

export function aussagekraftEntries(counts: Record<Aussagekraft, number>): AussagekraftEntry[] {
  const keys = AUSSAGEKRAFT_ORDER.filter((key) => counts[key] > 0);
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  return keys.map((key) => ({
    key,
    label: AUSSAGEKRAFT_DISPLAY[key].label,
    color: AUSSAGEKRAFT_DISPLAY[key].color,
    count: counts[key],
    share: percentOf(counts[key], total),
  }));
}
