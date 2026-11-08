import { useCallback, useEffect, useRef, useState } from 'react';
import { SIMULATION_DURATION_MS, SIMULATION_HOURS } from '../map/mapConfig';

export type SimulationStatus = 'idle' | 'playing' | 'paused';

export interface DaySimulation {
  status: SimulationStatus;
  hour: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (hour: number) => void;
}

export function useDaySimulation(): DaySimulation {
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [hour, setHour] = useState(0);
  const hourRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const cancelFrame = useCallback(() => {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const commitHour = useCallback((next: number) => {
    hourRef.current = next;
    setHour(next);
  }, []);

  const play = useCallback(() => {
    cancelFrame();
    const startHour = hourRef.current >= SIMULATION_HOURS ? 0 : hourRef.current;
    const startTime = performance.now();
    commitHour(startHour);
    setStatus('playing');

    const tick = (now: number) => {
      const elapsedHours = ((now - startTime) / SIMULATION_DURATION_MS) * SIMULATION_HOURS;
      const next = Math.min(startHour + elapsedHours, SIMULATION_HOURS);
      commitHour(next);
      if (next >= SIMULATION_HOURS) {
        frameRef.current = null;
        setStatus('paused');
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [cancelFrame, commitHour]);

  const pause = useCallback(() => {
    cancelFrame();
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }, [cancelFrame]);

  const stop = useCallback(() => {
    cancelFrame();
    commitHour(0);
    setStatus('idle');
  }, [cancelFrame, commitHour]);

  const seek = useCallback(
    (target: number) => {
      cancelFrame();
      commitHour(Math.min(Math.max(target, 0), SIMULATION_HOURS));
      setStatus('paused');
    },
    [cancelFrame, commitHour],
  );

  useEffect(() => cancelFrame, [cancelFrame]);

  return { status, hour, play, pause, stop, seek };
}
