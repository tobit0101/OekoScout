import { useState } from 'react';
import { InfoBar } from './components/InfoBar';
import { Legend } from './components/Legend';
import { NavBar } from './components/NavBar';
import { Sidebar, SectionTitle } from './components/Sidebar';
import { SpongeMap } from './components/SpongeMap';
import { useStats } from './hooks/useStats';
import { COLORS, FONT_FAMILY } from './theme';
import type { RainKey } from './types/api';

const DEFAULT_RAIN: RainKey = '50';

export function App() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [rainKey, setRainKey] = useState<RainKey>(DEFAULT_RAIN);
  const statsState = useStats();

  const rainStats = statsState.status === 'ready' ? statsState.stats.score_je_regenmenge[`${rainKey}mm`] : undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
        background: COLORS.page,
        color: COLORS.text,
      }}
    >
      <NavBar
        filterOpen={filterOpen}
        heatmapVisible={heatmapVisible}
        onToggleFilter={() => setFilterOpen((open) => !open)}
        onToggleHeatmap={() => setHeatmapVisible((visible) => !visible)}
      />

      <main style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {filterOpen && (
          <Sidebar
            scoreMin={scoreMin}
            scoreMax={scoreMax}
            rainKey={rainKey}
            rainStats={rainStats}
            onScoreMinChange={setScoreMin}
            onScoreMaxChange={setScoreMax}
            onRainChange={setRainKey}
          />
        )}

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <SpongeMap rainKey={rainKey} scoreMin={scoreMin} scoreMax={scoreMax} heatmapVisible={heatmapVisible} />

          {!filterOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 28,
                left: 16,
                zIndex: 400,
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: '12px 14px',
                width: 220,
                boxShadow: '0 2px 12px rgba(0,0,0,.1)',
              }}
            >
              <SectionTitle>Heatmap-Legende</SectionTitle>
              <Legend />
            </div>
          )}
        </div>
      </main>

      <InfoBar statsState={statsState} rainKey={rainKey} />
    </div>
  );
}

export default App;
