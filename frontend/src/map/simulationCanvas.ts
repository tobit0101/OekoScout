import type { RainKey } from '../types/api';
import { HEATMAP_MIN_ZOOM, SIMULATION_KEYFRAME_COUNT } from './mapConfig';
import { KEYFRAME_HOURS, keyframeBlend, simulationTileUrl } from './simulationFrames';

export const SIMULATION_TILE_SIZE = 256;

interface SimulationState {
  hour: number;
  reducedMotion: boolean;
}

/**
 * Canvas compositing is premultiplied, so drawing the lower frame at (1 - blend) and adding the
 * upper frame at blend with 'lighter' yields the exact per-pixel interpolation on the GPU.
 */
function drawBlend(context: CanvasRenderingContext2D, lower: HTMLImageElement, upper: HTMLImageElement, blend: number): void {
  context.globalCompositeOperation = 'copy';
  context.globalAlpha = 1 - blend;
  context.drawImage(lower, 0, 0);
  if (blend > 0 && lower !== upper) {
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = blend;
    context.drawImage(upper, 0, 0);
  }
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
}

class SimulationTile {
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly frames: (HTMLImageElement | null)[] = new Array<HTMLImageElement | null>(SIMULATION_KEYFRAME_COUNT).fill(null);
  private readonly images: (HTMLImageElement | null)[] = new Array<HTMLImageElement | null>(SIMULATION_KEYFRAME_COUNT).fill(null);
  private pendingFrame = 0;
  private disposed = false;

  constructor(
    rainKey: RainKey,
    zoom: number,
    x: number,
    y: number,
    private readonly readState: () => SimulationState,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIMULATION_TILE_SIZE;
    this.canvas.height = SIMULATION_TILE_SIZE;
    this.context = this.canvas.getContext('2d');
    KEYFRAME_HOURS.forEach((keyframeHour, index) => this.loadFrame(index, simulationTileUrl(rainKey, keyframeHour, zoom, x, y)));
  }

  draw(): void {
    if (this.disposed || !this.context) return;
    const { hour, reducedMotion } = this.readState();
    const { lower, upper, blend } = keyframeBlend(hour, reducedMotion);
    const lowerFrame = this.resolveFrame(lower);
    const upperFrame = this.resolveFrame(upper);
    if (!lowerFrame || !upperFrame) return;
    drawBlend(this.context, lowerFrame, upperFrame, blend);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.pendingFrame);
    this.images.forEach((image) => {
      if (!image) return;
      image.onload = null;
      image.onerror = null;
    });
    this.images.fill(null);
    this.frames.fill(null);
  }

  private loadFrame(index: number, url: string): void {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => this.handleFrameLoaded(index, image);
    image.onerror = () => {
      this.images[index] = null;
    };
    this.images[index] = image;
    image.src = url;
  }

  private handleFrameLoaded(index: number, image: HTMLImageElement): void {
    this.images[index] = null;
    if (this.disposed) return;
    this.frames[index] = image;
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = requestAnimationFrame(() => this.draw());
  }

  private resolveFrame(index: number): HTMLImageElement | null {
    for (let distance = 0; distance < SIMULATION_KEYFRAME_COUNT; distance += 1) {
      const below = this.frames[index - distance];
      if (below) return below;
      const above = this.frames[index + distance];
      if (above) return above;
    }
    return null;
  }
}

export class SimulationTileController {
  private readonly tiles = new Map<HTMLCanvasElement, SimulationTile>();
  private readonly state: SimulationState;

  constructor(
    private readonly rainKey: RainKey,
    hour: number,
    reducedMotion: boolean,
  ) {
    this.state = { hour, reducedMotion };
  }

  createTile(x: number, y: number, zoom: number): HTMLCanvasElement {
    const tileCount = 2 ** zoom;
    if (zoom < HEATMAP_MIN_ZOOM || y < 0 || y >= tileCount) return this.createEmptyCanvas();
    const wrappedX = ((x % tileCount) + tileCount) % tileCount;
    const tile = new SimulationTile(this.rainKey, zoom, wrappedX, y, () => this.state);
    this.tiles.set(tile.canvas, tile);
    return tile.canvas;
  }

  releaseTile(canvas: HTMLCanvasElement): void {
    const tile = this.tiles.get(canvas);
    if (!tile) return;
    tile.dispose();
    this.tiles.delete(canvas);
  }

  setHour(hour: number): void {
    this.state.hour = hour;
    this.redrawAll();
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (this.state.reducedMotion === reducedMotion) return;
    this.state.reducedMotion = reducedMotion;
    this.redrawAll();
  }

  dispose(): void {
    this.tiles.forEach((tile) => tile.dispose());
    this.tiles.clear();
  }

  private redrawAll(): void {
    this.tiles.forEach((tile) => tile.draw());
  }

  private createEmptyCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = SIMULATION_TILE_SIZE;
    canvas.height = SIMULATION_TILE_SIZE;
    return canvas;
  }
}
