import type { RainKey } from '../types/api';
import { SIMULATION_KEYFRAME_COUNT, SIMULATION_KEYFRAME_STEP_HOURS, TILE_VERSION } from './mapConfig';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const KEYFRAME_HOURS: readonly number[] = Array.from(
  { length: SIMULATION_KEYFRAME_COUNT },
  (_, index) => index * SIMULATION_KEYFRAME_STEP_HOURS,
);

const LAST_KEYFRAME_INDEX = SIMULATION_KEYFRAME_COUNT - 1;

export interface KeyframeBlend {
  lower: number;
  upper: number;
  blend: number;
}

export function simulationTileUrl(rainKey: RainKey, keyframeHour: number, zoom: number | string, x: number | string, y: number | string): string {
  return `/api/v1/simulation/tiles/${rainKey}/${keyframeHour}/${zoom}/${x}/${y}.png?v=${TILE_VERSION}`;
}

export function keyframeBlend(hour: number, reducedMotion: boolean): KeyframeBlend {
  const position = Math.min(Math.max(hour / SIMULATION_KEYFRAME_STEP_HOURS, 0), LAST_KEYFRAME_INDEX);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, LAST_KEYFRAME_INDEX);
  const blend = reducedMotion || upper === lower ? 0 : position - lower;
  return { lower, upper, blend };
}
