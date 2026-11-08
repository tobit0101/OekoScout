import type { RainKey } from '../types/api';
import { SIMULATION_KEYFRAME_COUNT, SIMULATION_KEYFRAME_STEP_HOURS, TILE_VERSION } from './mapConfig';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const KEYFRAME_HOURS: readonly number[] = Array.from(
  { length: SIMULATION_KEYFRAME_COUNT },
  (_, index) => index * SIMULATION_KEYFRAME_STEP_HOURS,
);

const LAST_KEYFRAME_INDEX = SIMULATION_KEYFRAME_COUNT - 1;

export function simulationTileUrl(rainKey: RainKey, keyframeHour: number, zoom: number | string, x: number | string, y: number | string): string {
  return `/api/v1/simulation/tiles/${rainKey}/${keyframeHour}/${zoom}/${x}/${y}.png?v=${TILE_VERSION}`;
}

export function simulationTileTemplate(rainKey: RainKey, keyframeHour: number): string {
  return simulationTileUrl(rainKey, keyframeHour, '{z}', '{x}', '{y}');
}

export function frameOpacities(hour: number, baseOpacity: number, reducedMotion: boolean): number[] {
  const opacities = new Array<number>(SIMULATION_KEYFRAME_COUNT).fill(0);
  const position = Math.min(Math.max(hour / SIMULATION_KEYFRAME_STEP_HOURS, 0), LAST_KEYFRAME_INDEX);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, LAST_KEYFRAME_INDEX);
  const blend = reducedMotion || upper === lower ? 0 : position - lower;
  // Lower opacity compensates the upper layer so the composite keeps baseOpacity at every blend.
  opacities[lower] = (baseOpacity * (1 - blend)) / (1 - baseOpacity * blend);
  if (upper !== lower) opacities[upper] = baseOpacity * blend;
  return opacities;
}
