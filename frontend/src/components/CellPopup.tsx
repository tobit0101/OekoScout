import { useState } from 'react';
import { isFavorite, removeFavorite } from '../favorites/favoritesStore';
import { saveFavorite } from '../favorites/saveFavorite';
import { useFavorites } from '../favorites/useFavorites';
import { KLASSE_LABEL } from '../labels';
import type { CellResponse, RainKey } from '../types/api';
import { formatDecimal } from '../utils/format';
import { CellInfoDialog } from './popup/CellInfoDialog';
import { CardFrame, MessageCard, ScoreCard } from './popup/ScoreCard';

export type PopupState =
  | { kind: 'loading' }
  | { kind: 'cell'; cell: CellResponse; lat: number; lng: number }
  | { kind: 'outside' }
  | { kind: 'error' };

interface CellPopupProps {
  state: PopupState;
  rainKey: RainKey;
  onClose: () => void;
}

export function CellPopup({ state, rainKey, onClose }: CellPopupProps) {
  if (state.kind === 'loading') return <MessageCard text="Lade Zelldaten …" onClose={onClose} />;
  if (state.kind === 'outside') {
    return <MessageCard text="Kein Wert – außerhalb des Rechengebiets" onClose={onClose} />;
  }
  if (state.kind === 'error') return <MessageCard text="Daten derzeit nicht verfügbar" onClose={onClose} />;
  return <CellDetails cell={state.cell} lat={state.lat} lng={state.lng} rainKey={rainKey} onClose={onClose} />;
}

interface CellDetailsProps {
  cell: CellResponse;
  lat: number;
  lng: number;
  rainKey: RainKey;
  onClose: () => void;
}

function CellDetails({ cell, lat, lng, rainKey, onClose }: CellDetailsProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const score = cell.score_prozent[rainKey];
  const runoff = cell.abfluss_mm[rainKey];
  const hasScore = score !== null && runoff !== null;
  const noScoreReason =
    cell.aussagekraft === 'WIDERSPRUCH' ? 'Quellen widersprechen sich' : 'Fließgewässer – nicht berechnet';

  useFavorites();
  const isSaved = isFavorite(cell.id);
  const toggleFavorite = () => {
    if (isSaved) {
      removeFavorite(cell.id);
      return;
    }
    const scoreText = hasScore ? `${formatDecimal(score)} % bei ${rainKey} mm` : 'Kein Score';
    void saveFavorite({
      id: cell.id,
      lat,
      lng,
      label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      secondary: `${KLASSE_LABEL[cell.klasse] ?? cell.klasse} · ${scoreText}`,
      savedAt: Date.now(),
    });
  };

  return (
    <CardFrame onClose={onClose} onInfo={() => setIsInfoOpen(true)} favorite={{ active: isSaved, onToggle: toggleFavorite }}>
      <ScoreCard
        score={hasScore ? score : null}
        rainMm={Number(rainKey)}
        retainedLitres={hasScore ? Number(rainKey) - runoff : null}
        noScoreReason={noScoreReason}
      />
      {isInfoOpen && (
        <CellInfoDialog cell={cell} lat={lat} lng={lng} rainKey={rainKey} onClose={() => setIsInfoOpen(false)} />
      )}
    </CardFrame>
  );
}
