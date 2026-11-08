import L from 'leaflet';
import { ATTRIBUTION_SCORE } from '../labels';
import { HEATMAP_MIN_ZOOM } from './mapConfig';
import { SIMULATION_TILE_SIZE, type SimulationTileController } from './simulationCanvas';

class SimulationGridLayer extends L.GridLayer {
  private readonly controller: SimulationTileController;

  constructor(controller: SimulationTileController, options: L.GridLayerOptions) {
    super(options);
    this.controller = controller;
  }

  protected createTile(coords: L.Coords): HTMLElement {
    return this.controller.createTile(coords.x, coords.y, coords.z);
  }
}

export function createSimulationLayer(controller: SimulationTileController, maxZoom: number): L.GridLayer {
  const layer = new SimulationGridLayer(controller, {
    tileSize: SIMULATION_TILE_SIZE,
    minZoom: HEATMAP_MIN_ZOOM,
    maxZoom,
    attribution: ATTRIBUTION_SCORE,
  });
  layer.on('tileunload', (event: L.TileEvent) => {
    if (event.tile instanceof HTMLCanvasElement) controller.releaseTile(event.tile);
  });
  return layer;
}
