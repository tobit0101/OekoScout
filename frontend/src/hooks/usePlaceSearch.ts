import { useCallback, useEffect, useRef, useState } from 'react';
import { searchPlaces, type PlaceSuggestion } from '../api/geocoder';

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MIN_LENGTH = 3;

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SearchState {
  status: SearchStatus;
  suggestions: PlaceSuggestion[];
}

const IDLE_STATE: SearchState = { status: 'idle', suggestions: [] };
const LOADING_STATE: SearchState = { status: 'loading', suggestions: [] };

export interface PlaceSearch extends SearchState {
  search: (term: string) => void;
  reset: () => void;
}

export function usePlaceSearch(): PlaceSearch {
  const [state, setState] = useState<SearchState>(IDLE_STATE);
  const timerRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancelPending();
    setState(IDLE_STATE);
  }, [cancelPending]);

  const search = useCallback(
    (term: string) => {
      cancelPending();
      const trimmed = term.trim();
      if (trimmed.length < SEARCH_MIN_LENGTH) {
        setState(IDLE_STATE);
        return;
      }
      setState(LOADING_STATE);
      timerRef.current = window.setTimeout(async () => {
        const controller = new AbortController();
        controllerRef.current = controller;
        try {
          const suggestions = await searchPlaces(trimmed, controller.signal);
          if (controller.signal.aborted) return;
          setState({ status: 'ready', suggestions });
        } catch {
          if (controller.signal.aborted) return;
          setState({ status: 'error', suggestions: [] });
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPending],
  );

  useEffect(() => cancelPending, [cancelPending]);

  return { ...state, search, reset };
}
