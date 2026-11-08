import type { ReactNode } from 'react';
import type { StatsState } from '../hooks/useStats';
import { COLORS } from '../theme';
import type { RainKey } from '../types/api';
import { formatDecimal } from '../utils/format';

interface InfoBarProps {
  statsState: StatsState;
  rainKey: RainKey;
}

export function InfoBar({ statsState, rainKey }: InfoBarProps) {
  return (
    <footer
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.pageLight,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 16px',
        fontSize: 12,
        color: COLORS.textMuted,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.primary, flexShrink: 0 }} />
      <StatsContent statsState={statsState} rainKey={rainKey} />
    </footer>
  );
}

function StatsContent({ statsState, rainKey }: InfoBarProps) {
  if (statsState.status === 'loading') return <span>Lade Statistiken …</span>;
  if (statsState.status === 'error') return <span>Statistik nicht verfügbar</span>;

  const { stats } = statsState;
  const rainStats = stats.score_je_regenmenge[`${rainKey}mm`];

  return (
    <>
      <span>
        ∅ Score: <strong style={{ color: COLORS.navy }}>{rainStats ? `${formatDecimal(rainStats.mittel)} %` : '—'}</strong> bei {rainKey} mm
      </span>
      <Separator />
      <span>
        Score-Spanne:{' '}
        <strong style={{ color: COLORS.text }}>
          {rainStats ? `${formatDecimal(rainStats.min)} – ${formatDecimal(rainStats.max)} %` : '—'}
        </strong>
      </span>
    </>
  );
}

function Separator(): ReactNode {
  return <div aria-hidden="true" style={{ width: 1, height: 16, background: COLORS.border }} />;
}
