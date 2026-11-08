export const FALLBACK_CENTER = { lat: 48.9127, lng: 8.7206 } as const;
export const FALLBACK_ZOOM = 15;
export const HEATMAP_MIN_ZOOM = 13;
export const HEATMAP_OPACITY = 0.75;
export const FILTER_DEBOUNCE_MS = 250;
export const TILE_VERSION = 7;
export const SIMULATION_DEFAULT_DURATION_S = 10;
export const SIMULATION_MIN_DURATION_S = 2;
export const SIMULATION_MAX_DURATION_S = 120;
export const SIMULATION_HOURS = 24;
export const SIMULATION_KEYFRAME_STEP_HOURS = 2;
export const SIMULATION_KEYFRAME_COUNT = SIMULATION_HOURS / SIMULATION_KEYFRAME_STEP_HOURS + 1;

export const GOOGLE_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export const GOOGLE_MAPS_API_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
