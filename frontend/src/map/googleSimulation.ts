import { removeOverlay } from './googleHeatmap';
import { HEATMAP_MIN_ZOOM } from './mapConfig';
import { SIMULATION_TILE_SIZE, type SimulationTileController } from './simulationCanvas';

const GOOGLE_EARTH_RADIUS_M = 6_378_137;
const GOOGLE_MAX_ZOOM = 21;

function createSimulationMapType(controller: SimulationTileController): google.maps.MapType {
  return {
    name: 'Simulation',
    alt: null,
    projection: null,
    radius: GOOGLE_EARTH_RADIUS_M,
    minZoom: HEATMAP_MIN_ZOOM,
    maxZoom: GOOGLE_MAX_ZOOM,
    tileSize: new google.maps.Size(SIMULATION_TILE_SIZE, SIMULATION_TILE_SIZE),
    getTile: (coord, zoom) => {
      if (!coord) return null;
      return controller.createTile(coord.x, coord.y, zoom);
    },
    releaseTile: (tile) => {
      if (tile instanceof HTMLCanvasElement) controller.releaseTile(tile);
    },
  };
}

export function addSimulationLayer(map: google.maps.Map, controller: SimulationTileController): google.maps.MapType {
  const mapType = createSimulationMapType(controller);
  map.overlayMapTypes.push(mapType);
  return mapType;
}

export function removeSimulationLayer(map: google.maps.Map, mapType: google.maps.MapType): void {
  removeOverlay(map, mapType);
}
