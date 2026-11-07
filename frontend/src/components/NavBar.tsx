import type { ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { COLORS } from '../theme';
import { PlaceSearch, type SelectedPlace } from './search/PlaceSearch';

const COMPACT_QUERY = '(max-width: 767px)';

interface NavBarProps {
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  onSelectPlace: (place: SelectedPlace) => void;
}

export function NavBar({ heatmapVisible, onToggleHeatmap, onSelectPlace }: NavBarProps) {
  const compact = useMediaQuery(COMPACT_QUERY);
  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        height: 52,
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        borderBottom: `3px solid ${COLORS.primary}`,
        background: COLORS.white,
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <Brand compact={compact} />

      <PlaceSearch onSelect={onSelectPlace} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
        <HeatmapSwitch checked={heatmapVisible} onToggle={onToggleHeatmap} />
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

interface HeatmapSwitchProps {
  checked: boolean;
  onToggle: () => void;
}

function HeatmapSwitch({ checked, onToggle }: HeatmapSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
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
      Heatmap
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
