import { COLLAPSE_BUTTON_ID, SIDEBAR_PANEL_ID } from './sidebarIds';

interface SidebarCollapseButtonProps {
  onCollapse: () => void;
}

export function SidebarCollapseButton({ onCollapse }: SidebarCollapseButtonProps) {
  return (
    <button
      type="button"
      id={COLLAPSE_BUTTON_ID}
      className="sidebar-icon-button"
      aria-label="Seitenleiste einklappen"
      title="Seitenleiste einklappen"
      aria-expanded={true}
      aria-controls={SIDEBAR_PANEL_ID}
      onClick={onCollapse}
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
