import type { AreaShape, LatLngPoint } from '../types/area';

const CIRCLE_VERTICES = 64;
const FULL_TURN_DEGREES = 360;

export function pathArea(path: readonly LatLngPoint[]): number {
  if (path.length < 3) return 0;
  return google.maps.geometry.spherical.computeArea([...path]);
}

export function circleArea(radiusMeters: number): number {
  return Math.PI * radiusMeters * radiusMeters;
}

export function distanceMeters(from: LatLngPoint, to: LatLngPoint): number {
  return google.maps.geometry.spherical.computeDistanceBetween(from, to);
}

export function circleRing(center: LatLngPoint, radiusMeters: number): LatLngPoint[] {
  return Array.from({ length: CIRCLE_VERTICES }, (_, index) =>
    google.maps.geometry.spherical.computeOffset(center, radiusMeters, (FULL_TURN_DEGREES * index) / CIRCLE_VERTICES).toJSON(),
  );
}

export function cornersToBounds(first: LatLngPoint, second: LatLngPoint): google.maps.LatLngBoundsLiteral {
  return {
    north: Math.max(first.lat, second.lat),
    south: Math.min(first.lat, second.lat),
    east: Math.max(first.lng, second.lng),
    west: Math.min(first.lng, second.lng),
  };
}

export function boundsRing(bounds: google.maps.LatLngBoundsLiteral): LatLngPoint[] {
  return [
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
    { lat: bounds.south, lng: bounds.east },
  ];
}

export function pathCenter(path: readonly LatLngPoint[]): LatLngPoint {
  const bounds = new google.maps.LatLngBounds();
  path.forEach((point) => bounds.extend(point));
  return bounds.getCenter().toJSON();
}

export function buildShape(ring: readonly LatLngPoint[], areaM2: number, center: LatLngPoint): AreaShape {
  const closed = [...ring, ring[0]];
  return {
    geometry: { type: 'Polygon', coordinates: [closed.map((point) => [point.lng, point.lat])] },
    areaM2,
    center,
  };
}

export function pixelDistance(map: google.maps.Map, from: LatLngPoint, to: LatLngPoint): number {
  const projection = map.getProjection();
  const zoom = map.getZoom();
  if (!projection || zoom === undefined) return Number.POSITIVE_INFINITY;
  const fromPoint = projection.fromLatLngToPoint(from);
  const toPoint = projection.fromLatLngToPoint(to);
  if (!fromPoint || !toPoint) return Number.POSITIVE_INFINITY;
  return Math.hypot(fromPoint.x - toPoint.x, fromPoint.y - toPoint.y) * 2 ** zoom;
}
