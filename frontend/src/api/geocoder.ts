const PHOTON_URL = 'https://photon.komoot.io/api/';
const PFORZHEIM_BBOX = '8.60,48.83,8.82,48.95';
const BIAS_LAT = 48.89;
const BIAS_LON = 8.7;
export const MAX_SUGGESTIONS = 6;

export interface PlaceSuggestion {
  id: string;
  lat: number;
  lng: number;
  primary: string;
  secondary: string;
}

interface PhotonProperties {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  district?: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function joinParts(parts: Array<string | undefined>, separator: string): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(separator);
}

function parseCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [lng, lat] = value;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return { lat, lng };
}

function toSuggestion(feature: PhotonFeature): PlaceSuggestion | null {
  const position = parseCoordinates(feature.geometry?.coordinates);
  const properties = feature.properties;
  if (!position || !properties) return null;

  const primary = properties.name?.trim() || joinParts([properties.street, properties.housenumber], ' ');
  if (!primary) return null;

  const secondary = joinParts([joinParts([properties.postcode, properties.city], ' '), properties.district], ' · ');
  const osmId = properties.osm_type && properties.osm_id !== undefined ? `${properties.osm_type}${properties.osm_id}` : '';
  const id = osmId || `${position.lat},${position.lng}`;
  return { id, ...position, primary, secondary };
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    lang: 'de',
    limit: String(MAX_SUGGESTIONS),
    bbox: PFORZHEIM_BBOX,
    lat: String(BIAS_LAT),
    lon: String(BIAS_LON),
  });
  const response = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Photon request failed: ${response.status}`);

  const body = (await response.json()) as PhotonResponse;
  const seenLabels = new Set<string>();
  const suggestions: PlaceSuggestion[] = [];
  for (const feature of body.features ?? []) {
    const suggestion = toSuggestion(feature);
    if (!suggestion) continue;
    const label = `${suggestion.primary}|${suggestion.secondary}`;
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    suggestions.push(suggestion);
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  return suggestions;
}
