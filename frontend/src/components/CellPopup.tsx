import type { CSSProperties } from 'react';
import type { CellResponse, RainKey } from '../types/api';
import { ANNAHME_LABEL, AUSSAGEKRAFT_DISPLAY, BODENGRUPPE_LABEL, KLASSE_LABEL } from '../labels';
import { NO_SCORE_COLOR, scoreColor, scoreLabel } from '../scale';
import { COLORS } from '../theme';
import { formatDecimal } from '../utils/format';

export type PopupState =
  | { kind: 'loading' }
  | { kind: 'cell'; cell: CellResponse }
  | { kind: 'outside' }
  | { kind: 'error' };

interface CellPopupProps {
  state: PopupState;
  rainKey: RainKey;
}

const WIDTH = 236;

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: COLORS.textMuted,
};

export function CellPopup({ state, rainKey }: CellPopupProps) {
  if (state.kind === 'loading') return <Message text="Lade Zelldaten …" />;
  if (state.kind === 'outside') return <Message text="Kein Wert – außerhalb des Rechengebiets" />;
  if (state.kind === 'error') return <Message text="Daten derzeit nicht verfügbar" />;
  return <CellDetails cell={state.cell} rainKey={rainKey} />;
}

function Message({ text }: { text: string }) {
  return (
    <div role="status" style={{ width: WIDTH, padding: '14px 16px', fontSize: 12, color: COLORS.text }}>
      {text}
    </div>
  );
}

function CellDetails({ cell, rainKey }: { cell: CellResponse; rainKey: RainKey }) {
  const score = cell.score_prozent[rainKey];
  const runoff = cell.abfluss_mm[rainKey];
  const aussagekraft = AUSSAGEKRAFT_DISPLAY[cell.aussagekraft];
  const hasScore = score !== null && runoff !== null;
  const retainedLitres = hasScore ? Number(rainKey) - runoff : null;
  const noScoreReason =
    cell.aussagekraft === 'WIDERSPRUCH' ? 'Widerspruch zwischen den Quellen' : 'Nicht berechnet (Fließgewässer)';

  return (
    <div style={{ width: WIDTH, fontSize: 11, color: COLORS.text, lineHeight: 1.45 }}>
      <div style={{ padding: '12px 14px 10px', background: COLORS.white }}>
        <div style={labelStyle}>Schwamm Score · {rainKey} mm</div>
        {hasScore ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.1, color: COLORS.navy }}>
                {formatDecimal(score)} %
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{scoreLabel(score)}</span>
            </div>
            <div
              role="img"
              aria-label={`Rückhalt ${formatDecimal(score)} Prozent`}
              style={{ height: 6, borderRadius: 3, background: COLORS.border, marginTop: 4 }}
            >
              <div
                style={{
                  width: `${Math.min(Math.max(score, 0), 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: scoreColor(score),
                }}
              />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: NO_SCORE_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy }}>Kein Score</span>
          </div>
        )}
        {!hasScore && <div style={{ marginTop: 2 }}>{noScoreReason}</div>}
      </div>

      {retainedLitres !== null && runoff !== null && (
        <div style={{ padding: '8px 14px', background: COLORS.surface }}>
          <div>
            Hält bei {rainKey} mm: <span className="marker" style={{ fontWeight: 700 }}>{formatDecimal(retainedLitres)} Liter</span> je m²
          </div>
          <div style={{ color: COLORS.textMuted }}>Abfluss: {formatDecimal(runoff)} Liter je m²</div>
        </div>
      )}

      <div style={{ padding: '10px 14px 12px', background: COLORS.white }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 6 }}>
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: '50%', background: aussagekraft.color, flexShrink: 0 }}
          />
          <span>Aussagekraft: {aussagekraft.label}</span>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 1 }}>
          <Fact term="Fläche" value={KLASSE_LABEL[cell.klasse] ?? cell.klasse} />
          <Fact term="Boden" value={BODENGRUPPE_LABEL[cell.bodengruppe] ?? cell.bodengruppe} />
          <Fact term="Neigung" value={`${formatDecimal(cell.neigung_prozent)} %`} />
        </dl>
        {cell.annahmen.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: COLORS.textMuted }}>
            {cell.annahmen.map((annahme) => (
              <li key={annahme}>{ANNAHME_LABEL[annahme] ?? annahme}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <>
      <dt style={{ color: COLORS.textMuted }}>{term}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
}
