import type {
  AreaGeometry,
  AreaRequest,
  AreaStatsResponse,
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

export class AreaInputError extends Error {}

const UNPROCESSABLE_ENTITY = 422;
const INVALID_AREA_MESSAGE = 'Ungültige Fläche';

async function readDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const detail = (body as { detail?: unknown }).detail;
    return typeof detail === 'string' ? detail : INVALID_AREA_MESSAGE;
  } catch {
    return INVALID_AREA_MESSAGE;
  }
}

export async function fetchAreaStats(geometry: AreaGeometry, signal?: AbortSignal): Promise<AreaStatsResponse> {
  const body: AreaRequest = { geometry };
  const res = await fetch(`${BASE}/area`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (res.status === UNPROCESSABLE_ENTITY) throw new AreaInputError(await readDetail(res));
  if (!res.ok) throw new Error(`Area fetch failed: ${res.status}`);
  return res.json();
}
