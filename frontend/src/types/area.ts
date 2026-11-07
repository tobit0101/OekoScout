import type { AreaGeometry } from './api';

export type DrawingTool = 'polygon' | 'circle' | 'rectangle';
export type AreaTool = 'select' | DrawingTool;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface AreaShape {
  kind: DrawingTool;
  geometry: AreaGeometry;
  areaM2: number;
  center: LatLngPoint;
}

export interface DrawDraft {
  tool: DrawingTool;
  vertexCount: number;
  areaM2: number | null;
}
