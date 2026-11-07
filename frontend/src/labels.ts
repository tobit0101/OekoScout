import type { Aussagekraft, Bodengruppe, Klasse } from './types/api';
import { COLORS } from './theme';

export const KLASSE_LABEL: Record<Klasse, string> = {
  DACH: 'Dach',
  VERSIEGELT: 'Versiegelte Fläche',
  WIESE: 'Wiese / Rasen',
  BAUM: 'Baum',
  GRUENDACH: 'Gründach',
  STILLGEWAESSER: 'Stehendes Gewässer',
  FLIESSGEWAESSER: 'Fließgewässer',
};

export const BODENGRUPPE_LABEL: Record<Bodengruppe, string> = {
  SEHR_DURCHLAESSIG: 'Sehr durchlässig (A)',
  DURCHLAESSIG: 'Durchlässig (B)',
  WENIG_DURCHLAESSIG: 'Wenig durchlässig (C)',
  UNDURCHLAESSIG: 'Undurchlässig (D)',
};

export const AUSSAGEKRAFT_DISPLAY: Record<Aussagekraft, { label: string; color: string }> = {
  BESTAETIGT: { label: 'Bestätigt', color: COLORS.statusGreen },
  NUR_LUFTBILD: { label: 'Nur Luftbild', color: COLORS.statusYellow },
  ANNAHME: { label: 'Annahme', color: COLORS.statusBlue },
  WIDERSPRUCH: { label: 'Widerspruch – kein Score', color: COLORS.statusRed },
};

export const ANNAHME_LABEL: Record<string, string> = {
  BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT: 'Baum als Baum-Gras-Mischung, schlechter Zustand',
  GRUENDACH_MIT_ABFLUSSBEIWERT_0_4: 'Gründach mit Abflussbeiwert 0,4',
  WASSER_MIT_VOLLER_AUFNAHME: 'Gewässer nimmt den Regen voll auf',
  VEGETATION_IN_STRASSE_LUFTBILD_GILT: 'Vegetation in Straßenfläche, Luftbild gilt',
};

export const ATTRIBUTION_SCORE =
  'Score: Schwamm Score Pforzheim · Daten: LGL-BW (dl-de/by-2-0), Stadt Pforzheim';

export const RAIN_STEPS = ['30', '40', '50', '60', '70', '80'] as const;
