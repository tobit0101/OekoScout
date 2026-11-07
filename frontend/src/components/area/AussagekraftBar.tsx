import { COLORS } from '../../theme';
import type { Aussagekraft } from '../../types/api';
import { formatInteger } from '../../utils/format';
import { aussagekraftEntries } from './areaFormat';

export type AussagekraftBarSize = 'compact' | 'large';

interface AussagekraftBarProps {
  counts: Record<Aussagekraft, number>;
  size?: AussagekraftBarSize;
}

const SIZES = {
  compact: { barHeight: 8, fontSize: 11, swatch: 10, legendGap: 2, showTitle: true },
  large: { barHeight: 16, fontSize: 13, swatch: 12, legendGap: 6, showTitle: false },
} as const;

export function AussagekraftBar({ counts, size = 'compact' }: AussagekraftBarProps) {
  const entries = aussagekraftEntries(counts);
  if (entries.length === 0) return null;
  const { barHeight, fontSize, swatch, legendGap, showTitle } = SIZES[size];

  return (
    <div style={{ marginTop: showTitle ? 10 : 0 }}>
      {showTitle && <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4 }}>Aussagekraft</div>}
      <div aria-hidden="true" style={{ display: 'flex', height: barHeight, borderRadius: barHeight / 2, overflow: 'hidden', gap: 1 }}>
        {entries.map((entry) => (
          <div key={entry.key} style={{ flexGrow: entry.count, flexBasis: 0, background: entry.color }} />
        ))}
      </div>
      <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: legendGap, fontSize }}>
        {entries.map((entry) => (
          <li key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true" style={{ width: swatch, height: swatch, borderRadius: 2, flexShrink: 0, background: entry.color }} />
            <span style={{ flex: 1 }}>{entry.label}</span>
            <span style={{ color: COLORS.textMuted }}>
              {formatInteger(entry.count)} ({entry.share})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
