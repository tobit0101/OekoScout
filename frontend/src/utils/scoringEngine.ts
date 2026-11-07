import {
  SpongeSite,
  ComputedSiteScore,
  ScenarioType,
  PriorityType,
  SuitabilityCategory,
  MeasureType,
  SurfaceType,
} from '../types/sponge';

export const SCENARIO_RAINFALL_MM: Record<
  ScenarioType,
  { mm: number; label: string; short: string; sri: string }
> = {
  selten: {
    mm: 38,
    label: 'Selten (38 mm/h)',
    short: 'Selten',
    sri: 'SRI 4',
  },
  aussergewoehnlich: {
    mm: 50,
    label: 'Außergewöhnlich (50 mm)',
    short: 'Außergew.',
    sri: 'SRI 7 / Arup 50mm',
  },
  extrem: {
    mm: 85,
    label: 'Extrem (85 mm/h)',
    short: 'Extrem',
    sri: 'SRI 10',
  },
};

export const MEASURE_LABELS: Record<
  MeasureType,
  { label: string; short: string; description: string }
> = {
  Entsiegelung: {
    label: 'Entsiegelung & Sickerpflaster',
    short: 'Entsiegelung',
    description: 'Rückbau wasserundurchlässiger Beläge zugunsten versickerungsfähiger Oberflächen.',
  },
  Gruendach: {
    label: 'Retentions-Gründach',
    short: 'Gründach',
    description: 'Substrataufbau mit Wasserspeicherboxen zur Rückhaltung und Verdunstung auf Dachflächen.',
  },
  Mulde_Rigole: {
    label: 'Mulden-Rigolen-System',
    short: 'Mulde / Rigole',
    description: 'Oberirdische Versickerungsmulde kombiniert mit unterirdischem Speicherkörper.',
  },
  Baumstandort: {
    label: 'Schwammstadt-Baumrigole',
    short: 'Baumstandort',
    description: 'Überbautes Wurzelkammersystem (Stockholm-Prinzip) zur Zuleitung von Straßenabflüssen.',
  },
  Retentionsflaeche: {
    label: 'Multifunktionale Retentionsfläche',
    short: 'Retentionsfläche',
    description: 'Überflutbare Geländesenke in Grün- oder Freiflächen zur schadlosen Zwischenspeicherung.',
  },
};

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  Dach: 'Dachfläche',
  Parkplatz: 'Parkplatz',
  Strasse: 'Straßenraum',
  Gruenflaeche: 'Grünfläche',
  Oeffentlicher_Raum: 'Öffentlicher Platz',
  Privates_Grundstueck: 'Innenhof / Privatfläche',
  Schulhof: 'Schulhof',
};

export const CATEGORY_META: Record<
  SuitabilityCategory,
  {
    label: string;
    fillColor: string;
    strokeColor: string;
    dotColor: string;
    pillStyle: string;
    description: string;
  }
> = {
  sehr_geeignet: {
    label: 'Sehr geeignet',
    fillColor: '#15803d', // Deep forest green
    strokeColor: '#14532d',
    dotColor: 'bg-green-700',
    pillStyle: 'bg-green-50 text-green-800 border-green-200',
    description: 'Hohes Potenzial (Score ≥ 75): Hoher Wasseranfall trifft auf gute Aufnahmefähigkeit ohne harte Restriktionen.',
  },
  geeignet: {
    label: 'Geeignet',
    fillColor: '#65a30d', // Natural olive/lime green
    strokeColor: '#3f6212',
    dotColor: 'bg-lime-600',
    pillStyle: 'bg-lime-50 text-lime-800 border-lime-200',
    description: 'Gutes Potenzial (Score 55–74): Wirksame Entlastung bei moderaten Standortauflagen.',
  },
  eingeschraenkt_geeignet: {
    label: 'Eingeschränkt geeignet',
    fillColor: '#d97706', // Warm amber/ochre
    strokeColor: '#92400e',
    dotColor: 'bg-amber-600',
    pillStyle: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Eingeschränkt (Score 35–54): Technische Sonderlösung nötig (z. B. Steilhang, HQ100 oder geringer Grundwasserabstand).',
  },
  ungeeignet: {
    label: 'Ungeeignet',
    fillColor: '#78716c', // Warm stone grey
    strokeColor: '#44403c',
    dotColor: 'bg-stone-500',
    pillStyle: 'bg-stone-100 text-stone-700 border-stone-300',
    description: 'Ungeeignet (Score < 35): Ausschlusskriterium (z. B. Altlastenverdacht) oder Fläche bereits abgekoppelt.',
  },
};

/**
 * USDA-SCS Curve Number (CN) Runoff Calculation (Arup Global Sponge Cities Snapshot)
 */
export function calculateSCSRunoffMm(rainfallMm: number, cn: number): number {
  const clampedCn = Math.max(30, Math.min(99.5, cn));
  const S = 25400 / clampedCn - 254;
  const Ia = 0.2 * S;
  if (rainfallMm <= Ia) return 0;
  const Q = Math.pow(rainfallMm - Ia, 2) / (rainfallMm + 0.8 * S);
  return Math.min(rainfallMm, Math.max(0, Q));
}

/**
 * Computes the Schwammstadt-Score (0..100) and Category for a site.
 *
 * Mehrwert = Wasseranfall
 *          x Aufnahmepotenzial
 *          x Verfuegbarkeit
 *          x (1 - Restriktion)
 *          x (1 + Betroffenheit)
 *          x (1 - bereits abgekoppelt)
 */
export function computeSiteScore(
  site: SpongeSite,
  scenario: ScenarioType,
  priorities: PriorityType[] = []
): ComputedSiteScore {
  const rainfallMm = SCENARIO_RAINFALL_MM[scenario].mm;

  const baseInflow = site.waterInflowBase[scenario];
  const flowBonus = site.inFlowPath ? 0.04 : 0;
  const wasseranfall = Math.min(1, baseInflow + flowBonus);

  let aufnahmepotenzial = site.absorptionPotential;
  if (priorities.includes('Wasseraufnahme')) {
    aufnahmepotenzial = Math.min(1, aufnahmepotenzial + 0.04);
  }

  let verfuegbarkeit = site.availability;
  if (priorities.includes('Schnelle_Umsetzbarkeit') && site.isPublic) {
    verfuegbarkeit = Math.min(1, verfuegbarkeit + 0.05);
  }

  const restriktionFactor = Math.max(0.05, 1 - site.restriction);

  let effectiveBetroffenheit = site.vulnerability;
  if (priorities.includes('Hitzeminderung')) {
    const heatNorm = Math.min(1, site.heatIslandDeltaC / 5.0);
    effectiveBetroffenheit = effectiveBetroffenheit * 0.65 + heatNorm * 0.35;
  }
  const betroffenheitFactor = 1 + effectiveBetroffenheit;
  const abgekoppeltFactor = Math.max(0.05, 1 - site.alreadyDecoupled);

  const rawProduct =
    wasseranfall *
    aufnahmepotenzial *
    verfuegbarkeit *
    restriktionFactor *
    betroffenheitFactor *
    abgekoppeltFactor;

  const normalizedScore = Math.round(Math.min(99, Math.max(8, (rawProduct / 1.48) * 95)));

  let category: SuitabilityCategory;
  if (site.restriction >= 0.7 || site.alreadyDecoupled >= 0.7 || normalizedScore < 35) {
    category = 'ungeeignet';
  } else if (normalizedScore < 55 || site.restriction >= 0.35) {
    category = 'eingeschraenkt_geeignet';
  } else if (normalizedScore < 75) {
    category = 'geeignet';
  } else {
    category = 'sehr_geeignet';
  }

  const runoffCurrentMm = calculateSCSRunoffMm(rainfallMm, site.curveNumberCurrent);
  const runoffAfterMm = calculateSCSRunoffMm(rainfallMm, site.curveNumberTarget);

  const sponginessCurrentPct = Math.round((1 - runoffCurrentMm / rainfallMm) * 100);
  const sponginessAfterPct = Math.round((1 - runoffAfterMm / rainfallMm) * 100);

  const runoffCurrentM3 = Math.round((runoffCurrentMm / 1000) * site.areaSqm);
  const runoffAfterM3 = Math.round((runoffAfterMm / 1000) * site.areaSqm);

  const cnRetentionGainM3 = Math.max(0, runoffCurrentM3 - runoffAfterM3);
  const technicalStorageM3 = Math.round((site.retentionDepthMm / 1000) * site.areaSqm * 0.55);
  const retentionVolumeM3 = Math.max(cnRetentionGainM3, technicalStorageM3);

  return {
    site,
    rawProduct,
    score: normalizedScore,
    category,
    components: {
      wasseranfall: Math.round(wasseranfall * 100),
      aufnahmepotenzial: Math.round(aufnahmepotenzial * 100),
      verfuegbarkeit: Math.round(verfuegbarkeit * 100),
      restriktionFactor: Math.round(restriktionFactor * 100),
      betroffenheitFactor: Math.round(betroffenheitFactor * 100),
      abgekoppeltFactor: Math.round(abgekoppeltFactor * 100),
    },
    rainfallMm,
    runoffCurrentM3,
    runoffAfterM3,
    retentionVolumeM3,
    sponginessCurrentPct,
    sponginessAfterPct,
  };
}
