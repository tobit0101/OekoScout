import type { CSSProperties } from 'react';
import type { PlaceSuggestion } from '../../api/geocoder';
import type { SearchStatus } from '../../hooks/usePlaceSearch';
import { COLORS } from '../../theme';

interface SuggestionListProps {
  listboxId: string;
  optionId: (index: number) => string;
  status: SearchStatus;
  suggestions: PlaceSuggestion[];
  activeIndex: number;
  onSelect: (suggestion: PlaceSuggestion) => void;
  onHover: (index: number) => void;
}

const MESSAGE_STYLE: CSSProperties = { padding: '10px 14px', fontSize: 12, color: COLORS.textMuted };

export function SuggestionList({ listboxId, optionId, status, suggestions, activeIndex, onSelect, onHover }: SuggestionListProps) {
  const showOptions = status === 'ready' && suggestions.length > 0;
  return (
    <div
      onMouseDown={(event) => event.preventDefault()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        zIndex: 1000,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        boxShadow: '0 6px 24px rgba(0,0,0,.16)',
        overflow: 'hidden',
      }}
    >
      <ul id={listboxId} role="listbox" aria-label="Suchvorschläge" style={{ listStyle: 'none', margin: 0, padding: showOptions ? 4 : 0 }}>
        {showOptions &&
          suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={suggestion.id}
                id={optionId(index)}
                role="option"
                aria-selected={active}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => onHover(index)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active ? COLORS.surface : 'transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, overflowWrap: 'anywhere' }}>{suggestion.primary}</div>
                {suggestion.secondary && (
                  <div style={{ fontSize: 12, color: COLORS.textMuted, overflowWrap: 'anywhere' }}>{suggestion.secondary}</div>
                )}
              </li>
            );
          })}
      </ul>
      {status === 'loading' && (
        <div role="status" style={MESSAGE_STYLE}>
          Suche …
        </div>
      )}
      {status === 'ready' && suggestions.length === 0 && (
        <div role="status" style={MESSAGE_STYLE}>
          Keine Treffer in Pforzheim
        </div>
      )}
      {status === 'error' && (
        <div role="status" style={MESSAGE_STYLE}>
          Suche derzeit nicht verfügbar
        </div>
      )}
      <div style={{ padding: '6px 14px', fontSize: 10, color: COLORS.textMuted, borderTop: `1px solid ${COLORS.border}`, background: COLORS.pageLight }}>
        Suche: Photon · © OpenStreetMap-Mitwirkende
      </div>
    </div>
  );
}
