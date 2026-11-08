import { SCORE_GRADIENT_CSS, scalePosition, scoreColor, scoreLabel, scoreTextColor } from '../../scale';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';

interface AreaScoreCardProps {
  score: number | null;
  rainKey: string;
}

export function AreaScoreCard({ score, rainKey }: AreaScoreCardProps) {
  const accent = score === null ? COLORS.border : scoreColor(score);
  const markerLeft = score === null ? 0 : Math.min(100, Math.max(0, scalePosition(score)));

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderTop: `4px solid ${accent}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, color: score === null ? COLORS.textMuted : scoreTextColor(score) }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>
          {score === null ? '—' : formatDecimal(score)}
        </span>
        {score !== null && <span style={{ fontSize: 14, fontWeight: 600 }}>%</span>}
      </div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
        ⌀ Schwamm Score bei {rainKey} mm{score === null ? '' : ` · ${scoreLabel(score)}`}
      </div>
      {score !== null && (
        <div aria-hidden="true" style={{ position: 'relative', height: 6, marginTop: 10, borderRadius: 3, background: SCORE_GRADIENT_CSS }}>
          <div
            style={{
              position: 'absolute',
              top: -3,
              left: `calc(${markerLeft}% - 6px)`,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: COLORS.white,
              border: `2px solid ${COLORS.navy}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
