import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SIMULATION_DEFAULT_DURATION_S,
  SIMULATION_HOURS,
  SIMULATION_MAX_DURATION_S,
  SIMULATION_MIN_DURATION_S,
} from '../map/mapConfig';

export type SimulationStatus = 'idle' | 'playing' | 'paused';

export interface DaySimulation {
  status: SimulationStatus;
  hour: number;
  durationSeconds: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (hour: number) => void;
  setDurationSeconds: (seconds: number) => void;
}

export function clampDurationSeconds(seconds: number): number {
  return Math.min(Math.max(Math.round(seconds), SIMULATION_MIN_DURATION_S), SIMULATION_MAX_DURATION_S);
}

export function useDaySimulation(): DaySimulation {
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [hour, setHour] = useState(0);
  const [durationSeconds, setDurationState] = useState(SIMULATION_DEFAULT_DURATION_S);
  const hourRef = useRef(0);
  const durationRef = useRef(SIMULATION_DEFAULT_DURATION_S);
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
    let previousTime = performance.now();
    commitHour(startHour);
    setStatus('playing');

    // Advances incrementally so a duration change takes effect mid-run without a jump.
    const tick = (now: number) => {
      const elapsedHours = ((now - previousTime) / (durationRef.current * 1000)) * SIMULATION_HOURS;
      previousTime = now;
      const next = Math.min(hourRef.current + elapsedHours, SIMULATION_HOURS);
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

  const setDurationSeconds = useCallback((seconds: number) => {
    const next = clampDurationSeconds(seconds);
    durationRef.current = next;
    setDurationState(next);
  }, []);

  useEffect(() => cancelFrame, [cancelFrame]);

  return { status, hour, durationSeconds, play, pause, stop, seek, setDurationSeconds };
}
