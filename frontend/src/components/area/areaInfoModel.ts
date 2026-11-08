import { KLASSE_LABEL, RAIN_STEPS } from '../../labels';
import { scoreLabel } from '../../scale';
import type { AreaStatsResponse, Aussagekraft, Klasse, RainKey } from '../../types/api';
import type { AreaShape, DrawingTool } from '../../types/area';
import { formatArea, formatDecimal, formatInteger, formatLiters } from '../../utils/format';
import { aussagekraftEntries, formatScore, percentOf, type AussagekraftEntry } from './areaFormat';

export interface InfoItem {
  label: string;
  value: string;
}

export interface RainRow {
  rainKey: RainKey;
  score: number | null;
  scoreText: string;
  retainedText: string;
  runoffText: string;
  selected: boolean;
}

export interface KlasseRow {
  key: Klasse;
  label: string;
  countText: string;
  share: string;
  ratio: number;
}

export interface AreaInfoModel {
  title: string;
  subtitle: string;
  rainKey: RainKey;
  score: number | null;
  scoreText: string;
  scoreCaption: string;
  retained: InfoItem;
  kpis: InfoItem[];
  rainRows: RainRow[];
  aussagekraft: AussagekraftEntry[];
  aussagekraftCounts: Record<Aussagekraft, number>;
  klassen: KlasseRow[];
  note: string | null;
  mapsUrl: string;
}

export const INFO_FOOTER_NOTE = 'Bestandsaufnahme · kein Planungswert';

const TITLE = 'Markierte Fläche';
const COORDINATE_DECIMALS = 6;
const SHAPE_LABEL: Record<DrawingTool, string> = { polygon: 'Polygon', circle: 'Kreis', rectangle: 'Rechteck' };

function retainedPerSquareMeter(stats: AreaStatsResponse, rainKey: RainKey): string {
  if (stats.zellen_mit_score === 0) return '—';
  return `${formatDecimal(stats.rueckhalt_liter[rainKey] / stats.zellen_mit_score)} L`;
}

function buildKlassenRows(stats: AreaStatsResponse): KlasseRow[] {
  const entries = (Object.entries(stats.klassen) as [Klasse, number][])
    .filter(([, count]) => count > 0)
    .sort(([, first], [, second]) => second - first);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = entries[0]?.[1] ?? 0;
  return entries.map(([key, count]) => ({
    key,
    label: KLASSE_LABEL[key] ?? key,
    countText: formatInteger(count),
    share: percentOf(count, total),
    ratio: count / max,
  }));
}

function buildRainRows(stats: AreaStatsResponse, rainKey: RainKey): RainRow[] {
  return RAIN_STEPS.map((step) => ({
    rainKey: step,
    score: stats.score_mittel[step],
    scoreText: formatScore(stats.score_mittel[step]),
    retainedText: formatLiters(stats.rueckhalt_liter[step]),
    runoffText: formatLiters(stats.abfluss_liter[step]),
    selected: step === rainKey,
  }));
}

export function describeShape(shape: AreaShape): { title: string; subtitle: string; mapsUrl: string } {
  const lat = shape.center.lat.toFixed(COORDINATE_DECIMALS);
  const lng = shape.center.lng.toFixed(COORDINATE_DECIMALS);
  return {
    title: TITLE,
    subtitle: `${SHAPE_LABEL[shape.kind]} · Mittelpunkt ${lat}, ${lng}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

export function buildAreaInfoModel(shape: AreaShape, stats: AreaStatsResponse, rainKey: RainKey, note: string | null): AreaInfoModel {
  const score = stats.score_mittel[rainKey];
  return {
    ...describeShape(shape),
    rainKey,
    score,
    scoreText: score === null ? '—' : formatDecimal(score),
    scoreCaption: score === null ? 'kein Score' : scoreLabel(score),
    retained: { label: `Rückhalt bei ${rainKey} mm`, value: formatLiters(stats.rueckhalt_liter[rainKey]) },
    kpis: [
      { label: 'Fläche', value: formatArea(stats.flaeche_m2) },
      { label: 'Zellen im Rechengebiet', value: formatInteger(stats.zellen) },
      { label: 'davon mit Score', value: formatInteger(stats.zellen_mit_score) },
      { label: `Abfluss bei ${rainKey} mm`, value: formatLiters(stats.abfluss_liter[rainKey]) },
      { label: 'Rückhalt je m² mit Score', value: retainedPerSquareMeter(stats, rainKey) },
    ],
    rainRows: buildRainRows(stats, rainKey),
    aussagekraft: aussagekraftEntries(stats.aussagekraft),
    aussagekraftCounts: stats.aussagekraft,
    klassen: buildKlassenRows(stats),
    note,
  };
}

export function buildInfoClipboardText(model: AreaInfoModel): string {
  const lines = [
    model.title,
    `Form und Mittelpunkt: ${model.subtitle}`,
    `Niederschlag: ${model.rainKey} mm`,
    `⌀ Schwamm Score:${model.score === null ? model.scoreText : `${model.scoreText} % (${model.scoreCaption})`}`,
    `${model.retained.label}: ${model.retained.value}`,
    ...model.kpis.map((item) => `${item.label}: ${item.value}`),
    'Alle Regenmengen:',
    ...model.rainRows.map((row) => `${row.rainKey} mm: ⌀ ${row.scoreText} · Rückhalt ${row.retainedText} · Abfluss ${row.runoffText}`),
    'Aussagekraft:',
    ...model.aussagekraft.map((entry) => `${entry.label}: ${formatInteger(entry.count)} (${entry.share})`),
    'Flächenklassen:',
    ...model.klassen.map((row) => `${row.label}: ${row.countText} (${row.share})`),
  ];
  if (model.note) lines.push(`Hinweis: ${model.note}`);
  lines.push(INFO_FOOTER_NOTE, `Google Maps: ${model.mapsUrl}`);
  return lines.join('\n');
}
