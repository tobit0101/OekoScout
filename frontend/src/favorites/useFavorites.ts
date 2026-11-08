import { useSyncExternalStore } from 'react';
import { getFavorites, subscribe, type Favorite } from './favoritesStore';

export function useFavorites(): Favorite[] {
  return useSyncExternalStore(subscribe, getFavorites, getFavorites);
}
