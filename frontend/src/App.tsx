import React, { useEffect, useState } from 'react';
import { SpongeMap } from './components/SpongeMap';
import { fetchStats } from './api/client';
import type { RainKey, StatsResponse } from './types/api';

const RAIN_STEPS: RainKey[] = ['30', '40', '50', '60', '70', '80'];
const RAIN_STAT_KEY = (r: RainKey) => `${r}mm` as const;

function formatNum(n: number): string {
  return n.toLocaleString('de-DE');
}

export function App() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [rainKey, setRainKey] = useState<RainKey>('50');
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {/* backend not ready */});
  }, []);

  const statKey = RAIN_STAT_KEY(rainKey);
  const scoreStats = stats?.score_je_regenmenge[statKey];

  // Rainfall step slider: 6 discrete steps 30..80mm
  const rainIdx = RAIN_STEPS.indexOf(rainKey);
  const rainPct = (rainIdx / (RAIN_STEPS.length - 1)) * 100;

  // Score range thumb positions
  const minPct = scoreMin;
  const maxPct = scoreMax;

  // Retained liters per m² = abfluss_mm * L/mm/m² ≈ score_prozent * ~0.5 (rough placeholder)
  // Without a selected cell we show a generic placeholder
  const retainedInfo = scoreStats
    ? `${scoreStats.mittel.toFixed(1)} % ∅ Rückhalt bei ${rainKey} mm / 24 h`
    : `Score bei ${rainKey} mm Regenfall`;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#eef3f5', color: '#1A2B2F' }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          height: 52,
          minHeight: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          borderBottom: '3px solid #66C6DF',
          background: '#fff',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#66C6DF',
            paddingRight: 16,
            borderRight: '1px solid #e5f4f7',
            marginRight: 4,
            letterSpacing: '.3px',
            flexShrink: 0,
          }}
        >
          Sponge
        </div>

        {/* Search */}
        <div
          style={{
            flex: 1,
            maxWidth: 400,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f4fafb',
            border: '1px solid #c9dfe8',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c97cd" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Adresse oder Ort suchen..."
            style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#1A2B2F', outline: 'none', width: '100%', fontFamily: 'inherit' }}
          />
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <NavBtn
            active={filterOpen}
            onClick={() => setFilterOpen((v) => !v)}
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            }
          >
            Filter
          </NavBtn>
          <NavBtn
            onClick={() => {}}
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            }
          >
            Heatmap
          </NavBtn>
          <NavBtn
            export
            onClick={() => {}}
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          >
            Export
          </NavBtn>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: filterOpen ? '262px 1fr' : '1fr', minHeight: 0 }}>

        {/* ── SIDEBAR ── */}
        {filterOpen && (
          <aside
            style={{
              borderRight: '1px solid #c9dfe8',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'rgba(230,244,241,.96)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Score Filter */}
              <div>
                <SectionTitle>Score Filter</SectionTitle>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#1A2B2F' }}>Sponge Score</span>
                  <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 8px', color: '#1A2B2F', border: '1px solid #c9dfe8', background: '#E6F4F1' }}>
                    {scoreMin} – {scoreMax} %
                  </span>
                </div>

                {/* Dual-thumb range */}
                <RangeSlider
                  min={scoreMin}
                  max={scoreMax}
                  onMinChange={setScoreMin}
                  onMaxChange={setScoreMax}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7c97cd', marginTop: 7 }}>
                  <span>0 %</span><span>50 %</span><span>100 %</span>
                </div>
              </div>

              <Separator />

              {/* Rain slider */}
              <div>
                <SectionTitle>Regenfall simulieren</SectionTitle>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#1A2B2F' }}>Niederschlag</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#66C6DF', border: '1px solid #c9dfe8', background: '#E6F4F1', borderRadius: 4, padding: '2px 8px' }}>
                    {rainKey} mm
                  </span>
                </div>

                {/* Discrete step slider */}
                <div style={{ position: 'relative', height: 4, background: '#c9dfe8', borderRadius: 99, marginBottom: 7 }}>
                  <div style={{ position: 'absolute', height: '100%', background: '#66C6DF', borderRadius: 99, left: 0, width: `${rainPct}%` }} />
                  <input
                    type="range"
                    min={0}
                    max={RAIN_STEPS.length - 1}
                    value={rainIdx}
                    onChange={(e) => setRainKey(RAIN_STEPS[Number(e.target.value)])}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer', margin: 0,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute', width: 14, height: 14, background: '#fff',
                      border: '2px solid #66C6DF', borderRadius: '50%', top: '50%',
                      left: `${rainPct}%`, transform: 'translate(-50%,-50%)',
                      boxShadow: '0 1px 4px rgba(0,0,0,.12)', pointerEvents: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7c97cd' }}>
                  <span>30 mm</span><span>55 mm</span><span>80 mm</span>
                </div>
                <div style={{ fontSize: 10, color: '#7c97cd', marginTop: 4 }}>Niederschlag innerhalb 24 h</div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', background: '#E6F4F1', border: '1px solid #c9dfe8', borderRadius: 6, fontSize: 11, color: '#2E296B', marginTop: 8, lineHeight: 1.5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#66C6DF" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  <span>{retainedInfo}</span>
                </div>
              </div>
            </div>

            {/* Legend pinned at bottom */}
            <div style={{ borderTop: '1px solid #c9dfe8', paddingTop: 12, marginTop: 8 }}>
              <SectionTitle style={{ marginBottom: 8 }}>Heatmap-Legende</SectionTitle>
              <HeatmapLegend />
            </div>
          </aside>
        )}

        {/* ── MAP ── */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <SpongeMap
            rainKey={rainKey}
            scoreMin={scoreMin}
            scoreMax={scoreMax}
          />

          {/* Legend overlay when sidebar collapsed */}
          {!filterOpen && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 400,
              background: '#fff', border: '1px solid #c9dfe8', borderRadius: 8,
              padding: '12px 14px', width: 220, boxShadow: '0 2px 12px rgba(0,0,0,.1)',
            }}>
              <SectionTitle style={{ marginBottom: 8 }}>Heatmap-Legende</SectionTitle>
              <HeatmapLegend />
            </div>
          )}
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <InfoBar stats={stats} rainKey={rainKey} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBtn({ children, active, export: isExport, onClick, icon }: {
  children: React.ReactNode;
  active?: boolean;
  export?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 11px', borderRadius: 6, fontSize: 11, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
  };
  const style: React.CSSProperties = isExport
    ? { ...base, background: '#B6E591', border: '1px solid #B6E591', color: '#1A2B2F', fontWeight: 600 }
    : active
    ? { ...base, background: '#E6F4F1', border: '1px solid #66C6DF', color: '#1A2B2F', fontWeight: 600 }
    : { ...base, background: '#fff', border: '1px solid #c9dfe8', color: '#1A2B2F' };

  return (
    <button onClick={onClick} style={style}>
      {icon}{children}
    </button>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7c97cd', marginBottom: 6, ...style }}>
      {children}
    </div>
  );
}

function Separator() {
  return <div style={{ height: 1, background: '#c9dfe8' }} />;
}

function HeatmapLegend() {
  return (
    <>
      <div style={{ height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#d73027 0%,#f46d43 17%,#fdae61 33%,#fee08b 50%,#a6d96a 67%,#66bd63 83%,#1a9850 100%)', marginBottom: 5 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7c97cd' }}>
        <span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 5 }}>
        <span style={{ color: '#d73027', fontWeight: 600 }}>Schlecht</span>
        <span style={{ color: '#1a9850', fontWeight: 600 }}>Sehr gut</span>
      </div>
    </>
  );
}

function RangeSlider({ min, max, onMinChange, onMaxChange }: {
  min: number; max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  return (
    <div style={{ position: 'relative', height: 14, marginBottom: 0 }}>
      {/* track */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, background: '#c9dfe8', borderRadius: 99, transform: 'translateY(-50%)' }} />
      {/* fill */}
      <div style={{ position: 'absolute', top: '50%', height: 4, background: '#66C6DF', borderRadius: 99, transform: 'translateY(-50%)', left: `${min}%`, width: `${max - min}%` }} />
      {/* min thumb (hidden range input) */}
      <input type="range" min={0} max={100} value={min}
        onChange={(e) => { const v = Math.min(Number(e.target.value), max - 5); onMinChange(v); }}
        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%', margin: 0, zIndex: 2 }}
      />
      {/* max thumb */}
      <input type="range" min={0} max={100} value={max}
        onChange={(e) => { const v = Math.max(Number(e.target.value), min + 5); onMaxChange(v); }}
        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%', margin: 0, zIndex: 3 }}
      />
      {/* visual thumbs */}
      <div style={{ position: 'absolute', width: 14, height: 14, background: '#fff', border: '2px solid #66C6DF', borderRadius: '50%', top: '50%', left: `${min}%`, transform: 'translate(-50%,-50%)', boxShadow: '0 1px 4px rgba(0,0,0,.12)', pointerEvents: 'none', zIndex: 4 }} />
      <div style={{ position: 'absolute', width: 14, height: 14, background: '#fff', border: '2px solid #66C6DF', borderRadius: '50%', top: '50%', left: `${max}%`, transform: 'translate(-50%,-50%)', boxShadow: '0 1px 4px rgba(0,0,0,.12)', pointerEvents: 'none', zIndex: 4 }} />
    </div>
  );
}

function InfoBar({ stats, rainKey }: { stats: StatsResponse | null; rainKey: RainKey }) {
  const statKey = `${rainKey}mm` as const;
  const s = stats?.score_je_regenmenge[statKey];
  const withScore = stats?.mit_score ?? null;
  const total = stats?.zeilen ?? null;
  const widerspruch = total !== null && withScore !== null ? total - withScore : null;

  return (
    <div style={{
      borderTop: '1px solid #c9dfe8',
      background: '#f4fafb',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '9px 16px',
      fontSize: 11,
      color: '#7c97cd',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#66C6DF', flexShrink: 0 }} />
      <span style={{ color: '#1A2B2F' }}>
        {withScore !== null ? <>{formatNum(withScore)} Zellen mit Score</> : 'Lade Statistiken...'}
      </span>
      <IbSep />
      <span>
        ∅ Score: <strong style={{ color: '#2E296B' }}>{s ? `${s.mittel.toFixed(1)} %` : '—'}</strong>{' '}
        bei {rainKey} mm
      </span>
      <IbSep />
      <span>
        Score-Range: <strong style={{ color: '#1A2B2F' }}>{s ? `${s.min.toFixed(1)} – ${s.max.toFixed(1)} %` : '—'}</strong>
      </span>
      <IbSep />
      <span>
        {widerspruch !== null ? <>{formatNum(widerspruch)} Zellen ohne Score (Widerspruch)</> : '—'}
      </span>
      <div style={{ marginLeft: 'auto', fontSize: 10, color: '#c9dfe8' }}>Pforzheim · Schwammstadt</div>
    </div>
  );
}

function IbSep() {
  return <div style={{ width: 1, height: 16, background: '#c9dfe8' }} />;
}

export default App;
