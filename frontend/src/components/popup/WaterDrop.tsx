import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';

interface WaterDropProps {
  litres: number;
}

export function WaterDrop({ litres }: WaterDropProps) {
  const litresText = formatDecimal(litres);
  return (
    <div
      role="img"
      aria-label={`${litresText} Liter zurückgehalten`}
      style={{ position: 'relative', width: 72, height: 90, flexShrink: 0 }}
    >
      <svg viewBox="0 0 72 90" width="100%" height="100%" aria-hidden="true" focusable="false">
        <path
          d="M36 4 C36 4 6 38 6 58 a30 30 0 0 0 60 0 C66 38 36 4 36 4 Z"
          fill={COLORS.lightBlue}
          stroke={COLORS.primary}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M20 56 C20 48 26 40 30 35"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '38px 0 0',
          textAlign: 'center',
          color: COLORS.navy,
          lineHeight: 1.1,
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>{litresText}</div>
        <div style={{ fontSize: 11, fontWeight: 700 }}>Liter</div>
      </div>
    </div>
  );
}
