import { ATTRIBUTION_SCORE } from '../labels';
import { COLORS } from '../theme';

export function addScoreAttribution(map: google.maps.Map): void {
  const element = document.createElement('div');
  element.textContent = ATTRIBUTION_SCORE;
  Object.assign(element.style, {
    background: 'rgba(255,255,255,.8)',
    color: COLORS.textMuted,
    fontSize: '10px',
    padding: '0 6px',
    lineHeight: '14px',
  });
  map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(element);
}

export function removeScoreAttribution(map: google.maps.Map): void {
  map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].clear();
}
