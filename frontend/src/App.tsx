import { useEffect, useRef, useState } from 'react';
import { AreaInfoDialog } from './components/area/AreaInfoDialog';
import { InfoBar } from './components/InfoBar';
import { Legend } from './components/Legend';
import { NavBar } from './components/NavBar';
import { Sidebar, SectionTitle } from './components/Sidebar';
import { GoogleSpongeMap } from './components/GoogleSpongeMap';
import type { FocusTarget } from './components/mapTypes';
import { SpongeMap } from './components/SpongeMap';
import { useAreaSelection } from './hooks/useAreaSelection';
import { useDaySimulation } from './hooks/useDaySimulation';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePersistentBaseMapMode, usePersistentBoolean } from './hooks/usePersistentState';
import { useStats } from './hooks/useStats';
import { GOOGLE_MAPS_API_KEY } from './map/mapConfig';
import { COLORS, FONT_FAMILY } from './theme';
import type { RainKey } from './types/api';
import type { DaySimulation } from './hooks/useDaySimulation';
import type { BaseMapMode, MapMode } from './types/mapMode';

const DEFAULT_RAIN: RainKey = '50';
const SIDEBAR_STORAGE_KEY = 'schwammscore.sidebarCollapsed';
const MAP_MODE_STORAGE_KEY = 'schwammscore.mapMode';
const COMPACT_QUERY = '(max-width: 767px)';
const MapView = GOOGLE_MAPS_API_KEY ? GoogleSpongeMap : SpongeMap;

export function App() {
  const compact = useMediaQuery(COMPACT_QUERY);
  const [desktopCollapsed, setDesktopCollapsed] = usePersistentBoolean(SIDEBAR_STORAGE_KEY, false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const collapsed = compact ? !drawerOpen : desktopCollapsed;
  const setSidebarCollapsed = (next: boolean) => (compact ? setDrawerOpen(!next) : setDesktopCollapsed(next));
  const [baseMode, setBaseMode] = usePersistentBaseMapMode(MAP_MODE_STORAGE_KEY);
  const [schwammSelected, setSchwammSelected] = useState(false);
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [rainKey, setRainKey] = useState<RainKey>(DEFAULT_RAIN);
  const [searchTarget, setSearchTarget] = useState<FocusTarget | null>(null);
  const simulation = useDaySimulation();
  const mode: MapMode = schwammSelected ? 'schwamm' : baseMode;
  const simulationActive = mode === 'schwamm';
  const navSimulation: DaySimulation = {
    ...simulation,
    play: () => {
      setSchwammSelected(true);
      simulation.play();
    },
    seek: (hour: number) => {
      setSchwammSelected(true);
      simulation.seek(hour);
    },
  };

  const selectMode = (next: MapMode) => {
    if (next === 'schwamm') {
      setSchwammSelected(true);
      return;
    }
    simulation.stop();
    setSchwammSelected(false);
    setBaseMode(next satisfies BaseMapMode);
  };
  const statsState = useStats();
  const area = useAreaSelection();
  const handledFinishRef = useRef(0);

  const drawerShown = compact && drawerOpen;

  useEffect(() => {
    if (area.finishNonce === handledFinishRef.current) return;
    handledFinishRef.current = area.finishNonce;
    if (!compact) setDesktopCollapsed(false);
  }, [area.finishNonce, compact, setDesktopCollapsed]);

  useEffect(() => {
    if (!drawerShown) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [drawerShown]);

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
        mode={mode}
        onModeChange={selectMode}
        simulation={navSimulation}
        rainKey={rainKey}
        onSelectPlace={(place) => setSearchTarget((previous) => ({ ...place, nonce: (previous?.nonce ?? 0) + 1 }))}
      />

      <main style={{ position: 'relative', zIndex: 0, flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          scoreMin={scoreMin}
          scoreMax={scoreMax}
          rainKey={rainKey}
          simulationActive={simulationActive}
          collapsed={collapsed}
          compact={compact}
          onCollapsedChange={setSidebarCollapsed}
          onScoreMinChange={setScoreMin}
          onScoreMaxChange={setScoreMax}
          onRainChange={setRainKey}
          area={area}
        />

        {compact && !collapsed && (
          <div
            aria-hidden="true"
            onClick={() => setSidebarCollapsed(true)}
            style={{ position: 'absolute', inset: 0, zIndex: 1099, background: 'rgba(26, 43, 47, 0.4)' }}
          />
        )}

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <MapView
            rainKey={rainKey}
            scoreMin={scoreMin}
            scoreMax={scoreMax}
            mode={mode}
            simulationHour={simulation.hour}
            focusTarget={searchTarget}
            area={area}
          />

          {collapsed && (
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
              <Legend simulationRainMm={simulationActive ? Number(rainKey) : null} />
            </div>
          )}
        </div>
      </main>

      <InfoBar statsState={statsState} rainKey={rainKey} />

      {area.infoOpen && area.shape && (
        <AreaInfoDialog shape={area.shape} statsState={area.statsState} rainKey={rainKey} onClose={area.closeInfo} />
      )}
    </div>
  );
}

export default App;
