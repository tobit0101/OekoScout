import { COLORS } from '../../theme';
import type { LatLngPoint } from '../../types/area';

const DASH_REPEAT = '10px';

export function createPreviewFill(map: google.maps.Map): google.maps.Polygon {
  return new google.maps.Polygon({
    map,
    clickable: false,
    strokeOpacity: 0,
    strokeWeight: 0,
    fillColor: COLORS.primary,
    fillOpacity: 0.18,
  });
}

export function createDashedLine(map: google.maps.Map): google.maps.Polyline {
  return new google.maps.Polyline({
    map,
    clickable: false,
    strokeOpacity: 0,
    icons: [
      {
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: COLORS.navy, strokeWeight: 2, scale: 3 },
        offset: '0',
        repeat: DASH_REPEAT,
      },
    ],
  });
}

export function createVertexMarker(map: google.maps.Map, position: LatLngPoint, isAnchor: boolean): google.maps.Marker {
  return new google.maps.Marker({
    map,
    position,
    clickable: false,
    optimized: true,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: isAnchor ? 7 : 5,
      fillColor: COLORS.white,
      fillOpacity: 1,
      strokeColor: COLORS.navy,
      strokeWeight: 2.5,
    },
  });
}
