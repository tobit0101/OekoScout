import {
  LEGEND_TICKS,
  NO_SCORE_COLOR,
  NO_SCORE_SIMULATION_CSS,
  SCORE_GRADIENT_CSS,
  SIMULATION_GRADIENT_CSS,
  SIMULATION_LEGEND_TICKS,
  scalePosition,
} from '../scale';
import { COLORS } from '../theme';

interface LegendProps {
  simulationRainMm?: number | null;
}

export function Legend({ simulationRainMm = null }: LegendProps) {
  if (simulationRainMm !== null) return <SimulationLegend rainMm={simulationRainMm} />;
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
      <NoScoreRow />
    </div>
  );
}

function SimulationLegend({ rainMm }: { rainMm: number }) {
  return (
    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, color: COLORS.text }}>
        <span style={{ fontWeight: 600 }}>Im Boden gehalten</span>
        <span style={{ fontSize: 10, color: COLORS.textMuted }}>L/m²</span>
      </div>
      <div
        role="img"
        aria-label={`Farbskala Im Boden gehalten von durchsichtig (0 Liter pro Quadratmeter) über Hellblau bis Dunkelblau (${rainMm} Liter pro Quadratmeter)`}
        style={{ height: 10, borderRadius: 5, background: SIMULATION_GRADIENT_CSS, marginBottom: 4 }}
      />
      <div aria-hidden="true" style={{ position: 'relative', height: 14 }}>
        {SIMULATION_LEGEND_TICKS.map((tick) => (
          <span
            key={tick}
            style={{
              position: 'absolute',
              left: `${tick * 100}%`,
              transform: `translateX(-${tick * 100}%)`,
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(tick * rainMm)}
          </span>
        ))}
      </div>
      <NoScoreRow background={NO_SCORE_SIMULATION_CSS} label="Kein Score: nicht eingefärbt" />
      <div style={{ marginTop: 6, lineHeight: 1.4 }}>Regen gleichmäßig über 24 h verteilt · jeder m² für sich, ohne Zufluss</div>
    </div>
  );
}

function NoScoreRow({ background = NO_SCORE_COLOR, label = 'Kein Score' }: { background?: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: COLORS.text }}>
      <span style={{ width: 14, height: 10, borderRadius: 2, background, flexShrink: 0 }} />
      <span>{label}</span>
    </div>
  );
}
