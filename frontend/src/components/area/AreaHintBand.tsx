import type { ReactNode } from 'react';
import type { DrawDraft } from '../../types/area';
import { formatArea } from '../../utils/format';

interface AreaHintBandProps {
  draft: DrawDraft;
  onCancel: () => void;
}

const MIN_POLYGON_VERTICES = 3;

function Esc() {
  return (
    <>
      <kbd>Esc</kbd> Abbrechen
    </>
  );
}

function polygonHint(vertexCount: number): ReactNode {
  if (vertexCount === 0) return <>Klicken, um den ersten Punkt zu setzen · <Esc /></>;
  const placed = vertexCount === 1 ? '1 Punkt gesetzt' : `${vertexCount} Punkte gesetzt`;
  if (vertexCount < MIN_POLYGON_VERTICES) return <>{placed} · Klicken zum Fortfahren · Mindestens 3 Punkte · <Esc /></>;
  return (
    <>
      {placed} · Klicken zum Fortfahren · <strong>Doppelklick</strong> oder ersten Punkt anklicken zum Abschließen · <kbd>⌫</kbd> Letzten Punkt entfernen · <Esc />
    </>
  );
}

function hintText({ tool, vertexCount }: DrawDraft): ReactNode {
  if (tool === 'polygon') return polygonHint(vertexCount);
  if (tool === 'rectangle') {
    return vertexCount === 0 ? <>Klicken, um die erste Ecke zu setzen · <Esc /></> : <>Klicken, um die gegenüberliegende Ecke zu setzen · <Esc /></>;
  }
  return vertexCount === 0 ? <>Klicken, um den Mittelpunkt zu setzen · <Esc /></> : <>Klicken, um den Radius festzulegen · <Esc /></>;
}

export function AreaHintBand({ draft, onCancel }: AreaHintBandProps) {
  return (
    <div className="area-hint">
      <span className="area-hint-dot" aria-hidden="true" />
      <span role="status">{hintText(draft)}</span>
      {draft.areaM2 !== null && <span className="area-hint-area">≈ {formatArea(draft.areaM2)}</span>}
      <button type="button" className="area-hint-cancel" onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  );
}
