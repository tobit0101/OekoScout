import type { RainKey } from '../types/api';
import { removeOverlay } from './googleHeatmap';
import { HEATMAP_MIN_ZOOM } from './mapConfig';
import { KEYFRAME_HOURS, simulationTileUrl } from './simulationFrames';

const TILE_SIZE = 256;

function createKeyframeMapType(rainKey: RainKey, keyframeHour: number, opacity: number): google.maps.ImageMapType {
  return new google.maps.ImageMapType({
    name: `Simulation ${keyframeHour} h`,
    tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
    opacity,
    getTileUrl: (coord, zoom) => {
      if (zoom < HEATMAP_MIN_ZOOM) return null;
      const tileCount = 2 ** zoom;
      if (coord.y < 0 || coord.y >= tileCount) return null;
      const x = ((coord.x % tileCount) + tileCount) % tileCount;
      return simulationTileUrl(rainKey, keyframeHour, zoom, x, coord.y);
    },
  });
}

export function addSimulationLayers(map: google.maps.Map, rainKey: RainKey, opacities: readonly number[]): google.maps.ImageMapType[] {
  const mapTypes = KEYFRAME_HOURS.map((hour, index) => createKeyframeMapType(rainKey, hour, opacities[index] ?? 0));
  mapTypes.forEach((mapType) => map.overlayMapTypes.push(mapType));
  return mapTypes;
}

export function removeSimulationLayers(map: google.maps.Map, mapTypes: readonly google.maps.ImageMapType[]): void {
  mapTypes.forEach((mapType) => removeOverlay(map, mapType));
}

export function setSimulationOpacities(mapTypes: readonly google.maps.ImageMapType[], opacities: readonly number[]): void {
  mapTypes.forEach((mapType, index) => mapType.setOpacity(opacities[index] ?? 0));
}
