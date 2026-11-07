import { createRoot, type Root } from 'react-dom/client';
import L from 'leaflet';
import { fetchCell } from '../api/client';
import { CellPopup, type PopupState } from '../components/CellPopup';
import type { RainKey } from '../types/api';

export class CellPopupController {
  private readonly popup = L.popup({ maxWidth: 260, minWidth: 236, className: 'sponge-popup' });
  private readonly container = document.createElement('div');
  private readonly root: Root = createRoot(this.container);
  private state: PopupState | null = null;
  private readonly resizeObserver = new ResizeObserver(() => this.popup.update());
  private requestId = 0;

  constructor(
    private readonly map: L.Map,
    private rainKey: RainKey,
  ) {
    this.popup.setContent(this.container);
    this.resizeObserver.observe(this.container);
    this.popup.on('remove', () => {
      this.state = null;
    });
  }

  async openAt(latlng: L.LatLng): Promise<void> {
    const requestId = ++this.requestId;
    this.popup.setLatLng(latlng).openOn(this.map);
    this.show({ kind: 'loading' });

    try {
      const cell = await fetchCell(latlng.lat, latlng.lng);
      if (requestId !== this.requestId) return;
      this.show(cell ? { kind: 'cell', cell } : { kind: 'outside' });
    } catch {
      if (requestId !== this.requestId) return;
      this.show({ kind: 'error' });
    }
  }

  setRainKey(rainKey: RainKey): void {
    this.rainKey = rainKey;
    if (!this.state) return;
    this.render();
  }

  dispose(): void {
    this.requestId++;
    this.resizeObserver.disconnect();
    this.popup.remove();
    window.setTimeout(() => this.root.unmount(), 0);
  }

  private show(state: PopupState): void {
    if (!this.map.hasLayer(this.popup)) return;
    this.state = state;
    this.render();
  }

  private render(): void {
    if (!this.state) return;
    const state = this.state;
    this.root.render(<CellPopup state={state} rainKey={this.rainKey} />);
  }
}
