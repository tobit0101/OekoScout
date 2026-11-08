import type { ReactNode } from 'react';
import { COLORS } from '../../theme';
import { EXPAND_BUTTON_ID, RAIL_WIDTH, SIDEBAR_PANEL_ID, type SidebarSection } from './sidebarIds';

interface SidebarRailProps {
  onExpand: (section?: SidebarSection) => void;
}

const SECTION_BUTTONS: ReadonlyArray<{
  section: SidebarSection;
  title: string;
  icon: ReactNode;
}> = [
    {
      section: 'score',
      title: 'Score Filter',
      icon: <ScoreIcon />,
    },
    {
      section: 'rain',
      title: 'Regenfall simulieren',
      icon: <RainIcon />,
    },
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
        gap: 6,
        padding: '8px 0',
      }}
    >
      <button
        type="button"
        id={EXPAND_BUTTON_ID}
        className="sidebar-icon-button"
        aria-label="Seitenleiste ausklappen"
        aria-expanded={false}
        aria-controls={SIDEBAR_PANEL_ID}
        onClick={() => onExpand()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div style={{ width: 24, height: 1, background: COLORS.border, margin: '2px 0' }} />

        {
          SECTION_BUTTONS.map(({ section, title, icon }) => (
            <div key={section} className="rail-item">
              <button
                type="button"
                className="sidebar-icon-button"
                aria-label={title}
                aria-controls={SIDEBAR_PANEL_ID}
                onClick={() => onExpand(section)}
              >
                {icon}
              </button>
              <div className="rail-tooltip" role="tooltip">
                <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
              </div>
            </div>
          ))
        }
    </div>
  );
}

export function IconFrame({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function ScoreIcon({ size = 16 }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18" r="2" fill="currentColor" />
    </IconFrame>
  );
}

export function RainIcon({ size = 16 }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </IconFrame>
  );
}

export function LegendIcon({ size = 16 }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <rect x="3" y="5" width="18" height="5" rx="2.5" />
      <line x1="5" y1="15" x2="19" y2="15" />
      <line x1="5" y1="19" x2="13" y2="19" />
    </IconFrame>
  );
}
