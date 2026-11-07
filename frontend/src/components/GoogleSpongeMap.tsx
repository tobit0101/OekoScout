import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { addScoreAttribution, removeScoreAttribution } from '../map/googleAttribution';
import { GoogleCellPopupController } from '../map/GoogleCellPopupController';
import { applyHeatmap, createHeatmapMapType } from '../map/googleHeatmap';
import { loadGoogleMaps } from '../map/googleMapsLoader';
import { addRegionOutlines, removeRegionOutlines } from '../map/googleRegions';
import { FALLBACK_CENTER, FALLBACK_ZOOM, FILTER_DEBOUNCE_MS, GOOGLE_MAPS_API_KEY } from '../map/mapConfig';
import type { SpongeMapProps } from './mapTypes';

const MAX_ZOOM = 21;
const MIN_ZOOM = 11;

export function GoogleSpongeMap({ rainKey, scoreMin, scoreMax, heatmapVisible }: SpongeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<GoogleCellPopupController | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const debouncedMin = useDebouncedValue(scoreMin, FILTER_DEBOUNCE_MS);
  const debouncedMax = useDebouncedValue(scoreMax, FILTER_DEBOUNCE_MS);

  const latestRef = useRef({ rainKey });
  latestRef.current = { rainKey };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let createdMap: google.maps.Map | null = null;
    let popup: GoogleCellPopupController | null = null;

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (disposed) return;
        const newMap = new google.maps.Map(container, {
          center: FALLBACK_CENTER,
          zoom: FALLBACK_ZOOM,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        const newPopup = new GoogleCellPopupController(newMap, latestRef.current.rainKey);
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          void newPopup.openAt(event.latLng.toJSON());
        });
        addScoreAttribution(newMap);
        addRegionOutlines(newMap, () => disposed).catch(() => undefined);

        createdMap = newMap;
        popup = newPopup;
        popupRef.current = newPopup;
        setMap(newMap);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      popupRef.current = null;
      if (!createdMap) return;
      google.maps.event.clearInstanceListeners(createdMap);
      popup?.dispose();
      applyHeatmap(createdMap, null);
      removeRegionOutlines(createdMap);
      removeScoreAttribution(createdMap);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    applyHeatmap(map, heatmapVisible ? createHeatmapMapType(rainKey, debouncedMin, debouncedMax) : null);
  }, [map, heatmapVisible, rainKey, debouncedMin, debouncedMax]);

  useEffect(() => {
    popupRef.current?.setRainKey(rainKey);
  }, [rainKey]);

  return <div ref={containerRef} role="application" aria-label="Karte: Schwamm Score Pforzheim" style={{ width: '100%', height: '100%' }} />;
}
