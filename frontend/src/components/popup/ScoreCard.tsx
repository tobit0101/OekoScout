import type { CSSProperties, ReactNode } from 'react';
import { scoreTextColor } from '../../scale';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';
import { CardButton, CloseIcon, InfoIcon } from './CardButton';
import { WaterDrop } from './WaterDrop';

export const CARD_WIDTH = 272;

const sectionStyle: CSSProperties = { padding: '16px 18px' };

const captionStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: COLORS.periwinkleText,
};

interface CardFrameProps {
  onClose: () => void;
  onInfo?: () => void;
  children: ReactNode;
}

export function CardFrame({ onClose, onInfo, children }: CardFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: CARD_WIDTH,
        background: COLORS.white,
        color: COLORS.text,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2 }}>
        {onInfo && (
          <CardButton label="Weitere Informationen" onClick={onInfo} opensDialog>
            <InfoIcon />
          </CardButton>
        )}
        <CardButton label="Popup schließen" onClick={onClose}>
          <CloseIcon />
        </CardButton>
      </div>
      {children}
    </div>
  );
}

interface ScoreCardProps {
  score: number | null;
  rainMm: number;
  retainedLitres: number | null;
  noScoreReason: string;
}

export function ScoreCard({ score, rainMm, retainedLitres, noScoreReason }: ScoreCardProps) {
  return (
    <>
      <div style={{ ...sectionStyle, paddingBottom: 12 }}>
        <div style={captionStyle}>{score === null ? 'Kein Score' : 'Schwamm Score'}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            marginTop: 2,
            color: score === null ? COLORS.textMuted : scoreTextColor(score),
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          <span style={{ fontSize: 56, letterSpacing: '-1px' }}>{score === null ? '—' : formatDecimal(score)}</span>
          {score !== null && <span style={{ fontSize: 22 }}>%</span>}
        </div>
      </div>
      <div style={{ height: 1, background: COLORS.border }} />
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, lineHeight: 1.45 }}>
        {score === null || retainedLitres === null ? (
          <p style={{ margin: 0, flex: 1 }}>{noScoreReason}</p>
        ) : (
          <>
            <p style={{ margin: 0, flex: 1 }}>
              Bei einem Regenfall von{' '}
              <strong style={{ color: COLORS.cyanText }}>{rainMm} mm</strong> in 24 h hält diese Fläche:
            </p>
            <WaterDrop litres={retainedLitres} />
          </>
        )}
      </div>
    </>
  );
}

export function MessageCard({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <CardFrame onClose={onClose}>
      <div role="status" style={{ padding: '16px 44px 16px 18px', fontSize: 13, lineHeight: 1.45 }}>
        {text}
      </div>
    </CardFrame>
  );
}
