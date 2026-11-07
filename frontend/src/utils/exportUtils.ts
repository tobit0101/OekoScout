import { ComputedSiteScore, ScenarioType } from '../types/sponge';
import { CATEGORY_META, MEASURE_LABELS, SCENARIO_RAINFALL_MM, SURFACE_LABELS } from './scoringEngine';

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsGeoJSON(items: ComputedSiteScore[], scenario: ScenarioType) {
  const featureCollection = {
    type: 'FeatureCollection',
    name: `Schwammstadt_Potenzialkarte_Pforzheim_${scenario}`,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features: items.map((item) => {
      // GeoJSON uses [lng, lat] and closed polygon ring
      const ring = item.site.coordinates.map(([lat, lng]) => [lng, lat]);
      if (ring.length > 0) {
        ring.push([...ring[0]]);
      }
      return {
        type: 'Feature',
        properties: {
          id: item.site.id,
          name: item.site.name,
          quartier: item.site.quartierLabel,
          address: item.site.address,
          flurstueck: item.site.flurstueck,
          score: item.score,
          category: CATEGORY_META[item.category].label,
          surfaceType: SURFACE_LABELS[item.site.surfaceType],
          areaSqm: item.site.areaSqm,
          imperviousnessPct: item.site.imperviousness,
          arupSoilGroup: item.site.soilGroup,
          curveNumberCurrent: item.site.curveNumberCurrent,
          curveNumberTarget: item.site.curveNumberTarget,
          sponginessCurrentPct: item.sponginessCurrentPct,
          sponginessAfterPct: item.sponginessAfterPct,
          retentionVolumeM3: item.retentionVolumeM3,
          primaryMeasure: MEASURE_LABELS[item.site.primaryMeasure].label,
          recommendedMeasures: item.site.recommendedMeasures.map((m) => MEASURE_LABELS[m].short).join(', '),
          affectedResidents250m: item.site.affectedResidentsRadius250m,
          heatIslandDeltaC: item.site.heatIslandDeltaC,
          estimatedCostEur: item.site.estimatedCostEur,
          gruenMalDreiEligible: item.site.gruenMalDreiEligible,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };
    }),
  };

  downloadBlob(
    JSON.stringify(featureCollection, null, 2),
    `schwammstadt-pforzheim-${scenario}.geojson`,
    'application/geo+json;charset=utf-8'
  );
}

export function exportAsCSV(items: ComputedSiteScore[], scenario: ScenarioType) {
  const headers = [
    'Rang',
    'ID',
    'Name',
    'Quartier',
    'Adresse',
    'Flurstueck',
    'Schwammstadt_Score',
    'Kategorie',
    'Flaechentyp',
    'Flaeche_m2',
    'Versiegelung_Prozent',
    'Arup_Soil_Group',
    'CN_Ist',
    'CN_Ziel',
    'Sponginess_Ist_Prozent',
    'Sponginess_Ziel_Prozent',
    'Rueckhaltepotenzial_m3',
    'Primaer_Massnahme',
    'Betroffene_Einwohner_250m',
    'Hitzeinsel_Delta_C',
    'Geschaetzte_Kosten_EUR',
    'Foerderung_Gruen_mal_drei',
  ];

  const rows = items.map((item, idx) => [
    idx + 1,
    item.site.id,
    `"${item.site.name.replace(/"/g, '""')}"`,
    `"${item.site.quartierLabel}"`,
    `"${item.site.address}"`,
    `"${item.site.flurstueck}"`,
    item.score,
    `"${CATEGORY_META[item.category].label}"`,
    `"${SURFACE_LABELS[item.site.surfaceType]}"`,
    item.site.areaSqm,
    item.site.imperviousness,
    item.site.soilGroup,
    item.site.curveNumberCurrent,
    item.site.curveNumberTarget,
    item.sponginessCurrentPct,
    item.sponginessAfterPct,
    item.retentionVolumeM3,
    `"${MEASURE_LABELS[item.site.primaryMeasure].label}"`,
    item.site.affectedResidentsRadius250m,
    item.site.heatIslandDeltaC,
    item.site.estimatedCostEur,
    item.site.gruenMalDreiEligible ? `Ja (bis ${item.site.gruenMalDreiSubsidyMaxEur} EUR)` : 'Kommunal/Bundesfoerderung',
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

  downloadBlob(
    csvContent,
    `schwammstadt-potenzialkarte-pforzheim-${scenario}.csv`,
    'text/csv;charset=utf-8'
  );
}

export function exportAsPrintablePDF(
  selected: ComputedSiteScore,
  topList: ComputedSiteScore[],
  scenario: ScenarioType
) {
  const scenarioInfo = SCENARIO_RAINFALL_MM[scenario];
  const top10Rows = topList
    .slice(0, 10)
    .map(
      (item, i) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;font-weight:bold;">#${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">${item.site.name}<br/><span style="color:#64748b;font-size:11px;">${item.site.quartierLabel}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;font-weight:bold;color:#059669;">${item.score} / 100</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">${item.site.areaSqm.toLocaleString('de-DE')} m²</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">${item.retentionVolumeM3.toLocaleString('de-DE')} m³</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">${MEASURE_LABELS[item.site.primaryMeasure].short}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Steckbrief & Bericht – Schwammstadt-Potenzialkarte Pforzheim</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 32px; line-height: 1.45; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #065f46; }
    h2 { font-size: 16px; margin-top: 22px; margin-bottom: 8px; border-bottom: 2px solid #10b981; padding-bottom: 4px; color: #0f172a; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; }
    .card-val { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { text-align: left; background: #f1f5f9; padding: 8px; border-bottom: 2px solid #94a3b8; }
    @media print { .no-print { display: none; } body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;padding:10px;background:#ecfdf5;border:1px solid #10b981;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
    <span><strong>Druck- & PDF-Ansicht:</strong> Nutzen Sie „Als PDF speichern“ im Druckdialog.</span>
    <button onclick="window.print()" style="background:#059669;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">Jetzt drucken / Als PDF speichern</button>
  </div>
  <h1>Schwammstadt-Potenzialkarte Pforzheim – Flächen-Steckbrief</h1>
  <div class="meta">Szenario: <strong>${scenarioInfo.label}</strong> | Methodik: Geodaten-Scoring Pforzheim + Arup Global Sponge Cities Snapshot (SCS Curve Number)</div>

  <h2>1. Fokus-Fläche: ${selected.site.name} (${selected.site.quartierLabel})</h2>
  <p style="font-size:13px;margin:4px 0 12px 0;"><strong>Adresse / Flurstück:</strong> ${selected.site.address} (${selected.site.flurstueck}) — <strong>ALKIS:</strong> ${selected.site.alkisNutzung}</p>
  <div class="grid">
    <div class="card">
      <div class="card-label">Schwammstadt-Score</div>
      <div class="card-val" style="color:#059669;">${selected.score} / 100 (${CATEGORY_META[selected.category].label})</div>
    </div>
    <div class="card">
      <div class="card-label">Fläche & Versiegelung</div>
      <div class="card-val">${selected.site.areaSqm.toLocaleString('de-DE')} m² (${selected.site.imperviousness}% grau)</div>
    </div>
    <div class="card">
      <div class="card-label">Rückhaltepotenzial</div>
      <div class="card-val">${selected.retentionVolumeM3.toLocaleString('de-DE')} m³ (${(selected.retentionVolumeM3 * 1000).toLocaleString('de-DE')} L)</div>
    </div>
    <div class="card">
      <div class="card-label">Arup Sponginess (Vorher → Nachher)</div>
      <div class="card-val">${selected.sponginessCurrentPct}% → ${selected.sponginessAfterPct}% (CN ${selected.site.curveNumberCurrent}→${selected.site.curveNumberTarget})</div>
    </div>
    <div class="card">
      <div class="card-label">Bodeneignung (LGRB / HYSOGs)</div>
      <div class="card-val" style="font-size:14px;">Gruppe ${selected.site.soilGroup}: ${selected.site.infiltrationRateMmH} mm/h</div>
    </div>
    <div class="card">
      <div class="card-label">Betroffenheit (250m) & Hitze</div>
      <div class="card-val">${selected.site.affectedResidentsRadius250m.toLocaleString('de-DE')} Einw. | +${selected.site.heatIslandDeltaC.toFixed(1)} °C</div>
    </div>
  </div>
  <p style="font-size:13px;"><strong>Empfohlene Maßnahme (${MEASURE_LABELS[selected.site.primaryMeasure].label}):</strong> ${selected.site.measureReasoning}</p>
  <p style="font-size:13px;"><strong>Restriktionen & Auflagen:</strong> ${selected.site.restrictionReasons.join('; ')}</p>
  <p style="font-size:13px;"><strong>Geschätzte Investition:</strong> ${selected.site.estimatedCostEur.toLocaleString('de-DE')} € | <strong>Förderung „Grün mal drei“:</strong> ${selected.site.gruenMalDreiEligible ? `Förderfähig (bis ${selected.site.gruenMalDreiSubsidyMaxEur.toLocaleString('de-DE')} € Zuschuss)` : 'Kommunale Eigenmaßnahme / Bundesförderung'}</p>

  <h2>2. Top-10 Priorisierte Potenzialflächen in Pforzheim (Aktuelle Filterung)</h2>
  <table>
    <thead>
      <tr>
        <th>Rang</th>
        <th>Fläche & Quartier</th>
        <th>Score</th>
        <th>Fläche</th>
        <th>Rückhalt</th>
        <th>Primärmaßnahme</th>
      </tr>
    </thead>
    <tbody>
      ${top10Rows}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

