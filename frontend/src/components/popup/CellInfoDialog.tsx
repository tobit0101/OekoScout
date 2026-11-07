import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CellResponse, RainKey } from '../../types/api';
import { ANNAHME_LABEL, AUSSAGEKRAFT_DISPLAY, BODENGRUPPE_LABEL, KLASSE_LABEL } from '../../labels';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';
import { CardButton } from './CardButton';
import { useCopyToClipboard } from './useCopyToClipboard';

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

const NOTE = 'Bestandsaufnahme · kein Planungswert';

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
    { term: 'Region', text: String(cell.region) },
    { term: 'Zellen-ID', text: cell.id },
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
  return [...rows.map((row) => `${row.term}: ${row.text}`), NOTE].join('\n');
}

export function CellInfoDialog({ cell, lat, lng, rainKey, onClose }: CellInfoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status, copy } = useCopyToClipboard();
  const rows = buildRows({ cell, lat, lng, rainKey });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="cell-info-dialog"
      aria-labelledby="cell-info-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <div className="cell-info-dialog__body">
        <header className="cell-info-dialog__header">
          <h2 id="cell-info-title">Details zur Fläche</h2>
          <span aria-live="polite" className="cell-info-dialog__feedback">
            {status === 'copied' && 'Kopiert'}
            {status === 'failed' && 'Kopieren nicht möglich'}
          </span>
          <CardButton
            label="Alle Angaben kopieren"
            title="Alle Angaben kopieren"
            onClick={() => void copy(buildClipboardText(rows))}
          >
            {status === 'copied' ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="2" />
              </>
            )}
          </CardButton>
          <button
            type="button"
            className="popup-icon-button"
            aria-label="Schließen"
            onClick={onClose}
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            ×
          </button>
        </header>

        <dl className="cell-info-dialog__list">
          {rows.map((row) => (
            <div key={row.term} className="cell-info-dialog__row">
              <dt>{row.term}</dt>
              <dd>{row.content ?? row.text}</dd>
            </div>
          ))}
        </dl>

        <p style={{ margin: '12px 0 0', fontSize: 12, color: COLORS.textMuted }}>{NOTE}</p>
      </div>
    </dialog>,
    document.body,
  );
}
