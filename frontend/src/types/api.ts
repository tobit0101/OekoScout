export type Klasse =
  | 'DACH'
  | 'VERSIEGELT'
  | 'WIESE'
  | 'BAUM'
  | 'GRUENDACH'
  | 'STILLGEWAESSER'
  | 'FLIESSGEWAESSER';

export type Aussagekraft =
  | 'BESTAETIGT'
  | 'NUR_LUFTBILD'
  | 'ANNAHME'
  | 'WIDERSPRUCH';

export type Bodengruppe =
  | 'SEHR_DURCHLAESSIG'
  | 'DURCHLAESSIG'
  | 'WENIG_DURCHLAESSIG'
  | 'UNDURCHLAESSIG';

export type RainKey = '30' | '40' | '50' | '60' | '70' | '80';

export interface CellResponse {
  id: string;
  region: number;
  klasse: Klasse;
  aussagekraft: Aussagekraft;
  bodengruppe: Bodengruppe;
  neigung_prozent: number;
  annahmen: string[];
  score_prozent: Record<RainKey, number | null>;
  abfluss_mm: Record<RainKey, number | null>;
}

export interface RegionProperties {
  id: number;
  flaeche_m2: number;
  bbox_epsg25832: [number, number, number, number];
}

export interface RegionFeature {
  type: 'Feature';
  id: number;
  properties: RegionProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface RegionsResponse {
  type: 'FeatureCollection';
  features: RegionFeature[];
}

export type RainStatKey = '30mm' | '40mm' | '50mm' | '60mm' | '70mm' | '80mm';

export interface ScoreStats {
  min: number;
  mittel: number;
  max: number;
}

export interface StatsResponse {
  zeilen: number;
  mit_score: number;
  score_je_regenmenge: Record<RainStatKey, ScoreStats>;
  je_region: Record<string, number>;
  aussagekraft: Record<string, number>;
}

export interface HealthResponse {
  status: 'ok';
  zellen: number;
}

export interface AreaGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AreaRequest {
  geometry: AreaGeometry;
}

export interface AreaStatsResponse {
  flaeche_m2: number;
  zellen: number;
  zellen_mit_score: number;
  score_mittel: Record<RainKey, number | null>;
  rueckhalt_liter: Record<RainKey, number>;
  abfluss_liter: Record<RainKey, number>;
  aussagekraft: Record<Aussagekraft, number>;
  klassen: Record<Klasse, number>;
}
