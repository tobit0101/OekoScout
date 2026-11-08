import { SIMULATION_HOURS } from '../map/mapConfig';

const MINUTES_PER_HOUR = 60;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatClock(hour: number): string {
  const totalMinutes = Math.round(hour * MINUTES_PER_HOUR);
  return `${pad(Math.floor(totalMinutes / MINUTES_PER_HOUR))}:${pad(totalMinutes % MINUTES_PER_HOUR)}`;
}

export function cumulativeRainMm(hour: number, dayTotalMm: number): number {
  return Math.round((hour / SIMULATION_HOURS) * dayTotalMm);
}

export function formatSimulationReadout(hour: number, dayTotalMm: number): string {
  return `${formatClock(hour)} · ${cumulativeRainMm(hour, dayTotalMm)} / ${dayTotalMm} mm`;
}
