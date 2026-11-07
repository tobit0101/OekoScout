import { formatArea } from '../utils/format';
import type { LatLngPoint } from '../types/area';

function createSpan(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

export class AreaLabel {
  private readonly overlay = new google.maps.OverlayView();
  private readonly root = document.createElement('div');
  private readonly areaText = createSpan('area-label-area', '');
  private readonly scoreText = createSpan('area-label-score', '…');
  private position: LatLngPoint | null = null;

  constructor(private readonly map: google.maps.Map) {
    this.root.className = 'area-label';
    this.root.setAttribute('aria-hidden', 'true');
    const row = document.createElement('div');
    row.className = 'area-label-row';
    row.append(this.areaText, createSpan('area-label-separator', '|'), this.scoreText);
    this.root.append(createSpan('area-label-title', 'Markierte Fläche'), row);

    this.overlay.onAdd = () => this.overlay.getPanes()?.markerLayer.appendChild(this.root);
    this.overlay.onRemove = () => this.root.remove();
    this.overlay.draw = () => this.place();
  }

  show(position: LatLngPoint, areaM2: number): void {
    this.position = position;
    this.areaText.textContent = formatArea(areaM2);
    this.overlay.setMap(this.map);
    this.place();
  }

  update(position: LatLngPoint, areaM2: number): void {
    this.position = position;
    this.areaText.textContent = formatArea(areaM2);
    this.place();
  }

  setScoreText(text: string): void {
    this.scoreText.textContent = text;
  }

  setArea(areaM2: number): void {
    this.areaText.textContent = formatArea(areaM2);
  }

  hide(): void {
    this.overlay.setMap(null);
    this.position = null;
  }

  private place(): void {
    const projection = this.overlay.getProjection();
    if (!projection || !this.position) return;
    const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(this.position));
    if (!pixel) return;
    this.root.style.left = `${pixel.x}px`;
    this.root.style.top = `${pixel.y}px`;
  }
}
