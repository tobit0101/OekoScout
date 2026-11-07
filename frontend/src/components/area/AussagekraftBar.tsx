import { AUSSAGEKRAFT_DISPLAY } from '../../labels';
import { COLORS } from '../../theme';
import type { Aussagekraft } from '../../types/api';
import { formatInteger } from '../../utils/format';
import { AUSSAGEKRAFT_ORDER, percentOf } from './areaFormat';

interface AussagekraftBarProps {
  counts: Record<Aussagekraft, number>;
}

export function AussagekraftBar({ counts }: AussagekraftBarProps) {
  const entries = AUSSAGEKRAFT_ORDER.filter((key) => counts[key] > 0);
  const total = entries.reduce((sum, key) => sum + counts[key], 0);
  if (total === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4 }}>Aussagekraft</div>
      <div aria-hidden="true" style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        {entries.map((key) => (
          <div key={key} style={{ flexGrow: counts[key], flexBasis: 0, background: AUSSAGEKRAFT_DISPLAY[key].color }} />
        ))}
      </div>
      <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
        {entries.map((key) => (
          <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: AUSSAGEKRAFT_DISPLAY[key].color }} />
            <span style={{ flex: 1 }}>{AUSSAGEKRAFT_DISPLAY[key].label}</span>
            <span style={{ color: COLORS.textMuted }}>
              {formatInteger(counts[key])} ({percentOf(counts[key], total)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
