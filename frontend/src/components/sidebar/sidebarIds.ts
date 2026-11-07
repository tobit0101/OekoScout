export const SIDEBAR_PANEL_ID = 'sidebar-panel';
export const COLLAPSE_BUTTON_ID = 'sidebar-collapse-button';
export const EXPAND_BUTTON_ID = 'sidebar-expand-button';
export const RAIL_WIDTH = 48;

export type SidebarSection = 'score' | 'rain' | 'legend';

export const SECTION_FOCUS_IDS: Record<SidebarSection, string> = {
  score: 'score-min-range',
  rain: 'rain-range',
  legend: 'legend-section',
};
