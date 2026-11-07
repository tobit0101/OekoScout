export const FALLBACK_CENTER = { lat: 48.9127, lng: 8.7206 } as const;
export const FALLBACK_ZOOM = 15;
export const HEATMAP_MIN_ZOOM = 13;
export const HEATMAP_OPACITY = 0.75;
export const FILTER_DEBOUNCE_MS = 250;

export const GOOGLE_MAPS_API_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
