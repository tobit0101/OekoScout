import type { ReactNode } from 'react';
import { COLORS } from '../../theme';
import { EXPAND_BUTTON_ID, RAIL_WIDTH, SIDEBAR_PANEL_ID, type SidebarSection } from './sidebarIds';

interface SidebarRailProps {
  onExpand: (section?: SidebarSection) => void;
}

const SECTION_BUTTONS: ReadonlyArray<{ section: SidebarSection; label: string; icon: ReactNode }> = [
  { section: 'score', label: 'Score Filter', icon: <ScoreIcon /> },
  { section: 'rain', label: 'Regenfall simulieren', icon: <RainIcon /> },
  { section: 'legend', label: 'Heatmap-Legende', icon: <LegendIcon /> },
];

export function SidebarRail({ onExpand }: SidebarRailProps) {
  return (
    <div
      style={{
        width: RAIL_WIDTH - 1,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 0',
      }}
    >
      <button
        type="button"
        id={EXPAND_BUTTON_ID}
        className="sidebar-icon-button"
        aria-label="Seitenleiste ausklappen"
        title="Seitenleiste ausklappen"
        aria-expanded={false}
        aria-controls={SIDEBAR_PANEL_ID}
        onClick={() => onExpand()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div style={{ width: 24, height: 1, background: COLORS.border, margin: '4px 0' }} />
      {SECTION_BUTTONS.map(({ section, label, icon }) => (
        <button
          key={section}
          type="button"
          className="sidebar-icon-button"
          aria-label={label}
          title={label}
          aria-controls={SIDEBAR_PANEL_ID}
          onClick={() => onExpand(section)}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function ScoreIcon() {
  return (
    <IconFrame>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18" r="2" fill="currentColor" />
    </IconFrame>
  );
}

function RainIcon() {
  return (
    <IconFrame>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </IconFrame>
  );
}

function LegendIcon() {
  return (
    <IconFrame>
      <rect x="3" y="5" width="18" height="5" rx="2.5" />
      <line x1="5" y1="15" x2="19" y2="15" />
      <line x1="5" y1="19" x2="13" y2="19" />
    </IconFrame>
  );
}
