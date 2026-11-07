import { COLORS } from '../../theme';
import type { LatLngPoint } from '../../types/area';
import { circleArea, distanceMeters } from '../areaGeometry';
import { DrawSession, type DrawSessionHost } from './DrawSession';
import { createDashedLine, createVertexMarker } from './previewOverlays';

const MIN_RADIUS_M = 1;

export class CircleSession extends DrawSession {
  private readonly circle: google.maps.Circle;
  private readonly radiusLine: google.maps.Polyline;
  private center: LatLngPoint | null = null;
  private marker: google.maps.Marker | null = null;

  constructor(host: DrawSessionHost) {
    super(host);
    this.circle = this.track(
      new google.maps.Circle({
        map: host.map,
        clickable: false,
        visible: false,
        radius: MIN_RADIUS_M,
        strokeColor: COLORS.navy,
        strokeWeight: 2,
        fillColor: COLORS.primary,
        fillOpacity: 0.18,
      }),
    );
    this.radiusLine = this.track(createDashedLine(host.map));
    this.listen('click', (event) => this.handleClick(event));
    this.listen('mousemove', (event) => this.handleMove(event));
    this.report(null);
  }

  undoLast(): void {
    if (!this.center) return;
    this.center = null;
    this.marker?.setMap(null);
    this.marker = null;
    this.circle.setVisible(false);
    this.radiusLine.setPath([]);
    this.report(null);
  }

  private handleClick(event: google.maps.MapMouseEvent): void {
    const point = event.latLng?.toJSON();
    if (!point) return;
    if (!this.center) {
      this.center = point;
      this.circle.setCenter(point);
      this.marker = this.track(createVertexMarker(this.host.map, point, true));
      this.report(0);
      return;
    }
    const radius = distanceMeters(this.center, point);
    if (radius < MIN_RADIUS_M) return;
    this.host.finish({ kind: 'circle', center: this.center, radius });
  }

  private handleMove(event: google.maps.MapMouseEvent): void {
    const point = event.latLng?.toJSON();
    if (!this.center || !point) return;
    const radius = Math.max(distanceMeters(this.center, point), MIN_RADIUS_M);
    this.circle.setRadius(radius);
    this.circle.setVisible(true);
    this.radiusLine.setPath([this.center, point]);
    this.report(circleArea(radius));
  }

  private report(areaM2: number | null): void {
    this.host.reportDraft({ tool: 'circle', vertexCount: this.center ? 1 : 0, areaM2 });
  }
}
