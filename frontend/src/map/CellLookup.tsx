import { createRoot, type Root } from 'react-dom/client';
import { fetchCell } from '../api/client';
import { CellPopup, type PopupState } from '../components/CellPopup';
import type { RainKey } from '../types/api';

export class CellLookup {
  readonly container = document.createElement('div');
  private readonly root: Root = createRoot(this.container);
  private state: PopupState | null = null;
  private requestId = 0;

  constructor(
    private readonly isOpen: () => boolean,
    private rainKey: RainKey,
  ) {}

  async run(lat: number, lng: number): Promise<void> {
    const requestId = ++this.requestId;
    this.show({ kind: 'loading' });

    try {
      const cell = await fetchCell(lat, lng);
      if (requestId !== this.requestId) return;
      this.show(cell ? { kind: 'cell', cell } : { kind: 'outside' });
    } catch {
      if (requestId !== this.requestId) return;
      this.show({ kind: 'error' });
    }
  }

  setRainKey(rainKey: RainKey): void {
    this.rainKey = rainKey;
    this.render();
  }

  reset(): void {
    this.state = null;
    this.root.render(null);
  }

  dispose(): void {
    this.requestId++;
    window.setTimeout(() => this.root.unmount(), 0);
  }

  private show(state: PopupState): void {
    if (!this.isOpen()) return;
    this.state = state;
    this.render();
  }

  private render(): void {
    if (!this.state) return;
    this.root.render(<CellPopup state={this.state} rainKey={this.rainKey} />);
  }
}
