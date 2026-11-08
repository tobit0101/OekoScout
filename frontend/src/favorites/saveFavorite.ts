import { reversePlace } from '../api/geocoder';
import { addFavorite, updateFavoriteLabel, type Favorite } from './favoritesStore';

export async function saveFavorite(favorite: Favorite): Promise<void> {
  addFavorite(favorite);
  try {
    const place = await reversePlace(favorite.lat, favorite.lng);
    if (place) updateFavoriteLabel(favorite.id, place.primary);
  } catch {
    return;
  }
}
