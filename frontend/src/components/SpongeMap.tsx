import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRegions } from '../api/client';
import { ATTRIBUTION_SCORE } from '../labels';
import { CellPopupController } from '../map/CellPopupController';
import { COLORS } from '../theme';
import type { RainKey } from '../types/api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { FALLBACK_CENTER, FALLBACK_ZOOM, FILTER_DEBOUNCE_MS, HEATMAP_MIN_ZOOM, HEATMAP_OPACITY, TILE_VERSION } from '../map/mapConfig';
import { frameOpacities, KEYFRAME_HOURS, REDUCED_MOTION_QUERY, simulationTileTemplate } from '../map/simulationFrames';
import type { SpongeMapProps } from './mapTypes';

const MAX_ZOOM = 20;
const FOCUS_ZOOM = 18;
const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function buildTileUrl(rainKey: RainKey, scoreMin: number, scoreMax: number): string {
  return `/api/v1/tiles/${rainKey}/{z}/{x}/{y}.png?score_min=${scoreMin}&score_max=${scoreMax}&v=${TILE_VERSION}`;
}

export function SpongeMap({ rainKey, scoreMin, scoreMax, heatmapVisible, simulationActive, simulationHour, focusTarget }: SpongeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.TileLayer | null>(null);
  const popupRef = useRef<CellPopupController | null>(null);
  const appliedUrlRef = useRef('');
  const simulationLayersRef = useRef<L.TileLayer[]>([]);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const debouncedMin = useDebouncedValue(scoreMin, FILTER_DEBOUNCE_MS);
  const debouncedMax = useDebouncedValue(scoreMax, FILTER_DEBOUNCE_MS);
  const tileUrl = buildTileUrl(rainKey, debouncedMin, debouncedMax);

  const showHeatmap = heatmapVisible && !simulationActive;
  const latestRef = useRef({ rainKey, tileUrl, showHeatmap });
  latestRef.current = { rainKey, tileUrl, showHeatmap };

  const simulationFrameRef = useRef({ simulationHour, reducedMotion });
  simulationFrameRef.current = { simulationHour, reducedMotion };

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
    if (initial.showHeatmap) heatLayer.addTo(map);

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
    if (showHeatmap) layer.addTo(map);
    else layer.remove();
  }, [showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !simulationActive) return;
    const { simulationHour: hour, reducedMotion: reduced } = simulationFrameRef.current;
    const opacities = frameOpacities(hour, HEATMAP_OPACITY, reduced);
    const layers = KEYFRAME_HOURS.map((keyframeHour, index) =>
      L.tileLayer(simulationTileTemplate(rainKey, keyframeHour), {
        minZoom: HEATMAP_MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        opacity: opacities[index],
        attribution: index === 0 ? ATTRIBUTION_SCORE : undefined,
        errorTileUrl: TRANSPARENT_TILE,
      }).addTo(map),
    );
    simulationLayersRef.current = layers;
    return () => {
      layers.forEach((layer) => layer.remove());
      simulationLayersRef.current = [];
    };
  }, [simulationActive, rainKey]);

  useEffect(() => {
    const opacities = frameOpacities(simulationHour, HEATMAP_OPACITY, reducedMotion);
    simulationLayersRef.current.forEach((layer, index) => layer.setOpacity(opacities[index]));
  }, [simulationHour, reducedMotion, simulationActive, rainKey]);

  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer || appliedUrlRef.current === tileUrl) return;
    appliedUrlRef.current = tileUrl;
    layer.setUrl(tileUrl);
  }, [tileUrl]);

  useEffect(() => {
    popupRef.current?.setRainKey(rainKey);
  }, [rainKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    const position = L.latLng(focusTarget.lat, focusTarget.lng);
    map.setView(position, FOCUS_ZOOM, { animate: false });
    void popupRef.current?.openAt(position);
  }, [focusTarget]);

  return <div ref={containerRef} role="application" aria-label="Karte: Schwamm Score Pforzheim" style={{ width: '100%', height: '100%' }} />;
}
