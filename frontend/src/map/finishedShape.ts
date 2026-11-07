import { COLORS } from '../theme';
import type { AreaShape, LatLngPoint } from '../types/area';
import { boundsRing, buildShape, circleArea, circleRing, pathArea, pathCenter } from './areaGeometry';

export type ShapeSpec =
  | { kind: 'polygon'; path: LatLngPoint[] }
  | { kind: 'rectangle'; bounds: google.maps.LatLngBoundsLiteral }
  | { kind: 'circle'; center: LatLngPoint; radius: number };

export interface FinishedShape {
  measure(): AreaShape | null;
  setEditable(editable: boolean): void;
  dispose(): void;
}

const SHAPE_OPTIONS = {
  editable: true,
  draggable: false,
  clickable: false,
  strokeColor: COLORS.navy,
  strokeOpacity: 1,
  strokeWeight: 2,
  fillColor: COLORS.primary,
  fillOpacity: 0.18,
} as const;

function polygonShape(map: google.maps.Map, path: LatLngPoint[], onEdit: () => void): FinishedShape {
  const polygon = new google.maps.Polygon({ ...SHAPE_OPTIONS, map, paths: path });
  const vertices = polygon.getPath();
  const listeners = ['set_at', 'insert_at', 'remove_at'].map((name) => vertices.addListener(name, onEdit));
  return {
    measure() {
      const points = vertices.getArray().map((vertex) => vertex.toJSON());
      if (points.length < 3) return null;
      return buildShape('polygon', points, pathArea(points), pathCenter(points));
    },
    setEditable: (editable) => polygon.setEditable(editable),
    dispose() {
      listeners.forEach((listener) => listener.remove());
      polygon.setMap(null);
    },
  };
}

function rectangleShape(map: google.maps.Map, bounds: google.maps.LatLngBoundsLiteral, onEdit: () => void): FinishedShape {
  const rectangle = new google.maps.Rectangle({ ...SHAPE_OPTIONS, map, bounds });
  const listener = rectangle.addListener('bounds_changed', onEdit);
  return {
    measure() {
      const current = rectangle.getBounds();
      if (!current) return null;
      const ring = boundsRing(current.toJSON());
      return buildShape('rectangle', ring, pathArea(ring), current.getCenter().toJSON());
    },
    setEditable: (editable) => rectangle.setEditable(editable),
    dispose() {
      listener.remove();
      rectangle.setMap(null);
    },
  };
}

function circleShape(map: google.maps.Map, center: LatLngPoint, radius: number, onEdit: () => void): FinishedShape {
  const circle = new google.maps.Circle({ ...SHAPE_OPTIONS, map, center, radius });
  const listeners = ['radius_changed', 'center_changed'].map((name) => circle.addListener(name, onEdit));
  return {
    measure() {
      const currentCenter = circle.getCenter();
      if (!currentCenter) return null;
      const centerPoint = currentCenter.toJSON();
      const currentRadius = circle.getRadius();
      return buildShape('circle', circleRing(centerPoint, currentRadius), circleArea(currentRadius), centerPoint);
    },
    setEditable: (editable) => circle.setEditable(editable),
    dispose() {
      listeners.forEach((listener) => listener.remove());
      circle.setMap(null);
    },
  };
}

export function createFinishedShape(map: google.maps.Map, spec: ShapeSpec, onEdit: () => void): FinishedShape {
  if (spec.kind === 'polygon') return polygonShape(map, spec.path, onEdit);
  if (spec.kind === 'rectangle') return rectangleShape(map, spec.bounds, onEdit);
  return circleShape(map, spec.center, spec.radius, onEdit);
}
