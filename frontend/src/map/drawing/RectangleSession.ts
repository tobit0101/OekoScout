import type { LatLngPoint } from '../../types/area';
import { boundsRing, cornersToBounds, pathArea } from '../areaGeometry';
import { DrawSession, type DrawSessionHost } from './DrawSession';
import { createDashedLine, createPreviewFill, createVertexMarker } from './previewOverlays';

const MIN_AREA_M2 = 1;

export class RectangleSession extends DrawSession {
  private readonly fill: google.maps.Polygon;
  private readonly outline: google.maps.Polyline;
  private corner: LatLngPoint | null = null;
  private marker: google.maps.Marker | null = null;

  constructor(host: DrawSessionHost) {
    super(host);
    this.fill = this.track(createPreviewFill(host.map));
    this.outline = this.track(createDashedLine(host.map));
    this.listen('click', (event) => this.handleClick(event));
    this.listen('mousemove', (event) => this.handleMove(event));
    this.report(null);
  }

  undoLast(): void {
    if (!this.corner) return;
    this.corner = null;
    this.marker?.setMap(null);
    this.marker = null;
    this.fill.setPath([]);
    this.outline.setPath([]);
    this.report(null);
  }

  private handleClick(event: google.maps.MapMouseEvent): void {
    const point = event.latLng?.toJSON();
    if (!point) return;
    if (!this.corner) {
      this.corner = point;
      this.marker = this.track(createVertexMarker(this.host.map, point, true));
      this.report(0);
      return;
    }
    const bounds = cornersToBounds(this.corner, point);
    if (pathArea(boundsRing(bounds)) < MIN_AREA_M2) return;
    this.host.finish({ kind: 'rectangle', bounds });
  }

  private handleMove(event: google.maps.MapMouseEvent): void {
    const point = event.latLng?.toJSON();
    if (!this.corner || !point) return;
    const ring = boundsRing(cornersToBounds(this.corner, point));
    this.fill.setPath(ring);
    this.outline.setPath([...ring, ring[0]]);
    this.report(pathArea(ring));
  }

  private report(areaM2: number | null): void {
    this.host.reportDraft({ tool: 'rectangle', vertexCount: this.corner ? 1 : 0, areaM2 });
  }
}
