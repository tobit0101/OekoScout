export interface Favorite {
  id: string;
  lat: number;
  lng: number;
  label: string;
  secondary: string;
  savedAt: number;
}

export const FAVORITES_STORAGE_KEY = 'schwammscore.favorites';
export const MAX_FAVORITES = 50;

const listeners = new Set<() => void>();
let cache: Favorite[] | null = null;

function isFavoriteRecord(value: unknown): value is Favorite {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.lat === 'number' &&
    typeof record.lng === 'number' &&
    typeof record.label === 'string' &&
    typeof record.secondary === 'string' &&
    typeof record.savedAt === 'number'
  );
}

function load(): Favorite[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isFavoriteRecord).slice(0, MAX_FAVORITES) : [];
  } catch {
    return [];
  }
}

function commit(next: Favorite[]): void {
  cache = next;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    cache = next;
  }
  listeners.forEach((listener) => listener());
}

export function getFavorites(): Favorite[] {
  cache ??= load();
  return cache;
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((favorite) => favorite.id === id);
}

export function addFavorite(favorite: Favorite): void {
  if (isFavorite(favorite.id)) return;
  commit([favorite, ...getFavorites()].slice(0, MAX_FAVORITES));
}

export function removeFavorite(id: string): void {
  if (!isFavorite(id)) return;
  commit(getFavorites().filter((favorite) => favorite.id !== id));
}

export function updateFavoriteLabel(id: string, label: string): void {
  if (!isFavorite(id)) return;
  commit(getFavorites().map((favorite) => (favorite.id === id ? { ...favorite, label } : favorite)));
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== FAVORITES_STORAGE_KEY) return;
  cache = null;
  listeners.forEach((listener) => listener());
});
