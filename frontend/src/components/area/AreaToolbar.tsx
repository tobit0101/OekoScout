import type { ReactNode } from 'react';
import type { AreaTool } from '../../types/area';

interface AreaToolbarProps {
  tool: AreaTool;
  hasShape: boolean;
  onToolChange: (tool: AreaTool) => void;
  onClear: () => void;
}

interface ToolDefinition {
  tool: AreaTool;
  label: string;
  icon: ReactNode;
}

const TOOLS: readonly ToolDefinition[] = [
  { tool: 'select', label: 'Auswahl', icon: <polygon points="3 11 22 2 13 21 11 13 3 11" /> },
  {
    tool: 'polygon',
    label: 'Polygon',
    icon: <polygon points="12 3 21 9 18 20 6 20 3 9" />,
  },
  {
    tool: 'circle',
    label: 'Kreis',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  { tool: 'rectangle', label: 'Rechteck', icon: <rect x="3" y="5" width="18" height="14" rx="1" /> },
];

function ToolIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function AreaToolbar({ tool, hasShape, onToolChange, onClear }: AreaToolbarProps) {
  return (
    <div className="area-toolbar" role="toolbar" aria-label="Flächenwerkzeuge">
      {TOOLS.map((definition) => (
        <button
          key={definition.tool}
          type="button"
          className="area-tool"
          aria-pressed={tool === definition.tool}
          onClick={() => onToolChange(definition.tool)}
        >
          <ToolIcon>{definition.icon}</ToolIcon>
          {definition.label}
        </button>
      ))}
      <span className="area-toolbar-divider" aria-hidden="true" />
      <button type="button" className="area-tool area-tool-danger" disabled={!hasShape} onClick={onClear}>
        <ToolIcon>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
        </ToolIcon>
        Löschen
      </button>
    </div>
  );
}
