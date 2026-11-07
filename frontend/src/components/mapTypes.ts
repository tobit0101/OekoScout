import type { RainKey } from '../types/api';

export interface SpongeMapProps {
  rainKey: RainKey;
  scoreMin: number;
  scoreMax: number;
  heatmapVisible: boolean;
}
