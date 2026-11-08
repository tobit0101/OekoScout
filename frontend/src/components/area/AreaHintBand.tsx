import type { ReactNode } from 'react';
import type { DrawDraft } from '../../types/area';
import { formatArea } from '../../utils/format';

interface AreaHintBandProps {
  draft: DrawDraft;
  onCancel: () => void;
}

const MIN_POLYGON_VERTICES = 3;

function polygonHint(vertexCount: number): ReactNode {
  if (vertexCount < MIN_POLYGON_VERTICES) return 'Punkte setzen';
  return (
    <>
      <strong>Doppelklick</strong> oder Startpunkt schließt ab · <kbd>⌫</kbd> Punkt zurück
    </>
  );
}

function hintText({ tool, vertexCount }: DrawDraft): ReactNode {
  if (tool === 'polygon') return polygonHint(vertexCount);
  if (tool === 'rectangle') return vertexCount === 0 ? 'Erste Ecke setzen' : 'Gegenüberliegende Ecke setzen';
  return vertexCount === 0 ? 'Mittelpunkt setzen' : 'Radius festlegen';
}

export function AreaHintBand({ draft, onCancel }: AreaHintBandProps) {
  return (
    <div className="area-hint">
      <span className="area-hint-dot" aria-hidden="true" />
      <span role="status">{hintText(draft)}</span>
      {draft.areaM2 !== null && <span className="area-hint-area">≈ {formatArea(draft.areaM2)}</span>}
      <button type="button" className="area-hint-cancel" onClick={onCancel} title="Esc">
        Abbrechen
      </button>
    </div>
  );
}
