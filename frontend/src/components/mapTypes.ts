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
  focusTarget?: FocusTarget | null;
}
