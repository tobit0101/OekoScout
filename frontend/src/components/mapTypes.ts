import type { AreaSelection } from '../hooks/useAreaSelection';
import type { RainKey } from '../types/api';
import type { MapMode } from '../types/mapMode';

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
  mode: MapMode;
  simulationHour: number;
  focusTarget?: FocusTarget | null;
  area?: AreaSelection;
}
