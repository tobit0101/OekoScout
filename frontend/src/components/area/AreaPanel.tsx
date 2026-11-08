import type { AreaStatsState } from '../../hooks/useAreaSelection';
import { COLORS } from '../../theme';
import type { AreaStatsResponse, RainKey } from '../../types/api';
import type { AreaShape } from '../../types/area';
import { formatArea, formatInteger, formatLiters } from '../../utils/format';
import { useCopyToClipboard, type CopyStatus } from '../popup/useCopyToClipboard';
import { AreaScoreCard } from './AreaScoreCard';
import { buildCopyText, coverageNote } from './areaFormat';
import './area.css';

interface AreaPanelProps {
  shape: AreaShape;
  statsState: AreaStatsState;
  rainKey: RainKey;
  onOpenInfo: () => void;
  onClear: () => void;
}

const COPY_LABEL: Record<CopyStatus, string> = {
  idle: 'Werte kopieren',
  copied: 'Kopiert',
  failed: 'Kopieren fehlgeschlagen',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <dt style={{ color: COLORS.textMuted }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: 'right' }}>{value}</dd>
    </div>
  );
}

function Rows({ stats, rainKey }: { stats: AreaStatsResponse; rainKey: RainKey }) {
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      <Row label="Fläche" value={formatArea(stats.flaeche_m2)} />
      <Row label="Zellen im Rechengebiet" value={formatInteger(stats.zellen)} />
      <Row label="davon mit Score" value={formatInteger(stats.zellen_mit_score)} />
      <Row label={`Rückhalt bei ${rainKey} mm`} value={formatLiters(stats.rueckhalt_liter[rainKey])} />
      <Row label={`Abfluss bei ${rainKey} mm`} value={formatLiters(stats.abfluss_liter[rainKey])} />
    </dl>
  );
}

function Loading() {
  return (
    <div role="status" aria-live="polite">
      <div className="area-skeleton" style={{ height: 70 }} />
      <div className="area-skeleton" />
      <div className="area-skeleton" />
      <div style={{ fontSize: 11, color: COLORS.textMuted }}>Berechne …</div>
    </div>
  );
}

function Notice({ children, role }: { children: string; role?: 'alert' }) {
  return (
    <div role={role} style={{ fontSize: 11, color: COLORS.text, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '6px 8px', marginTop: 8 }}>
      {children}
    </div>
  );
}

export function AreaPanel({ shape, statsState, rainKey, onOpenInfo, onClear }: AreaPanelProps) {
  const { status: copyStatus, copy } = useCopyToClipboard();
  const stats = statsState.status === 'ready' ? statsState.stats : null;
  const note = stats ? coverageNote(stats) : null;

  return (
    <div>
      {statsState.status === 'loading' && <Loading />}
      {statsState.status === 'error' && <Notice role="alert">{statsState.message}</Notice>}
      {stats && (
        <>
          <AreaScoreCard
            score={stats.score_mittel[rainKey]}
            rainKey={rainKey}
            retainedPerSquareMeter={stats.zellen_mit_score > 0 ? stats.rueckhalt_liter[rainKey] / stats.zellen_mit_score : null}
          />
          <Rows stats={stats} rainKey={rainKey} />
          {note && <Notice>{note}</Notice>}
          {stats.zellen > 0 && stats.zellen_mit_score === 0 && <Notice>Keine Zellen mit Score in der Fläche.</Notice>}
        </>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <button
          type="button"
          className="area-button area-button-primary"
          disabled={!stats}
          onClick={() => stats && void copy(buildCopyText(shape, stats, rainKey))}
        >
          {COPY_LABEL[copyStatus]}
        </button>
        <button type="button" className="area-button" aria-haspopup="dialog" onClick={onOpenInfo}>
          Details
        </button>
        <button type="button" className="area-button" onClick={onClear}>
          Fläche löschen
        </button>
      </div>
    </div>
  );
}
