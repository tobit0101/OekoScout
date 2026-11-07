import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode, TransitionEvent } from 'react';
import { RAIN_STEPS } from '../labels';
import { COLORS, SIDEBAR_WIDTH } from '../theme';
import type { RainKey, ScoreStats } from '../types/api';
import { formatDecimal } from '../utils/format';
import type { AreaSelection } from '../hooks/useAreaSelection';
import { AreaPanel } from './area/AreaPanel';
import { Legend } from './Legend';
import { SidebarCollapseButton } from './sidebar/SidebarCollapseButton';
import { SidebarRail } from './sidebar/SidebarRail';
import {
  COLLAPSE_BUTTON_ID,
  EXPAND_BUTTON_ID,
  RAIL_WIDTH,
  SECTION_FOCUS_IDS,
  SIDEBAR_PANEL_ID,
  type SidebarSection,
} from './sidebar/sidebarIds';
import './sidebar/sidebar.css';

const MIN_SCORE_GAP = 5;
const THUMB_SIZE = 16;

interface SidebarProps {
  scoreMin: number;
  scoreMax: number;
  rainKey: RainKey;
  rainStats: ScoreStats | undefined;
  collapsed: boolean;
  compact: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onScoreMinChange: (value: number) => void;
  onScoreMaxChange: (value: number) => void;
  onRainChange: (value: RainKey) => void;
  area?: AreaSelection;
}

function thumbOffset(percent: number): string {
  return `calc(${THUMB_SIZE / 2}px + (100% - ${THUMB_SIZE}px) * ${percent / 100})`;
}

const THEME_VARIABLES = {
  '--sb-surface': COLORS.surface,
  '--sb-border': COLORS.border,
  '--sb-hover': COLORS.surfaceAlt,
  '--sb-text': COLORS.navy,
  '--sb-focus': COLORS.navy,
} as CSSProperties;

function dispatchMapResize(): void {
  window.dispatchEvent(new Event('resize'));
}

export function Sidebar(props: SidebarProps) {
  const { scoreMin, scoreMax, rainKey, rainStats, collapsed, compact, onScoreMinChange, onScoreMaxChange, onRainChange, onCollapsedChange, area } = props;
  const rainIndex = RAIN_STEPS.indexOf(rainKey);
  const lastIndex = RAIN_STEPS.length - 1;
  const meanRetained = rainStats ? (Number(rainKey) * rainStats.mittel) / 100 : null;
  const pendingFocusId = useRef<string | null>(null);
  const isFirstRender = useRef(true);
  const isOverlay = compact && !collapsed;
  const asideWidth = collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH;
  const slotWidth = collapsed || compact ? RAIL_WIDTH : SIDEBAR_WIDTH;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) dispatchMapResize();
  }, [collapsed, compact]);

  useEffect(() => {
    const targetId = pendingFocusId.current;
    if (!targetId) return;
    pendingFocusId.current = null;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.focus();
    target.scrollIntoView({ block: 'nearest' });
  }, [collapsed]);

  const collapse = () => {
    pendingFocusId.current = EXPAND_BUTTON_ID;
    onCollapsedChange(true);
  };

  const expand = (section?: SidebarSection) => {
    pendingFocusId.current = section ? SECTION_FOCUS_IDS[section] : COLLAPSE_BUTTON_ID;
    onCollapsedChange(false);
  };

  const handleTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'width') return;
    dispatchMapResize();
  };

  return (
    <div className="sidebar-slot" style={{ width: slotWidth }}>
    <aside
      aria-label="Filter und Legende"
      className="sidebar"
      data-overlay={isOverlay}
      style={{ ...THEME_VARIABLES, width: asideWidth, zIndex: isOverlay ? 1100 : 1 }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="sidebar-layer" data-hidden={!collapsed} inert={!collapsed} aria-hidden={!collapsed}>
        <SidebarRail onExpand={expand} />
      </div>
      <div
        id={SIDEBAR_PANEL_ID}
        className="sidebar-layer"
        data-hidden={collapsed}
        inert={collapsed}
        aria-hidden={collapsed}
        style={{ width: SIDEBAR_WIDTH - 1 }}
      >
        <SidebarCollapseButton onCollapse={collapse} />
        <div className="sidebar-scroll">
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
              id={SECTION_FOCUS_IDS.score}
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
            <label htmlFor={SECTION_FOCUS_IDS.rain}style={{ fontSize: 12 }}>Niederschlag</label>
            <ValueChip>{rainKey} mm</ValueChip>
          </div>

          <input
            id={SECTION_FOCUS_IDS.rain}
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

        {area?.shape && (
          <>
            <Separator />
            <section aria-labelledby="area-title">
              <SectionTitle id="area-title">Markierte Fläche</SectionTitle>
              <AreaPanel shape={area.shape} statsState={area.statsState} rainKey={rainKey} onClear={area.clear} />
            </section>
          </>
        )}
      </div>

      <div
        id={SECTION_FOCUS_IDS.legend}
        tabIndex={-1}
        className="sidebar-focus-target"
        style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 16 }}
      >
        <SectionTitle>Heatmap-Legende</SectionTitle>
        <Legend />
      </div>
        </div>
      </div>
    </aside>
    </div>
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
