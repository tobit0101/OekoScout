export type MeasureType =
  | 'Entsiegelung'
  | 'Gruendach'
  | 'Mulde_Rigole'
  | 'Baumstandort'
  | 'Retentionsflaeche';

export type ScenarioType = 'selten' | 'aussergewoehnlich' | 'extrem';

export type SurfaceType =
  | 'Dach'
  | 'Parkplatz'
  | 'Strasse'
  | 'Gruenflaeche'
  | 'Oeffentlicher_Raum'
  | 'Privates_Grundstueck'
  | 'Schulhof';

export type PriorityType =
  | 'Wasseraufnahme'
  | 'Hitzeminderung'
  | 'Bevoelkerungsschutz'
  | 'Schnelle_Umsetzbarkeit';

export type SuitabilityCategory =
  | 'sehr_geeignet'
  | 'geeignet'
  | 'eingeschraenkt_geeignet'
  | 'ungeeignet';

export type HydrologicalSoilGroup = 'A' | 'B' | 'C' | 'D';

export interface QuartierBGGStats {
  id: QuartierId;
  name: string;
  center: [number, number];
  zoom: number;
  totalAreaHa: number;
  bluePct: number;
  greenPct: number;
  greyPct: number;
  dominantSoilGroup: HydrologicalSoilGroup;
  baselineSponginessPct: number;
  description: string;
}

export interface FloodHotspot {
  id: string;
  name: string;
  quartier: Exclude<QuartierId, 'alle'>;
  type: 'hotspot' | 'flowpath';
  description: string;
  maxDepthCm: {
    selten: number;
    aussergewoehnlich: number;
    extrem: number;
  };
  flowVelocityMs: number;
  coordinates: [number, number][];
}

export type QuartierId =
  | 'alle'
  | 'innenstadt'
  | 'nordstadt'
  | 'weststadt'
  | 'oststadt'
  | 'suedweststadt';

export type CatchmentId =
  | 'hs-bahnhof'
  | 'hs-klinikum'
  | 'hs-innenstadt'
  | 'hs-suedwest'
  | 'hs-broetzingen';

export type CascadePosition = 'Oberlauf (Hang)' | 'Mittellauf (Zulauf)' | 'Unterlauf (Senke)';

export interface DataSourceQuality {
  source: string;
  resolution: string;
  confidence: 'hoch' | 'mittel' | 'niedrig';
  note?: string;
}

export interface FloodCatchment {
  id: CatchmentId;
  name: string;
  shortName: string;
  damageLocationLabel: string;
  problemSummary: string;
  elevationRangeM: [number, number]; // [topM, bottomM]
  catchmentAreaHa: number;
  center: [number, number];
  zoom: number;
  // Critical excess runoff volume (m³) that causes flooding at the bottleneck
  excessRunoffM3: {
    selten: number;
    aussergewoehnlich: number;
    extrem: number;
  };
  maxFloodDepthCm: {
    selten: number;
    aussergewoehnlich: number;
    extrem: number;
  };
  // Damage hotspot polygon at the bottom of the catchment
  hotspotPolygon: [number, number][];
  hotspotCenter: [number, number];
  // Upslope catchment boundary polygon (hillslope -> valley)
  catchmentBoundary: [number, number][];
  // Main flow path polyline from upslope source to the damage hotspot
  flowPathCoordinates: [number, number][];
}

export interface SpongeSite {
  id: string;
  name: string;
  catchmentId?: CatchmentId;
  cascadePosition?: CascadePosition;
  elevationM?: number;
  distanceToHotspotM?: number;
  quartier: Exclude<QuartierId, 'alle'>;
  quartierLabel: string;
  address: string;
  flurstueck: string;
  alkisNutzung: string;
  isPublic: boolean;
  surfaceType: SurfaceType;
  areaSqm: number;
  coordinates: [number, number][];
  center: [number, number];

  imperviousness: number;
  soilGroup: HydrologicalSoilGroup;
  soilTypeDescription: string;
  infiltrationRateMmH: number;
  groundwaterDepthM: number;
  slopePercent: number;

  waterInflowBase: {
    selten: number;
    aussergewoehnlich: number;
    extrem: number;
  };
  maxFloodDepthCm: {
    selten: number;
    aussergewoehnlich: number;
    extrem: number;
  };
  inFlowPath: boolean;
  absorptionPotential: number;
  availability: number;
  restriction: number;
  restrictionReasons: string[];
  vulnerability: number;
  alreadyDecoupled: number;

  affectedResidentsRadius250m: number;
  heatIslandDeltaC: number;
  sensitiveFacilitiesNearby: string[];

  primaryMeasure: MeasureType;
  recommendedMeasures: MeasureType[];
  measureReasoning: string;

  curveNumberCurrent: number;
  curveNumberTarget: number;
  retentionDepthMm: number;

  gruenMalDreiEligible: boolean;
  gruenMalDreiSubsidyMaxEur: number;
  estimatedCostEur: number;
  implementationMonths: number;

  dataQualityScore: number;
  uncertaintyNotes: string[];
  dataSources: DataSourceQuality[];
}

export interface ComputedSiteScore {
  site: SpongeSite;
  rawProduct: number;
  score: number;
  category: SuitabilityCategory;
  components: {
    wasseranfall: number;
    aufnahmepotenzial: number;
    verfuegbarkeit: number;
    restriktionFactor: number;
    betroffenheitFactor: number;
    abgekoppeltFactor: number;
  };
  rainfallMm: number;
  runoffCurrentM3: number;
  runoffAfterM3: number;
  retentionVolumeM3: number;
  sponginessCurrentPct: number;
  sponginessAfterPct: number;
  costPerM3Eur?: number; // EUR per m³ retained
}
