import type { CSSProperties, ReactNode } from 'react';
import type { DaySimulation } from '../hooks/useDaySimulation';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { SIMULATION_HOURS } from '../map/mapConfig';
import { COLORS } from '../theme';
import type { RainKey } from '../types/api';
import { formatSimulationReadout } from '../utils/simulationFormat';
import { PlaceSearch, type SelectedPlace } from './search/PlaceSearch';

const COMPACT_QUERY = '(max-width: 767px)';
const SIMULATION_SLIDER_STEP = 0.5;

interface NavBarProps {
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  simulation: DaySimulation;
  rainKey: RainKey;
  onSelectPlace: (place: SelectedPlace) => void;
}

export function NavBar({ heatmapVisible, onToggleHeatmap, simulation, rainKey, onSelectPlace }: NavBarProps) {
  const compact = useMediaQuery(COMPACT_QUERY);
  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        height: 52,
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 10,
        padding: compact ? '0 10px' : '0 16px',
        borderBottom: `3px solid ${COLORS.primary}`,
        background: COLORS.white,
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <Brand compact={compact} />

      <PlaceSearch onSelect={onSelectPlace} />

      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 12, marginLeft: 'auto', flexShrink: 0 }}>
        <SimulationControl simulation={simulation} rainKey={rainKey} compact={compact} />
        <HeatmapSwitch checked={heatmapVisible} onToggle={onToggleHeatmap} compact={compact} />
        <NavButton disabled icon={<ExportIcon />} compact={compact}>
          Export
        </NavButton>
      </div>
    </nav>
  );
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingRight: compact ? 0 : 16,
        borderRight: compact ? 'none' : `1px solid ${COLORS.border}`,
        marginRight: compact ? 0 : 4,
        flexShrink: 0,
      }}
    >
      <img src="/icon.svg" alt="" height={30} style={{ height: 30, width: 'auto' }} />
      {!compact && (
        <div style={{ color: COLORS.navy, textTransform: 'uppercase', lineHeight: 1.1 }}>
          <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '2px' }}>Schwamm Score</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '1px' }}>Pforzheim</div>
        </div>
      )}
    </div>
  );
}

interface SimulationControlProps {
  simulation: DaySimulation;
  rainKey: RainKey;
  compact: boolean;
}

function playLabel(simulation: DaySimulation): string {
  if (simulation.status === 'playing') return 'Simulation pausieren';
  if (simulation.status === 'idle') return 'Tagessimulation starten';
  if (simulation.hour >= SIMULATION_HOURS) return 'Simulation erneut abspielen';
  return 'Simulation fortsetzen';
}

function SimulationControl({ simulation, rainKey, compact }: SimulationControlProps) {
  const { status, hour, play, pause, stop, seek } = simulation;
  const playing = status === 'playing';
  const label = playLabel(simulation);
  const readout = formatSimulationReadout(hour, Number(rainKey));
  return (
    <div role="group" aria-label="Tagessimulation" style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6 }}>
      <SimulationButton label={label} onClick={playing ? pause : play}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </SimulationButton>
      <SimulationButton label="Simulation beenden" disabled={status === 'idle'} onClick={stop}>
        <StopIcon />
      </SimulationButton>
      <input
        type="range"
        className="step-range"
        min={0}
        max={SIMULATION_HOURS}
        step={SIMULATION_SLIDER_STEP}
        value={hour}
        aria-label="Tageszeit der Simulation"
        aria-valuetext={`${readout} Regen`}
        title="Tageszeit einstellen"
        style={{ width: compact ? 64 : 120, '--fill': `${(hour / SIMULATION_HOURS) * 100}%` } as CSSProperties}
        onChange={(event) => seek(Number(event.target.value))}
      />
      {!compact && (
        <span
          title="Tageszeit und bis dahin gefallener Regen"
          style={{ minWidth: 112, fontSize: 12, fontWeight: 500, color: COLORS.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {readout}
        </span>
      )}
    </div>
  );
}

interface SimulationButtonProps {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function SimulationButton({ label, children, onClick, disabled }: SimulationButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 6,
        color: COLORS.navy,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4l14 8-14 8z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

interface HeatmapSwitchProps {
  checked: boolean;
  onToggle: () => void;
  compact: boolean;
}

function HeatmapSwitch({ checked, onToggle, compact }: HeatmapSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? 'Heatmap' : undefined}
      title={compact ? 'Heatmap' : undefined}
      onClick={onToggle}
      className="heatmap-switch"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 2px',
        border: 'none',
        background: 'transparent',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 500,
        color: COLORS.text,
        cursor: 'pointer',
      }}
    >
      {!compact && 'Heatmap'}
      <span className="heatmap-switch__track" aria-hidden="true">
        <span className="heatmap-switch__knob" />
      </span>
    </button>
  );
}

interface NavButtonProps {
  children: string;
  icon: ReactNode;
  compact: boolean;
  disabled?: boolean;
}

function NavButton({ children, icon, compact, disabled }: NavButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? 'Folgt' : undefined}
      aria-label={compact ? children : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 11px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'inherit',
        color: COLORS.text,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon}
      {!compact && children}
    </button>
  );
}

function ExportIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
