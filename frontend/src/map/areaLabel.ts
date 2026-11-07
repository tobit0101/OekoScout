import { formatArea } from '../utils/format';
import type { LatLngPoint } from '../types/area';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INFO_BUTTON_LABEL = 'Details zur markierten Fläche';

function createSvgElement(name: string, attributes: Record<string, string>): SVGElement {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function createInfoButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'popup-icon-button area-label-info';
  button.setAttribute('aria-label', INFO_BUTTON_LABEL);
  button.setAttribute('aria-haspopup', 'dialog');
  button.title = INFO_BUTTON_LABEL;
  const svg = createSvgElement('svg', { viewBox: '0 0 24 24', width: '18', height: '18', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(
    createSvgElement('circle', { cx: '12', cy: '12', r: '9.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
    createSvgElement('circle', { cx: '12', cy: '7.8', r: '1.4', fill: 'currentColor' }),
    createSvgElement('path', { d: 'M12 11v6', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' }),
  );
  button.append(svg);
  button.addEventListener('click', onClick);
  return button;
}

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

  constructor(
    private readonly map: google.maps.Map,
    onOpenInfo: () => void,
  ) {
    this.root.className = 'area-label';
    const row = document.createElement('div');
    row.className = 'area-label-row';
    row.append(this.areaText, createSpan('area-label-separator', '|'), this.scoreText);
    const infoButton = createInfoButton(onOpenInfo);
    const titleRow = document.createElement('div');
    titleRow.className = 'area-label-title-row';
    titleRow.append(createSpan('area-label-title', 'Markierte Fläche'), infoButton);
    this.root.append(titleRow, row);
    google.maps.OverlayView.preventMapHitsAndGesturesFrom(infoButton);

    this.overlay.onAdd = () => this.overlay.getPanes()?.overlayMouseTarget.appendChild(this.root);
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
