import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { COLORS } from '../../theme';
import { formatDecimal } from '../../utils/format';

interface WaterDropProps {
  litres: number;
  unit?: string;
  valueSuffix?: string;
}

const DROP_WIDTH = 72;
const DROP_HEIGHT = 90;
const VALUE_CENTER_Y = 52;
const UNIT_CENTER_Y = 69;
const MAX_LINE_WIDTH = 46;

interface FitLineProps {
  text: string;
  centerY: number;
  style: CSSProperties;
  children?: ReactNode;
}

function FitLine({ text, centerY, style, children }: FitLineProps) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const naturalWidth = line.offsetWidth;
    setScale(naturalWidth > MAX_LINE_WIDTH ? MAX_LINE_WIDTH / naturalWidth : 1);
  }, [text]);

  return (
    <span
      ref={lineRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: centerY,
        transform: `translate(-50%, -50%) scale(${scale})`,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        color: COLORS.navy,
        ...style,
      }}
    >
      {children ?? text}
    </span>
  );
}

export function WaterDrop({ litres, unit = 'Liter', valueSuffix }: WaterDropProps) {
  const litresText = formatDecimal(litres);
  const valueText = valueSuffix ? `${litresText} ${valueSuffix}` : litresText;
  return (
    <div
      role="img"
      aria-label={`${valueText} ${unit} zurückgehalten`}
      style={{ position: 'relative', width: DROP_WIDTH, height: DROP_HEIGHT, flexShrink: 0 }}
    >
      <svg viewBox={`0 0 ${DROP_WIDTH} ${DROP_HEIGHT}`} width="100%" height="100%" aria-hidden="true" focusable="false">
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
      <div aria-hidden="true">
        <FitLine text={valueText} centerY={VALUE_CENTER_Y} style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {litresText}
          {valueSuffix && <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 2 }}>{valueSuffix}</span>}
        </FitLine>
        <FitLine text={unit} centerY={UNIT_CENTER_Y} style={{ fontSize: 11, fontWeight: 700 }} />
      </div>
    </div>
  );
}
