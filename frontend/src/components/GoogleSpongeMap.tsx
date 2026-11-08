import { useEffect, useRef, useState } from 'react';
import type { AreaSelection } from '../hooks/useAreaSelection';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { addScoreAttribution, removeScoreAttribution } from '../map/googleAttribution';
import { GoogleCellPopupController } from '../map/GoogleCellPopupController';
import { AreaDrawingController } from '../map/googleDrawing';
import { applyHeatmap, createHeatmapMapType } from '../map/googleHeatmap';
import { loadGoogleMaps } from '../map/googleMapsLoader';
import { addRegionOutlines, removeRegionOutlines } from '../map/googleRegions';
import { addSimulationLayer, removeSimulationLayer } from '../map/googleSimulation';
import { FALLBACK_CENTER, FALLBACK_ZOOM, FILTER_DEBOUNCE_MS, GOOGLE_MAP_STYLES, GOOGLE_MAPS_API_KEY } from '../map/mapConfig';
import { SimulationTileController } from '../map/simulationCanvas';
import { REDUCED_MOTION_QUERY } from '../map/simulationFrames';
import { AreaHintBand } from './area/AreaHintBand';
import { AreaToolbar } from './area/AreaToolbar';
import { labelScoreText } from './area/areaFormat';
import './area/area.css';
import type { SpongeMapProps } from './mapTypes';

const MAX_ZOOM = 21;
const MIN_ZOOM = 11;
const FOCUS_ZOOM = 18;

export function GoogleSpongeMap({ rainKey, scoreMin, scoreMax, heatmapVisible, simulationActive, simulationHour, focusTarget, area }: SpongeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<GoogleCellPopupController | null>(null);
  const drawingRef = useRef<AreaDrawingController | null>(null);
  const areaRef = useRef<AreaSelection | undefined>(area);
  areaRef.current = area;
  const simulationControllerRef = useRef<SimulationTileController | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const debouncedMin = useDebouncedValue(scoreMin, FILTER_DEBOUNCE_MS);
  const debouncedMax = useDebouncedValue(scoreMax, FILTER_DEBOUNCE_MS);

  const latestRef = useRef({ rainKey });
  latestRef.current = { rainKey };

  const simulationFrameRef = useRef({ simulationHour, reducedMotion });
  simulationFrameRef.current = { simulationHour, reducedMotion };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let createdMap: google.maps.Map | null = null;
    let popup: GoogleCellPopupController | null = null;
    let drawing: AreaDrawingController | null = null;

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
          mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: GOOGLE_MAP_STYLES,
        });
        const newPopup = new GoogleCellPopupController(newMap, latestRef.current.rainKey);
        const newDrawing = new AreaDrawingController(newMap, {
          onDraftChange: (draft) => areaRef.current?.handleDraftChange(draft),
          onShapeChange: (shape, finished) => areaRef.current?.handleShapeChange(shape, finished),
          onToolEnd: () => areaRef.current?.handleToolEnd(),
          onOpenInfo: () => areaRef.current?.openInfo(),
        });
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng || newDrawing.isDrawing) return;
          void newPopup.openAt(event.latLng.toJSON());
        });
        addScoreAttribution(newMap);
        addRegionOutlines(newMap, () => disposed).catch(() => undefined);

        createdMap = newMap;
        popup = newPopup;
        popupRef.current = newPopup;
        drawing = newDrawing;
        drawingRef.current = newDrawing;
        setMap(newMap);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      popupRef.current = null;
      drawingRef.current = null;
      if (!createdMap) return;
      google.maps.event.clearInstanceListeners(createdMap);
      drawing?.dispose();
      popup?.dispose();
      applyHeatmap(createdMap, null);
      removeRegionOutlines(createdMap);
      removeScoreAttribution(createdMap);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const showHeatmap = heatmapVisible && !simulationActive;
    applyHeatmap(map, showHeatmap ? createHeatmapMapType(rainKey, debouncedMin, debouncedMax) : null);
  }, [map, heatmapVisible, simulationActive, rainKey, debouncedMin, debouncedMax]);

  useEffect(() => {
    if (!map || !simulationActive) return;
    const { simulationHour: hour, reducedMotion: reduced } = simulationFrameRef.current;
    const controller = new SimulationTileController(rainKey, hour, reduced);
    const layer = addSimulationLayer(map, controller);
    simulationControllerRef.current = controller;
    return () => {
      removeSimulationLayer(map, layer);
      controller.dispose();
      simulationControllerRef.current = null;
    };
  }, [map, simulationActive, rainKey]);

  useEffect(() => {
    simulationControllerRef.current?.setHour(simulationHour);
  }, [simulationHour]);

  useEffect(() => {
    simulationControllerRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    popupRef.current?.setRainKey(rainKey);
  }, [rainKey]);

  useEffect(() => {
    if (!map || !focusTarget) return;
    const position = { lat: focusTarget.lat, lng: focusTarget.lng };
    map.moveCamera({ center: position, zoom: FOCUS_ZOOM });
    void popupRef.current?.openAt(position);
  }, [map, focusTarget]);

  const tool = area?.tool;
  const clearNonce = area?.clearNonce;
  const scoreText = area ? labelScoreText(area.statsState, rainKey) : '';

  useEffect(() => {
    if (!map || !tool) return;
    drawingRef.current?.setTool(tool);
  }, [map, tool]);

  useEffect(() => {
    if (!map) return;
    drawingRef.current?.clearShape();
  }, [map, clearNonce]);

  useEffect(() => {
    if (!map) return;
    drawingRef.current?.setScoreText(scoreText);
  }, [map, scoreText]);

  const measuredArea = area?.statsState.status === 'ready' ? area.statsState.stats.flaeche_m2 : null;

  useEffect(() => {
    if (!map || measuredArea === null) return;
    drawingRef.current?.setMeasuredArea(measuredArea);
  }, [map, measuredArea]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} role="application" aria-label="Karte: Schwamm Score Pforzheim" style={{ width: '100%', height: '100%' }} />
      {map && area && (
        <>
          <AreaToolbar tool={area.tool} hasShape={area.shape !== null} onToolChange={area.setTool} onClear={area.clear} />
          {area.draft && <AreaHintBand draft={area.draft} onCancel={() => area.setTool('select')} />}
        </>
      )}
    </div>
  );
}
