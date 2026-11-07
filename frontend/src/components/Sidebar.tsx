import type { CSSProperties, ReactNode } from 'react';
import { RAIN_STEPS } from '../labels';
import { COLORS, SIDEBAR_WIDTH } from '../theme';
import type { RainKey, ScoreStats } from '../types/api';
import { formatDecimal } from '../utils/format';
import { Legend } from './Legend';

const MIN_SCORE_GAP = 5;
const THUMB_SIZE = 16;

interface SidebarProps {
  scoreMin: number;
  scoreMax: number;
  rainKey: RainKey;
  rainStats: ScoreStats | undefined;
  onScoreMinChange: (value: number) => void;
  onScoreMaxChange: (value: number) => void;
  onRainChange: (value: RainKey) => void;
}

function thumbOffset(percent: number): string {
  return `calc(${THUMB_SIZE / 2}px + (100% - ${THUMB_SIZE}px) * ${percent / 100})`;
}

export function Sidebar(props: SidebarProps) {
  const { scoreMin, scoreMax, rainKey, rainStats, onScoreMinChange, onScoreMaxChange, onRainChange } = props;
  const rainIndex = RAIN_STEPS.indexOf(rainKey);
  const lastIndex = RAIN_STEPS.length - 1;
  const meanRetained = rainStats ? (Number(rainKey) * rainStats.mittel) / 100 : null;

  return (
    <aside
      aria-label="Filter und Legende"
      style={{
        width: SIDEBAR_WIDTH,
        borderRight: `1px solid ${COLORS.border}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: COLORS.surface,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section aria-labelledby="score-filter-title">
          <SectionTitle id="score-filter-title">Score Filter</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12 }}>Rückhalt-Score</span>
            <ValueChip>{scoreMin} – {scoreMax} %</ValueChip>
          </div>

          <div className="dual-range">
            <div className="dual-range-track" />
            <div
              className="dual-range-fill"
              style={{ left: thumbOffset(scoreMin), width: `calc((100% - ${THUMB_SIZE}px) * ${(scoreMax - scoreMin) / 100})` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={scoreMin}
              aria-label="Score von"
              aria-valuetext={`${scoreMin} Prozent`}
              onChange={(event) => onScoreMinChange(Math.min(Number(event.target.value), scoreMax - MIN_SCORE_GAP))}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={scoreMax}
              aria-label="Score bis"
              aria-valuetext={`${scoreMax} Prozent`}
              onChange={(event) => onScoreMaxChange(Math.max(Number(event.target.value), scoreMin + MIN_SCORE_GAP))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
            <span>0 %</span>
            <span>50 %</span>
            <span>100 %</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
            Zellen ohne Score bleiben immer sichtbar (grau).
          </div>
        </section>

        <Separator />

        <section aria-labelledby="rain-title">
          <SectionTitle id="rain-title">Regenfall simulieren</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label htmlFor="rain-range" style={{ fontSize: 12 }}>Niederschlag</label>
            <ValueChip>{rainKey} mm</ValueChip>
          </div>

          <input
            id="rain-range"
            className="step-range"
            type="range"
            min={0}
            max={lastIndex}
            step={1}
            value={rainIndex}
            aria-valuetext={`${rainKey} Millimeter`}
            style={{ '--fill': `${(rainIndex / lastIndex) * 100}%` } as CSSProperties}
            onChange={(event) => onRainChange(RAIN_STEPS[Number(event.target.value)])}
          />
          <div aria-hidden="true" style={{ position: 'relative', height: 16, fontSize: 11, color: COLORS.textMuted }}>
            {RAIN_STEPS.map((step, index) => (
              <span
                key={step}
                style={{ position: 'absolute', left: thumbOffset((index / lastIndex) * 100), transform: 'translateX(-50%)' }}
              >
                {step}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Niederschlag in mm innerhalb 24 h</div>

          {meanRetained !== null && rainStats && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 7,
                padding: '8px 10px',
                background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: 11,
                color: COLORS.navy,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              <span>
                Im Mittel hält 1 m² bei {rainKey} mm ca.{' '}
                <span className="marker" style={{ fontWeight: 700 }}>{formatDecimal(meanRetained)} Liter</span> zurück
                (∅ Score {formatDecimal(rainStats.mittel)} %, nur Zellen mit Score).
              </span>
            </div>
          )}
        </section>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 16 }}>
        <SectionTitle>Heatmap-Legende</SectionTitle>
        <Legend />
      </div>
    </aside>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        margin: '0 0 6px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: COLORS.textMuted,
      }}
    >
      {children}
    </h2>
  );
}

function ValueChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 4,
        padding: '2px 8px',
        color: COLORS.navy,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.white,
      }}
    >
      {children}
    </span>
  );
}

function Separator() {
  return <div style={{ height: 1, background: COLORS.border }} />;
}
