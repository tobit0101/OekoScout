import type { AreaSelection } from '../hooks/useAreaSelection';
import type { RainKey } from '../types/api';

export interface FocusTarget {
  lat: number;
  lng: number;
  label: string;
  nonce: number;
}

export interface SpongeMapProps {
  rainKey: RainKey;
  scoreMin: number;
  scoreMax: number;
  heatmapVisible: boolean;
  simulationActive: boolean;
  simulationHour: number;
  focusTarget?: FocusTarget | null;
  area?: AreaSelection;
}
