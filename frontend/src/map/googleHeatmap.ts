import type { RainKey } from '../types/api';
import { HEATMAP_MIN_ZOOM, HEATMAP_OPACITY, TILE_VERSION } from './mapConfig';

const TILE_SIZE = 256;

export function createHeatmapMapType(rainKey: RainKey, scoreMin: number, scoreMax: number): google.maps.ImageMapType {
  return new google.maps.ImageMapType({
    name: 'Schwamm Score',
    tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
    opacity: HEATMAP_OPACITY,
    getTileUrl: (coord, zoom) => {
      if (zoom < HEATMAP_MIN_ZOOM) return null;
      const tileCount = 2 ** zoom;
      if (coord.y < 0 || coord.y >= tileCount) return null;
      const x = ((coord.x % tileCount) + tileCount) % tileCount;
      return `/api/v1/tiles/${rainKey}/${zoom}/${x}/${coord.y}.png?score_min=${scoreMin}&score_max=${scoreMax}&v=${TILE_VERSION}`;
    },
  });
}

const appliedHeatmaps = new WeakMap<google.maps.Map, google.maps.ImageMapType>();

export function removeOverlay(map: google.maps.Map, mapType: google.maps.MapType): void {
  const index = map.overlayMapTypes.getArray().indexOf(mapType);
  if (index >= 0) map.overlayMapTypes.removeAt(index);
}

export function applyHeatmap(map: google.maps.Map, mapType: google.maps.ImageMapType | null): void {
  const previous = appliedHeatmaps.get(map);
  if (previous) removeOverlay(map, previous);
  appliedHeatmaps.delete(map);
  if (!mapType) return;
  map.overlayMapTypes.push(mapType);
  appliedHeatmaps.set(map, mapType);
}
