import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { CellResponse, RainKey } from '../types/api';
import { fetchCell, fetchRegions } from '../api/client';

interface SpongeMapProps {
  rainKey: RainKey;
  scoreMin: number;
  scoreMax: number;
}

const KLASSE_DE: Record<string, string> = {
  DACH: 'Dach',
  VERSIEGELT: 'Versiegelte Fläche',
  WIESE: 'Wiese / Rasen',
  BAUM: 'Baum',
  GRUENDACH: 'Gründach',
  STILLGEWAESSER: 'Stehendes Gewässer',
  FLIESSGEWAESSER: 'Fließgewässer',
};

function scoreColor(score: number): string {
  if (score >= 85) return '#1a9850';
  if (score >= 70) return '#66bd63';
  if (score >= 55) return '#2d7a3a';
  if (score >= 40) return '#e07b00';
  if (score >= 25) return '#f46d43';
  return '#d73027';
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Sehr gut';
  if (score >= 70) return 'Gut';
  if (score >= 55) return 'Mittel';
  if (score >= 40) return 'Eingeschränkt';
  if (score >= 25) return 'Schlecht';
  return 'Sehr schlecht';
}

export const SpongeMap: React.FC<SpongeMapProps> = ({ rainKey }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const regionsRef = useRef<L.LayerGroup | null>(null);
  // keep rainKey accessible inside stable closure
  const rainKeyRef = useRef(rainKey);
  rainKeyRef.current = rainKey;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [48.8915, 8.702],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    regionsRef.current = L.layerGroup().addTo(map);

    // Region outlines
    fetchRegions()
      .then((geojson) => {
        if (!regionsRef.current) return;
        L.geoJSON(geojson as GeoJSON.FeatureCollection, {
          style: { color: '#0369a1', weight: 1.5, fillOpacity: 0, dashArray: '4 4' },
        }).addTo(regionsRef.current);
      })
      .catch(() => {/* backend not ready */});

    // Click handler — uses ref so it always reads current rainKey
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const cell: CellResponse | null = await fetchCell(e.latlng.lat, e.latlng.lng).catch(() => null);
      if (!cell) return;

      const rk = rainKeyRef.current;
      const score = cell.score_prozent[rk];
      const isWiderspruch = cell.aussagekraft === 'WIDERSPRUCH';
      const noScore = isWiderspruch || score === null;

      const color = noScore ? '#94a3b8' : scoreColor(score!);
      const scoreDisplay = noScore ? '—' : score!.toFixed(1);
      const labelText = noScore ? 'Kein Score' : scoreLabel(score!);
      const klasseText = KLASSE_DE[cell.klasse] ?? cell.klasse;

      // Retained liters: abfluss_mm * 1 L/mm/m² (simplification; exact formula uses area)
      const abfluss = cell.abfluss_mm[rk];
      const retainedL = abfluss !== null ? Math.round(abfluss) : null;

      const popupHtml = buildPopupHtml(scoreDisplay, color, labelText, rk, klasseText, retainedL);

      L.popup({ maxWidth: 240, className: 'sponge-popup' })
        .setLatLng(e.latlng)
        .setContent(popupHtml)
        .openOn(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

function buildPopupHtml(
  scoreDisplay: string,
  color: string,
  labelText: string,
  rainKey: RainKey,
  klasseText: string,
  retainedL: number | null,
): string {
  const dropSvg = `
    <svg viewBox="0 0 54 66" width="54" height="66" xmlns="http://www.w3.org/2000/svg">
      <path d="M27 4 C27 4 6 28 6 42 a21 21 0 0 0 42 0 C48 28 27 4 27 4 Z"
        fill="#D1EAF1" stroke="#66C6DF" stroke-width="2"/>
      <clipPath id="fc"><rect x="0" y="28" width="54" height="40"/></clipPath>
      <path d="M27 4 C27 4 6 28 6 42 a21 21 0 0 0 42 0 C48 28 27 4 27 4 Z"
        fill="#66C6DF" opacity=".4" clip-path="url(#fc)"/>
    </svg>`;

  const dropBlock = retainedL !== null
    ? `<div style="position:relative;width:54px;height:66px;flex-shrink:0;">
        ${dropSvg}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:10px;">
          <span style="font-size:16px;font-weight:700;color:#2E296B;line-height:1;">${retainedL}</span>
          <span style="font-size:9px;font-weight:600;color:#2E296B;letter-spacing:.3px;">Liter</span>
        </div>
      </div>`
    : '';

  return `
    <div style="font-family:'Inter',system-ui,sans-serif;width:218px;overflow:hidden;border-radius:4px;">
      <div style="padding:14px 16px 12px;background:#fff;">
        <div style="font-size:9px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:#7c97cd;margin-bottom:4px;">Schwamm-Score · ${rainKey} mm</div>
        <div style="display:flex;align-items:baseline;gap:3px;">
          <span style="font-size:52px;font-weight:700;letter-spacing:-3px;line-height:1;color:${color};">${scoreDisplay}</span>
          <span style="font-size:22px;font-weight:600;color:${color};">${scoreDisplay !== '—' ? '%' : ''}</span>
        </div>
        <div style="font-size:11px;font-weight:600;color:${color};margin-top:2px;">${labelText}</div>
      </div>
      <div style="height:1px;background:#E6F4F1;"></div>
      <div style="padding:12px 14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:11px;color:#1A2B2F;line-height:1.55;flex:1;">
            ${klasseText}${retainedL !== null ? `<br><span style="color:#7c97cd;font-size:10px;">Bei <strong style="color:#66C6DF;">${rainKey} mm</strong> / 24h hält diese Zelle:</span>` : ''}
          </div>
          ${dropBlock}
        </div>
      </div>
    </div>`;
}
