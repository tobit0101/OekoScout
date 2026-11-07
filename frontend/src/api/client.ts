import type {
  CellResponse,
  RegionsResponse,
  StatsResponse,
  HealthResponse,
} from '../types/api';

const BASE = '/api/v1';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchCell(
  lat: number,
  lng: number
): Promise<CellResponse | null> {
  const res = await fetch(`${BASE}/cell?lat=${lat}&lng=${lng}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cell fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchRegions(): Promise<RegionsResponse> {
  const res = await fetch(`${BASE}/regions`);
  if (!res.ok) throw new Error(`Regions fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}
