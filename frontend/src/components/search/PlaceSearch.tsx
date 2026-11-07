import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { PlaceSuggestion } from '../../api/geocoder';
import { SEARCH_MIN_LENGTH, usePlaceSearch } from '../../hooks/usePlaceSearch';
import { COLORS } from '../../theme';
import { SuggestionList } from './SuggestionList';

export interface SelectedPlace {
  lat: number;
  lng: number;
  label: string;
}

interface PlaceSearchProps {
  onSelect: (place: SelectedPlace) => void;
}

export function PlaceSearch({ onSelect }: PlaceSearchProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { status, suggestions, search, reset } = usePlaceSearch();

  const listVisible = open && status !== 'idle';
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const activeDescendant = listVisible && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    setOpen(true);
    setActiveIndex(-1);
    if (next.trim().length < SEARCH_MIN_LENGTH) {
      reset();
      return;
    }
    search(next);
  };

  const clear = () => {
    setValue('');
    setOpen(false);
    setActiveIndex(-1);
    reset();
  };

  const select = (suggestion: PlaceSuggestion) => {
    setValue(suggestion.primary);
    setOpen(false);
    setActiveIndex(-1);
    reset();
    onSelect({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.primary });
  };

  const moveActive = (step: number) => {
    if (suggestions.length === 0) return;
    setOpen(true);
    const lastIndex = suggestions.length - 1;
    setActiveIndex((current) => {
      if (step > 0) return current >= lastIndex ? 0 : current + 1;
      return current <= 0 ? lastIndex : current - 1;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === 'Enter') {
      if (!listVisible || suggestions.length === 0) return;
      event.preventDefault();
      select(suggestions[activeIndex >= 0 ? activeIndex : 0]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (listVisible) setOpen(false);
      else clear();
      return;
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 400, minWidth: 0 }}>
      <div
        className="place-search-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: COLORS.pageLight,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '8px 12px',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2.5" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Adresse suchen"
          aria-expanded={listVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          spellCheck={false}
          placeholder="Adresse oder Ort in Pforzheim suchen …"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          style={{ border: 'none', background: 'transparent', fontSize: 12, color: COLORS.text, outline: 'none', width: '100%', minWidth: 0, fontFamily: 'inherit' }}
        />
        {value && (
          <button
            type="button"
            className="popup-icon-button"
            aria-label="Suche leeren"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {listVisible && (
        <SuggestionList
          listboxId={listboxId}
          optionId={optionId}
          status={status}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onSelect={select}
          onHover={setActiveIndex}
        />
      )}
    </div>
  );
}
