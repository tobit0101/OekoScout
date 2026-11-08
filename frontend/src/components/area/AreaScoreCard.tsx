import { SCORE_GRADIENT_CSS, scalePosition, scoreColor, scoreLabel, scoreTextColor } from '../../scale';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';
import { WaterDrop } from '../popup/WaterDrop';

interface AreaScoreCardProps {
  score: number | null;
  rainKey: string;
  retainedPerSquareMeter: number | null;
}

export function AreaScoreCard({ score, rainKey, retainedPerSquareMeter }: AreaScoreCardProps) {
  const accent = score === null ? COLORS.border : scoreColor(score);
  const markerLeft = score === null ? 0 : Math.min(100, Math.max(0, scalePosition(score)));

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderTop: `4px solid ${accent}`,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <div style={{ padding: '10px 12px' }}>
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
      {retainedPerSquareMeter !== null && (
        <>
          <div style={{ height: 1, background: COLORS.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, lineHeight: 1.45, color: COLORS.text }}>
            <p style={{ margin: 0, flex: 1 }}>
              Bei einem Regenfall von <strong style={{ color: COLORS.cyanText }}>{rainKey} mm</strong> in 24h hält diese Fläche:
            </p>
            <WaterDrop litres={retainedPerSquareMeter} valueSuffix="L" unit="je m²" />
          </div>
        </>
      )}
    </div>
  );
}
