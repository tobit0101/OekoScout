import { LEGEND_TICKS, NO_SCORE_COLOR, SCORE_GRADIENT_CSS, scalePosition } from '../scale';
import { COLORS } from '../theme';

export function Legend() {
  return (
    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
      <div
        role="img"
        aria-label="Farbskala Schwamm Score von rot (11 Prozent) über gelb bis dunkelgrün (85 Prozent)"
        style={{ height: 10, borderRadius: 5, background: SCORE_GRADIENT_CSS, marginBottom: 4 }}
      />
      <div aria-hidden="true" style={{ position: 'relative', height: 14, margin: '0 10px' }}>
        {LEGEND_TICKS.map((tick) => (
          <span
            key={tick}
            style={{
              position: 'absolute',
              left: `${scalePosition(tick)}%`,
              transform: 'translateX(-50%)',
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {tick} %
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: COLORS.text }}>
        <span style={{ width: 14, height: 10, borderRadius: 2, background: NO_SCORE_COLOR, flexShrink: 0 }} />
        <span>Kein Score</span>
      </div>
    </div>
  );
}
