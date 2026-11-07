import L from 'leaflet';
import type { RainKey } from '../types/api';
import { CellLookup } from './CellLookup';

export class CellPopupController {
  private readonly popup = L.popup({
    maxWidth: 300,
    minWidth: 272,
    className: 'sponge-popup',
    closeButton: false,
  });
  private readonly lookup: CellLookup;
  private readonly resizeObserver = new ResizeObserver(() => this.popup.update());

  constructor(
    private readonly map: L.Map,
    rainKey: RainKey,
  ) {
    this.lookup = new CellLookup(
      () => this.map.hasLayer(this.popup),
      () => this.map.closePopup(this.popup),
      rainKey,
    );
    this.popup.setContent(this.lookup.container);
    this.resizeObserver.observe(this.lookup.container);
    this.popup.on('remove', () => this.lookup.reset());
  }

  async openAt(latlng: L.LatLng): Promise<void> {
    this.popup.setLatLng(latlng).openOn(this.map);
    await this.lookup.run(latlng.lat, latlng.lng);
  }

  setRainKey(rainKey: RainKey): void {
    this.lookup.setRainKey(rainKey);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.popup.remove();
    this.lookup.dispose();
  }
}
