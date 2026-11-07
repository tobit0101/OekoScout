import { fetchRegions } from '../api/client';
import { COLORS } from '../theme';

export async function addRegionOutlines(map: google.maps.Map, isDisposed: () => boolean): Promise<void> {
  const geojson = await fetchRegions();
  if (isDisposed()) return;

  map.data.setStyle({
    fillOpacity: 0,
    strokeColor: COLORS.navy,
    strokeWeight: 2,
    strokeOpacity: 0.8,
    clickable: false,
  });
  map.data.addGeoJson(geojson);

  const bounds = new google.maps.LatLngBounds();
  map.data.forEach((feature) => {
    feature.getGeometry()?.forEachLatLng((latLng) => bounds.extend(latLng));
  });
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, 24);
}

export function removeRegionOutlines(map: google.maps.Map): void {
  map.data.forEach((feature) => map.data.remove(feature));
}
