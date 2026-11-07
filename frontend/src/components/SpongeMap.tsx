import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRegions } from '../api/client';
import { ATTRIBUTION_SCORE } from '../labels';
import { CellPopupController } from '../map/CellPopupController';
import { COLORS } from '../theme';
import type { RainKey } from '../types/api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface SpongeMapProps {
  rainKey: RainKey;
  scoreMin: number;
  scoreMax: number;
  heatmapVisible: boolean;
}

const FALLBACK_CENTER: L.LatLngTuple = [48.9127, 8.7206];
const FALLBACK_ZOOM = 15;
const MAX_ZOOM = 20;
const HEATMAP_MIN_ZOOM = 13;
const HEATMAP_OPACITY = 0.75;
const FILTER_DEBOUNCE_MS = 250;
const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function buildTileUrl(rainKey: RainKey, scoreMin: number, scoreMax: number): string {
  return `/api/v1/tiles/${rainKey}/{z}/{x}/{y}.png?score_min=${scoreMin}&score_max=${scoreMax}`;
}

export function SpongeMap({ rainKey, scoreMin, scoreMax, heatmapVisible }: SpongeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.TileLayer | null>(null);
  const popupRef = useRef<CellPopupController | null>(null);
  const appliedUrlRef = useRef('');

  const debouncedMin = useDebouncedValue(scoreMin, FILTER_DEBOUNCE_MS);
  const debouncedMax = useDebouncedValue(scoreMax, FILTER_DEBOUNCE_MS);
  const tileUrl = buildTileUrl(rainKey, debouncedMin, debouncedMax);

  const latestRef = useRef({ rainKey, tileUrl, heatmapVisible });
  latestRef.current = { rainKey, tileUrl, heatmapVisible };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const map = L.map(container, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const initial = latestRef.current;
    const heatLayer = L.tileLayer(initial.tileUrl, {
      minZoom: HEATMAP_MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      opacity: HEATMAP_OPACITY,
      attribution: ATTRIBUTION_SCORE,
      errorTileUrl: TRANSPARENT_TILE,
    });
    appliedUrlRef.current = initial.tileUrl;
    if (initial.heatmapVisible) heatLayer.addTo(map);

    fetchRegions()
      .then((geojson) => {
        if (disposed) return;
        const outlines = L.geoJSON(geojson as GeoJSON.FeatureCollection, {
          interactive: false,
          style: { color: COLORS.navy, weight: 1.5, fillOpacity: 0, dashArray: '4 4' },
        }).addTo(map);
        const bounds = outlines.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
      })
      .catch(() => undefined);

    const popup = new CellPopupController(map, initial.rainKey);
    map.on('click', (event: L.LeafletMouseEvent) => {
      void popup.openAt(event.latlng);
    });

    mapRef.current = map;
    heatLayerRef.current = heatLayer;
    popupRef.current = popup;

    return () => {
      disposed = true;
      popup.dispose();
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
      popupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = heatLayerRef.current;
    if (!map || !layer) return;
    if (heatmapVisible) layer.addTo(map);
    else layer.remove();
  }, [heatmapVisible]);

  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer || appliedUrlRef.current === tileUrl) return;
    appliedUrlRef.current = tileUrl;
    layer.setUrl(tileUrl);
  }, [tileUrl]);

  useEffect(() => {
    popupRef.current?.setRainKey(rainKey);
  }, [rainKey]);

  return <div ref={containerRef} role="application" aria-label="Karte: Schwamm Score Pforzheim" style={{ width: '100%', height: '100%' }} />;
}
