import { useEffect, useState } from 'react';
import { fetchStats } from '../api/client';
import type { StatsResponse } from '../types/api';

export type StatsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; stats: StatsResponse };

export function useStats(): StatsState {
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchStats()
      .then((stats) => {
        if (!cancelled) setState({ status: 'ready', stats });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
