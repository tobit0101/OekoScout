import type { RainKey } from '../types/api';
import { CellLookup } from './CellLookup';

export class GoogleCellPopupController {
  private readonly infoWindow: google.maps.InfoWindow;
  private readonly lookup: CellLookup;
  private readonly closeListener: google.maps.MapsEventListener;
  private isOpen = false;

  constructor(
    private readonly map: google.maps.Map,
    rainKey: RainKey,
  ) {
    this.lookup = new CellLookup(
      () => this.isOpen,
      () => this.infoWindow.close(),
      rainKey,
    );
    this.infoWindow = new google.maps.InfoWindow({
      content: this.lookup.container,
      maxWidth: 300,
      headerDisabled: true,
    });
    this.closeListener = this.infoWindow.addListener('close', () => {
      this.isOpen = false;
      this.lookup.reset();
    });
  }

  async openAt(latLng: google.maps.LatLngLiteral): Promise<void> {
    this.infoWindow.setPosition(latLng);
    this.infoWindow.open({ map: this.map });
    this.isOpen = true;
    await this.lookup.run(latLng.lat, latLng.lng);
  }

  setRainKey(rainKey: RainKey): void {
    this.lookup.setRainKey(rainKey);
  }

  dispose(): void {
    this.closeListener.remove();
    this.isOpen = false;
    this.infoWindow.close();
    this.lookup.dispose();
  }
}
