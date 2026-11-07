import type { DrawDraft } from '../../types/area';
import type { ShapeSpec } from '../finishedShape';

export interface DrawSessionHost {
  readonly map: google.maps.Map;
  reportDraft(draft: DrawDraft): void;
  finish(spec: ShapeSpec): void;
}

interface Removable {
  setMap(map: google.maps.Map | null): void;
}

export abstract class DrawSession {
  private readonly listeners: google.maps.MapsEventListener[] = [];
  private readonly overlays: Removable[] = [];

  constructor(protected readonly host: DrawSessionHost) {}

  abstract undoLast(): void;

  dispose(): void {
    this.listeners.forEach((listener) => listener.remove());
    this.overlays.forEach((overlay) => overlay.setMap(null));
    this.listeners.length = 0;
    this.overlays.length = 0;
  }

  protected listen(eventName: string, handler: (event: google.maps.MapMouseEvent) => void): void {
    this.listeners.push(this.host.map.addListener(eventName, handler));
  }

  protected track<T extends Removable>(overlay: T): T {
    this.overlays.push(overlay);
    return overlay;
  }
}
