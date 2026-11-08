import type { ReactNode } from 'react';
import type { CellResponse, RainKey } from '../../types/api';
import { ANNAHME_LABEL, AUSSAGEKRAFT_DISPLAY, BODENGRUPPE_LABEL, KLASSE_LABEL } from '../../labels';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';
import { InfoDialogShell } from '../dialog/InfoDialogShell';

interface CellInfoDialogProps {
  cell: CellResponse;
  lat: number;
  lng: number;
  rainKey: RainKey;
  onClose: () => void;
}

interface InfoRow {
  term: string;
  text: string;
  content?: ReactNode;
}

function formatGridCoordinates(cellId: string): string {
  const [easting, northing] = cellId.split('_');
  if (!/^\d+$/.test(easting ?? '') || !/^\d+$/.test(northing ?? '')) return cellId;
  return `${easting} / ${northing}`;
}

function buildRows({ cell, lat, lng, rainKey }: Omit<CellInfoDialogProps, 'onClose'>): InfoRow[] {
  const aussagekraft = AUSSAGEKRAFT_DISPLAY[cell.aussagekraft];
  const runoff = cell.abfluss_mm[rainKey];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const annahmen = cell.annahmen.map((annahme) => ANNAHME_LABEL[annahme] ?? annahme);

  const rows: InfoRow[] = [
    {
      term: 'Aussagekraft',
      text: aussagekraft.label,
      content: (
        <>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: aussagekraft.color,
              marginRight: 8,
            }}
          />
          {aussagekraft.label}
        </>
      ),
    },
  ];
  if (annahmen.length > 0) {
    rows.push({
      term: 'Annahmen',
      text: annahmen.join('; '),
      content: (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {annahmen.map((annahme) => (
            <li key={annahme}>{annahme}</li>
          ))}
        </ul>
      ),
    });
  }
  rows.push(
    { term: 'Fläche', text: KLASSE_LABEL[cell.klasse] ?? cell.klasse },
    { term: 'Bodengruppe', text: BODENGRUPPE_LABEL[cell.bodengruppe] ?? cell.bodengruppe },
    { term: 'Hangneigung', text: `${formatDecimal(cell.neigung_prozent)} %` },
    { term: 'Regenmenge', text: `${rainKey} mm in 24h` },
  );
  if (runoff !== null) {
    rows.push(
      { term: 'Abfluss', text: `${formatDecimal(runoff)} Liter je m²` },
      { term: 'Zurückgehalten', text: `${formatDecimal(Number(rainKey) - runoff)} Liter je m²` },
    );
  }
  rows.push(
    { term: 'Koordinaten (WGS84)', text: `${lat.toFixed(6)}, ${lng.toFixed(6)}` },
    { term: 'Rechtswert / Hochwert', text: formatGridCoordinates(cell.id) },
    {
      term: 'Google Maps',
      text: mapsUrl,
      content: (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.navy, fontWeight: 600 }}>
          In Google Maps öffnen
        </a>
      ),
    },
  );
  return rows;
}

function buildClipboardText(rows: InfoRow[]): string {
  return rows.map((row) => `${row.term}: ${row.text}`).join('\n');
}

export function CellInfoDialog({ cell, lat, lng, rainKey, onClose }: CellInfoDialogProps) {
  const rows = buildRows({ cell, lat, lng, rainKey });

  return (
    <InfoDialogShell
      titleId="cell-info-title"
      title="Details zur Fläche"
      copyLabel="Alle Angaben kopieren"
      copyText={buildClipboardText(rows)}
      onClose={onClose}
    >
      <dl className="cell-info-dialog__list">
        {rows.map((row) => (
          <div key={row.term} className="cell-info-dialog__row">
            <dt>{row.term}</dt>
            <dd>{row.content ?? row.text}</dd>
          </div>
        ))}
      </dl>
    </InfoDialogShell>
  );
}
