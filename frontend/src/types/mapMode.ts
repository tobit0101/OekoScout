export type BaseMapMode = 'score' | 'aus';
export type MapMode = BaseMapMode | 'schwamm';

export const MAP_MODE_OPTIONS: ReadonlyArray<{ value: MapMode; label: string }> = [
  { value: 'score', label: 'Score' },
  { value: 'schwamm', label: 'Schwamm' },
  { value: 'aus', label: 'Aus' },
];

export function isMapMode(value: string): value is MapMode {
  return MAP_MODE_OPTIONS.some((option) => option.value === value);
}
