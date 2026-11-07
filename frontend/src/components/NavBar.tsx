import type { ReactNode } from 'react';
import { COLORS } from '../theme';

interface NavBarProps {
  filterOpen: boolean;
  heatmapVisible: boolean;
  onToggleFilter: () => void;
  onToggleHeatmap: () => void;
}

export function NavBar({ filterOpen, heatmapVisible, onToggleFilter, onToggleHeatmap }: NavBarProps) {
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
      <Brand />

      <div
        title="Folgt"
        style={{
          flex: 1,
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: COLORS.pageLight,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '8px 12px',
          opacity: 0.6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          disabled
          aria-label="Adresse oder Ort suchen (folgt)"
          placeholder="Adresse oder Ort suchen..."
          style={{ border: 'none', background: 'transparent', fontSize: 12, color: COLORS.text, outline: 'none', width: '100%', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <NavButton pressed={filterOpen} onClick={onToggleFilter} icon={<FilterIcon />}>
          Filter
        </NavButton>
        <NavButton pressed={heatmapVisible} onClick={onToggleHeatmap} icon={<HeatmapIcon />}>
          Heatmap
        </NavButton>
        <NavButton disabled icon={<ExportIcon />}>
          Export
        </NavButton>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingRight: 16,
        borderRight: `1px solid ${COLORS.border}`,
        marginRight: 4,
        flexShrink: 0,
      }}
    >
      <img src="/icon.svg" alt="" height={30} style={{ height: 30, width: 'auto' }} />
      <div style={{ color: COLORS.navy, textTransform: 'uppercase', lineHeight: 1.1 }}>
        <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '2px' }}>Schwamm Score</div>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '1px' }}>Pforzheim</div>
      </div>
    </div>
  );
}

interface NavButtonProps {
  children: ReactNode;
  icon: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function NavButton({ children, icon, pressed, disabled, onClick }: NavButtonProps) {
  const isToggle = pressed !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Folgt' : undefined}
      aria-pressed={isToggle ? pressed : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 11px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: pressed ? 600 : 500,
        fontFamily: 'inherit',
        color: COLORS.text,
        background: pressed ? COLORS.lime : COLORS.white,
        border: `1px solid ${pressed ? COLORS.lime : COLORS.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function HeatmapIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
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
