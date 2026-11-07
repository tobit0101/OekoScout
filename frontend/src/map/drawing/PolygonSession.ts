import type { LatLngPoint } from '../../types/area';
import { pathArea, pixelDistance } from '../areaGeometry';
import { DrawSession, type DrawSessionHost } from './DrawSession';
import { createDashedLine, createPreviewFill, createVertexMarker } from './previewOverlays';

const MIN_VERTICES = 3;
const CLOSE_DISTANCE_PX = 12;
const DUPLICATE_CLICK_MS = 400;
const DUPLICATE_DISTANCE_PX = 6;

export class PolygonSession extends DrawSession {
  private readonly vertices: LatLngPoint[] = [];
  private readonly markers: google.maps.Marker[] = [];
  private readonly fill: google.maps.Polygon;
  private readonly outline: google.maps.Polyline;
  private cursor: LatLngPoint | null = null;
  private lastClickAt = 0;

  constructor(host: DrawSessionHost) {
    super(host);
    this.fill = this.track(createPreviewFill(host.map));
    this.outline = this.track(createDashedLine(host.map));
    this.listen('click', (event) => this.handleClick(event));
    this.listen('mousemove', (event) => this.handleMove(event));
    this.listen('dblclick', () => this.close());
    this.refresh();
  }

  undoLast(): void {
    if (this.vertices.length === 0) return;
    this.vertices.pop();
    this.markers.pop()?.setMap(null);
    this.refresh();
  }

  private handleClick(event: google.maps.MapMouseEvent): void {
    const point = event.latLng?.toJSON();
    if (!point) return;
    const now = Date.now();
    const isRepeat = this.isRepeatedClick(point, now);
    this.lastClickAt = now;
    if (isRepeat) return;
    if (this.isClosingClick(point)) {
      this.close();
      return;
    }
    this.vertices.push(point);
    this.markers.push(this.track(createVertexMarker(this.host.map, point, this.vertices.length === 1)));
    this.refresh();
  }

  private handleMove(event: google.maps.MapMouseEvent): void {
    this.cursor = event.latLng?.toJSON() ?? null;
    this.refresh();
  }

  private isRepeatedClick(point: LatLngPoint, now: number): boolean {
    const last = this.vertices[this.vertices.length - 1];
    if (!last || now - this.lastClickAt > DUPLICATE_CLICK_MS) return false;
    return pixelDistance(this.host.map, last, point) < DUPLICATE_DISTANCE_PX;
  }

  private isClosingClick(point: LatLngPoint): boolean {
    if (this.vertices.length < MIN_VERTICES) return false;
    return pixelDistance(this.host.map, this.vertices[0], point) <= CLOSE_DISTANCE_PX;
  }

  private close(): void {
    if (this.vertices.length < MIN_VERTICES) return;
    this.host.finish({ kind: 'polygon', path: [...this.vertices] });
  }

  private refresh(): void {
    const path = this.cursor ? [...this.vertices, this.cursor] : [...this.vertices];
    this.fill.setPath(path);
    this.outline.setPath(path);
    this.host.reportDraft({
      tool: 'polygon',
      vertexCount: this.vertices.length,
      areaM2: path.length >= MIN_VERTICES ? pathArea(path) : null,
    });
  }
}
