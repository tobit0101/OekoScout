import type { AreaShape, AreaTool, DrawDraft, DrawingTool } from '../types/area';
import { AreaLabel } from './areaLabel';
import { CircleSession } from './drawing/CircleSession';
import type { DrawSession, DrawSessionHost } from './drawing/DrawSession';
import { PolygonSession } from './drawing/PolygonSession';
import { RectangleSession } from './drawing/RectangleSession';
import { createFinishedShape, type FinishedShape, type ShapeSpec } from './finishedShape';

export interface DrawingCallbacks {
  onDraftChange(draft: DrawDraft | null): void;
  onShapeChange(shape: AreaShape, finished: boolean): void;
  onToolEnd(): void;
  onOpenInfo(): void;
}

const EDIT_DEBOUNCE_MS = 300;
const SETTLE_MS = 400;

function createSession(tool: DrawingTool, host: DrawSessionHost): DrawSession {
  if (tool === 'polygon') return new PolygonSession(host);
  if (tool === 'rectangle') return new RectangleSession(host);
  return new CircleSession(host);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export class AreaDrawingController {
  private readonly label: AreaLabel;
  private readonly host: DrawSessionHost;
  private tool: AreaTool = 'select';
  private session: DrawSession | null = null;
  private finished: FinishedShape | null = null;
  private pendingDraft: DrawDraft | null = null;
  private lastDraftKey = '';
  private draftFrame: number | undefined;
  private editTimer: number | undefined;
  private settleTimer: number | undefined;
  private settling = false;

  constructor(
    private readonly map: google.maps.Map,
    private readonly callbacks: DrawingCallbacks,
  ) {
    this.label = new AreaLabel(map, () => callbacks.onOpenInfo());
    this.host = {
      map,
      reportDraft: (draft) => this.queueDraft(draft),
      finish: (spec) => this.finish(spec),
    };
  }

  get isDrawing(): boolean {
    return this.session !== null || this.settling;
  }

  setTool(tool: AreaTool): void {
    if (tool === this.tool) return;
    this.endSession();
    this.tool = tool;
    if (tool !== 'select') this.startSession(tool);
  }

  setScoreText(text: string): void {
    this.label.setScoreText(text);
  }

  setMeasuredArea(areaM2: number): void {
    this.label.setArea(areaM2);
  }

  clearShape(): void {
    window.clearTimeout(this.editTimer);
    this.finished?.dispose();
    this.finished = null;
    this.label.hide();
  }

  dispose(): void {
    this.endSession();
    window.clearTimeout(this.editTimer);
    window.clearTimeout(this.settleTimer);
    this.settling = false;
    this.finished?.dispose();
    this.finished = null;
    this.label.hide();
  }

  private startSession(tool: DrawingTool): void {
    window.clearTimeout(this.settleTimer);
    this.settling = false;
    this.finished?.setEditable(false);
    this.map.setOptions({ disableDoubleClickZoom: true, draggableCursor: 'crosshair' });
    document.addEventListener('keydown', this.handleKeyDown);
    this.session = createSession(tool, this.host);
  }

  private endSession(): void {
    if (!this.session) return;
    this.session.dispose();
    this.session = null;
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.draftFrame !== undefined) window.cancelAnimationFrame(this.draftFrame);
    this.draftFrame = undefined;
    this.pendingDraft = null;
    this.lastDraftKey = '';
    this.callbacks.onDraftChange(null);
    this.finished?.setEditable(true);
    this.map.setOptions({ draggableCursor: null });
    this.settling = true;
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => {
      this.settling = false;
      this.map.setOptions({ disableDoubleClickZoom: false });
    }, SETTLE_MS);
  }

  private finish(spec: ShapeSpec): void {
    this.endSession();
    this.tool = 'select';
    window.clearTimeout(this.editTimer);
    this.finished?.dispose();
    this.finished = createFinishedShape(this.map, spec, () => this.handleEdit());
    const shape = this.finished.measure();
    if (shape) {
      this.label.show(shape.center, shape.areaM2);
      this.callbacks.onShapeChange(shape, true);
    }
    this.callbacks.onToolEnd();
  }

  private handleEdit(): void {
    const shape = this.finished?.measure();
    if (!shape) return;
    this.label.update(shape.center, shape.areaM2);
    window.clearTimeout(this.editTimer);
    this.editTimer = window.setTimeout(() => this.callbacks.onShapeChange(shape, false), EDIT_DEBOUNCE_MS);
  }

  private queueDraft(draft: DrawDraft): void {
    this.pendingDraft = draft;
    if (this.draftFrame !== undefined) return;
    this.draftFrame = window.requestAnimationFrame(() => {
      this.draftFrame = undefined;
      this.flushDraft();
    });
  }

  private flushDraft(): void {
    const draft = this.pendingDraft;
    this.pendingDraft = null;
    if (!draft) return;
    const key = `${draft.tool}:${draft.vertexCount}:${draft.areaM2 === null ? '' : Math.round(draft.areaM2)}`;
    if (key === this.lastDraftKey) return;
    this.lastDraftKey = key;
    this.callbacks.onDraftChange(draft);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (event.key === 'Escape') {
      this.setTool('select');
      this.callbacks.onToolEnd();
      return;
    }
    if (event.key !== 'Backspace') return;
    event.preventDefault();
    this.session?.undoLast();
  };
}
