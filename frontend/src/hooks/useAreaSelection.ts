import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaInputError, fetchAreaStats } from '../api/client';
import type { AreaStatsResponse } from '../types/api';
import type { AreaShape, AreaTool, DrawDraft } from '../types/area';

export type AreaStatsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; stats: AreaStatsResponse }
  | { status: 'error'; message: string };

export interface AreaSelection {
  tool: AreaTool;
  draft: DrawDraft | null;
  shape: AreaShape | null;
  statsState: AreaStatsState;
  clearNonce: number;
  finishNonce: number;
  setTool: (tool: AreaTool) => void;
  clear: () => void;
  handleDraftChange: (draft: DrawDraft | null) => void;
  handleShapeChange: (shape: AreaShape, finished: boolean) => void;
  handleToolEnd: () => void;
}

const UNAVAILABLE_MESSAGE = 'Auswertung derzeit nicht verfügbar';
const IDLE: AreaStatsState = { status: 'idle' };
const LOADING: AreaStatsState = { status: 'loading' };

export function useAreaSelection(): AreaSelection {
  const [tool, setTool] = useState<AreaTool>('select');
  const [draft, setDraft] = useState<DrawDraft | null>(null);
  const [shape, setShape] = useState<AreaShape | null>(null);
  const [statsState, setStatsState] = useState<AreaStatsState>(IDLE);
  const [clearNonce, setClearNonce] = useState(0);
  const [finishNonce, setFinishNonce] = useState(0);

  useEffect(() => {
    if (!shape) return;
    const controller = new AbortController();
    fetchAreaStats(shape.geometry, controller.signal)
      .then((stats) => setStatsState({ status: 'ready', stats }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof AreaInputError ? error.message : UNAVAILABLE_MESSAGE;
        setStatsState({ status: 'error', message });
      });
    return () => controller.abort();
  }, [shape]);

  const clear = useCallback(() => {
    setShape(null);
    setStatsState(IDLE);
    setDraft(null);
    setTool('select');
    setClearNonce((nonce) => nonce + 1);
  }, []);

  const handleShapeChange = useCallback((next: AreaShape, finished: boolean) => {
    setShape(next);
    setStatsState(LOADING);
    if (finished) setFinishNonce((nonce) => nonce + 1);
  }, []);

  const handleToolEnd = useCallback(() => setTool('select'), []);

  return useMemo(
    () => ({
      tool,
      draft,
      shape,
      statsState,
      clearNonce,
      finishNonce,
      setTool,
      clear,
      handleDraftChange: setDraft,
      handleShapeChange,
      handleToolEnd,
    }),
    [tool, draft, shape, statsState, clearNonce, finishNonce, clear, handleShapeChange, handleToolEnd],
  );
}
