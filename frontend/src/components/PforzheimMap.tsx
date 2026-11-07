import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ComputedSiteScore,
  FloodHotspot,
  ScenarioType,
} from '../types/sponge';
import type { CellResponse, RainKey } from '../types/api';
import { CATEGORY_META, MEASURE_LABELS } from '../utils/scoringEngine';
import { fetchCell, fetchRegions } from '../api/client';

interface PforzheimMapProps {
  sites: ComputedSiteScore[];
  selectedSiteId: string | null;
  onSelectSite: (id: string) => void;
  hotspots: FloodHotspot[];
  scenario: ScenarioType;
  showHotspots: boolean;
  onToggleHotspots: () => void;
  flyToTarget: { center: [number, number]; zoom: number; ts: number } | null;
  rainKey?: RainKey;
}

const BASEMAPS = {
  light: {
    name: 'Hell (Planungskarte)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  osm: {
    name: 'Standard (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
};

const KLASSE_LABELS: Record<string, string> = {
  DACH: 'Dach',
  VERSIEGELT: 'Versiegelte Fläche',
  WIESE: 'Wiese / Rasen',
  BAUM: 'Baum',
  GRUENDACH: 'Gründach',
  STILLGEWAESSER: 'Stehendes Gewässer',
  FLIESSGEWAESSER: 'Fließgewässer',
};

const AUSSAGEKRAFT_LABELS: Record<string, string> = {
  BESTAETIGT: 'Bestätigt',
  NUR_LUFTBILD: 'Nur Luftbild',
  ANNAHME: 'Annahme',
  WIDERSPRUCH: 'Widerspruch – kein Score',
};

function scoreColor(score: number): string {
  if (score >= 85) return '#1a9850';
  if (score >= 70) return '#66bd63';
  if (score >= 50) return '#a6d96a';
  if (score >= 35) return '#fdae61';
  if (score >= 20) return '#f46d43';
  return '#d73027';
}

export const PforzheimMap: React.FC<PforzheimMapProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  hotspots,
  scenario,
  showHotspots,
  onToggleHotspots,
  flyToTarget,
  rainKey = '50',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonsGroupRef = useRef<L.LayerGroup | null>(null);
  const hotspotsGroupRef = useRef<L.LayerGroup | null>(null);
  const regionsGroupRef = useRef<L.LayerGroup | null>(null);
  const cellPopupRef = useRef<L.Popup | null>(null);

  const [basemap, setBasemap] = useState<'light' | 'osm'>('light');

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [48.8915, 8.702],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tile = L.tileLayer(BASEMAPS.light.url, {
      attribution: BASEMAPS.light.attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;
    hotspotsGroupRef.current = L.layerGroup().addTo(map);
    polygonsGroupRef.current = L.layerGroup().addTo(map);
    regionsGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Load region outlines from real backend
    fetchRegions()
      .then((geojson) => {
        if (!regionsGroupRef.current) return;
        L.geoJSON(geojson as GeoJSON.FeatureCollection, {
          style: {
            color: '#0369a1',
            weight: 1.5,
            fillOpacity: 0,
            dashArray: '4 4',
          },
        }).addTo(regionsGroupRef.current);
      })
      .catch(() => {/* backend not running yet — silent */});

    // Click on map → query real cell score
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const cell: CellResponse | null = await fetchCell(e.latlng.lat, e.latlng.lng).catch(() => null);
      if (!cell) return;

      const score = cell.score_prozent[rainKey as RainKey];
      const scoreText =
        cell.aussagekraft === 'WIDERSPRUCH' || score === null
          ? 'Kein Score'
          : `${score.toFixed(1)} %`;

      const color = score !== null ? scoreColor(score) : '#94a3b8';

      const popup = L.popup({ maxWidth: 220 })
        .setLatLng(e.latlng)
        .setContent(
          `<div style="font-family:system-ui,sans-serif;padding:4px 0;">
            <div style="font-size:9px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Schwamm-Score · ${rainKey} mm</div>
            <div style="font-size:36px;font-weight:700;line-height:1;color:${color};">${scoreText}</div>
            <div style="font-size:11px;color:#64748b;margin-top:6px;">${KLASSE_LABELS[cell.klasse] ?? cell.klasse}</div>
            <div style="font-size:10px;color:#94a3b8;">${AUSSAGEKRAFT_LABELS[cell.aussagekraft] ?? cell.aussagekraft}</div>
          </div>`
        )
        .openOn(map);

      cellPopupRef.current = popup;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(BASEMAPS[basemap].url);
  }, [basemap]);

  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;
    mapRef.current.flyTo(flyToTarget.center, flyToTarget.zoom, {
      duration: 0.75,
    });
  }, [flyToTarget]);

  // Render Starkregen Hotspots & Flowpaths
  useEffect(() => {
    const group = hotspotsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showHotspots) return;

    hotspots.forEach((hs) => {
      const depth = hs.maxDepthCm[scenario];

      if (hs.type === 'hotspot') {
        const poly = L.polygon(hs.coordinates, {
          color: '#0284c7',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#0ea5e9',
          fillOpacity: 0.22,
        });
        poly.bindTooltip(
          `<div>
            <div style="font-weight:600;">${hs.name}</div>
            <div style="color:#d6d3d1;font-size:11px;">Überflutungstiefe: ${depth} cm · Fließgeschw.: ${hs.flowVelocityMs} m/s</div>
          </div>`,
          { sticky: true, direction: 'top' }
        );
        poly.addTo(group);
      } else {
        const line = L.polyline(hs.coordinates, {
          color: '#0284c7',
          weight: 3,
          opacity: 0.75,
          dashArray: '8, 6',
        });
        line.bindTooltip(
          `<div>
            <div style="font-weight:600;">${hs.name}</div>
            <div style="color:#d6d3d1;font-size:11px;">Hauptfließweg (${depth} cm Spitzentiefe)</div>
          </div>`,
          { sticky: true, direction: 'top' }
        );
        line.addTo(group);
      }
    });
  }, [hotspots, showHotspots, scenario]);

  // Render Potential Polygons
  useEffect(() => {
    const group = polygonsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    sites.forEach((item) => {
      const isSelected = item.site.id === selectedSiteId;
      const catMeta = CATEGORY_META[item.category];
      const measure = MEASURE_LABELS[item.site.primaryMeasure];

      const polygon = L.polygon(item.site.coordinates, {
        color: isSelected ? '#1c1917' : catMeta.strokeColor,
        weight: isSelected ? 3 : 1.5,
        fillColor: catMeta.fillColor,
        fillOpacity: isSelected ? 0.78 : 0.55,
      });

      polygon.on('click', () => {
        onSelectSite(item.site.id);
      });

      polygon.bindTooltip(
        `<div>
          <div style="font-weight:600;">${item.site.name}</div>
          <div style="color:#d6d3d1;font-size:11px;margin-top:2px;">
            Score <strong>${item.score}/100</strong> (${catMeta.label}) · Vorschlag: <strong>${measure.short}</strong>
          </div>
        </div>`,
        { sticky: true, direction: 'top' }
      );

      polygon.addTo(group);

      // Clean minimal number label at polygon center
      const labelHtml = `
        <div style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:26px;
          height:20px;
          padding:0 5px;
          border-radius:4px;
          font-size:11px;
          font-weight:700;
          color:${isSelected ? '#ffffff' : '#fafaf9'};
          background:${isSelected ? '#1c1917' : catMeta.fillColor};
          border:1.5px solid ${isSelected ? '#1c1917' : '#ffffff'};
          box-shadow:0 1px 4px rgba(0,0,0,0.25);
          cursor:pointer;
        ">
          ${item.score}
        </div>
      `;

      const marker = L.marker(item.site.center, {
        icon: L.divIcon({
          className: 'sponge-label-icon',
          html: labelHtml,
          iconSize: [28, 20],
          iconAnchor: [14, 10],
        }),
      });

      marker.on('click', () => {
        onSelectSite(item.site.id);
      });

      marker.addTo(group);
    });
  }, [sites, selectedSiteId, onSelectSite]);

  return (
    <div className="relative w-full h-full flex-1 bg-stone-100 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Minimal Top-Left Map Controls */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
        <div className="inline-flex bg-white border border-stone-200 rounded-md p-0.5 shadow-sm text-xs">
          <button
            onClick={() => setBasemap('light')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              basemap === 'light'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Planungskarte
          </button>
          <button
            onClick={() => setBasemap('osm')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              basemap === 'osm'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Stadtkarte
          </button>
        </div>

        <button
          onClick={onToggleHotspots}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
            showHotspots
              ? 'bg-sky-50 border-sky-300 text-sky-900'
              : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              showHotspots ? 'bg-sky-600' : 'bg-stone-300'
            }`}
          />
          Starkregen-Fließwege & Senken
        </button>
      </div>

      {/* Minimal Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-stone-200 rounded-lg p-3 shadow-sm text-xs">
        <div className="font-semibold text-stone-800 mb-2 text-[11px] uppercase tracking-wider">
          Potenzial-Kategorie (Score)
        </div>
        <div className="space-y-1.5 text-stone-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#15803d] inline-block" />
            <span>Sehr geeignet (75–100)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#65a30d] inline-block" />
            <span>Geeignet (55–74)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#d97706] inline-block" />
            <span>Eingeschränkt geeignet (35–54)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#78716c] inline-block" />
            <span>Ungeeignet / Restriktion (&lt;35)</span>
          </div>
          {showHotspots && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-stone-200 text-sky-800">
              <span className="w-3 h-3 rounded-xs bg-sky-500/30 border border-sky-600 border-dashed inline-block" />
              <span>Starkregen-Hotspot / Fließweg</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
