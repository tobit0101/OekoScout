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
  heading?: string;
  onRemove?: (suggestion: PlaceSuggestion) => void;
}

const MESSAGE_STYLE: CSSProperties = { padding: '10px 14px', fontSize: 12, color: COLORS.textMuted };

export function SuggestionList({ listboxId, optionId, status, suggestions, activeIndex, onSelect, onHover, heading, onRemove }: SuggestionListProps) {
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
      {heading && (
        <div style={{ padding: '8px 14px 0', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: COLORS.textMuted }}>
          {heading}
        </div>
      )}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active ? COLORS.surface : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, overflowWrap: 'anywhere' }}>{suggestion.primary}</div>
                  {suggestion.secondary && (
                    <div style={{ fontSize: 12, color: COLORS.textMuted, overflowWrap: 'anywhere' }}>{suggestion.secondary}</div>
                  )}
                </div>
                {onRemove && (
                  <button
                    type="button"
                    className="popup-icon-button"
                    aria-label="Favorit entfernen"
                    title="Favorit entfernen"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(suggestion);
                    }}
                    style={{ width: 20, height: 20, flexShrink: 0 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
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
      {!heading && (
        <div style={{ padding: '6px 14px', fontSize: 10, color: COLORS.textMuted, borderTop: `1px solid ${COLORS.border}`, background: COLORS.pageLight }}>
          Suche: Photon · © OpenStreetMap-Mitwirkende
        </div>
      )}
    </div>
  );
}
