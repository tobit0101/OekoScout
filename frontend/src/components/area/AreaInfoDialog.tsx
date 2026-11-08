import type { ReactNode } from 'react';
import type { AreaStatsState } from '../../hooks/useAreaSelection';
import { scoreColor, scoreTextColor } from '../../scale';
import { COLORS } from '../../theme';
import type { RainKey } from '../../types/api';
import type { AreaShape } from '../../types/area';
import { InfoDialogShell } from '../dialog/InfoDialogShell';
import { AussagekraftBar } from './AussagekraftBar';
import { coverageNote } from './areaFormat';
import { buildAreaInfoModel, buildInfoClipboardText, describeShape, INFO_FOOTER_NOTE, type AreaInfoModel } from './areaInfoModel';
import './areaInfoDialog.css';

interface AreaInfoDialogProps {
  shape: AreaShape;
  statsState: AreaStatsState;
  rainKey: RainKey;
  onClose: () => void;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="area-info__section" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

function Hero({ model }: { model: AreaInfoModel }) {
  const accent = model.score === null ? COLORS.border : scoreColor(model.score);
  const textColor = model.score === null ? COLORS.textMuted : scoreTextColor(model.score);
  return (
    <div className="area-info__hero">
      <div className="area-info__tile" style={{ borderTopColor: accent }}>
        <div className="area-info__tile-label">⌀ Schwamm Score bei {model.rainKey} mm</div>
        <div className="area-info__hero-value" style={{ color: textColor }}>
          {model.scoreText}
          {model.score !== null && <span className="area-info__hero-unit"> %</span>}
        </div>
        <div className="area-info__tile-caption" style={{ color: textColor }}>
          {model.scoreCaption}
        </div>
      </div>
      <div className="area-info__tile" style={{ borderTopColor: COLORS.primary }}>
        <div className="area-info__tile-label">{model.retained.label}</div>
        <div className="area-info__hero-value" style={{ color: COLORS.navy }}>
          {model.retained.value}
        </div>
        <div className="area-info__tile-caption">zurückgehalten</div>
      </div>
    </div>
  );
}

function KpiGrid({ model }: { model: AreaInfoModel }) {
  return (
    <dl className="area-info__kpis">
      {model.kpis.map((item) => (
        <div key={item.label} className="area-info__kpi">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RainTable({ model }: { model: AreaInfoModel }) {
  return (
    <div className="area-info__table-wrap">
      <table className="area-info__table">
        <caption>Alle Regenmengen</caption>
        <thead>
          <tr>
            <th scope="col">Regenmenge</th>
            <th scope="col">⌀ Score</th>
            <th scope="col">Rückhalt</th>
            <th scope="col">Abfluss</th>
          </tr>
        </thead>
        <tbody>
          {model.rainRows.map((row) => (
            <tr key={row.rainKey} className={row.selected ? 'area-info__row--selected' : undefined} aria-current={row.selected ? 'true' : undefined}>
              <th scope="row">{row.rainKey} mm</th>
              <td>{row.scoreText}</td>
              <td>{row.retainedText}</td>
              <td>{row.runoffText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KlassenBars({ model }: { model: AreaInfoModel }) {
  return (
    <ul className="area-info__bars">
      {model.klassen.map((row) => (
        <li key={row.key}>
          <div className="area-info__bar-head">
            <span>{row.label}</span>
            <span className="area-info__muted">
              {row.countText} ({row.share})
            </span>
          </div>
          <div aria-hidden="true" className="area-info__bar-track">
            <div className="area-info__bar-fill" style={{ width: `${row.ratio * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReadyContent({ model }: { model: AreaInfoModel }) {
  return (
    <>
      <Hero model={model} />
      <KpiGrid model={model} />
      <RainTable model={model} />
      {model.aussagekraft.length > 0 && (
        <Section id="area-info-aussagekraft" title="Aussagekraft">
          <AussagekraftBar counts={model.aussagekraftCounts} size="large" />
        </Section>
      )}
      {model.klassen.length > 0 && (
        <Section id="area-info-klassen" title="Flächenklassen">
          <KlassenBars model={model} />
        </Section>
      )}
      {model.note && <p className="area-info__notice">{model.note}</p>}
    </>
  );
}

export function AreaInfoDialog({ shape, statsState, rainKey, onClose }: AreaInfoDialogProps) {
  const stats = statsState.status === 'ready' ? statsState.stats : null;
  const model = stats ? buildAreaInfoModel(shape, stats, rainKey, coverageNote(stats)) : null;
  const header = describeShape(shape);

  return (
    <InfoDialogShell
      titleId="area-info-title"
      title={header.title}
      subtitle={model?.subtitle ?? header.subtitle}
      copyLabel="Alle Angaben kopieren"
      copyText={model ? buildInfoClipboardText(model) : `${header.title}\n${header.subtitle}`}
      wide
      onClose={onClose}
    >
      {statsState.status === 'error' && (
        <p role="alert" className="area-info__notice">
          {statsState.message}
        </p>
      )}
      {(statsState.status === 'loading' || statsState.status === 'idle') && (
        <p role="status" aria-live="polite" className="area-info__loading">
          Berechne …
        </p>
      )}
      {model && <ReadyContent model={model} />}
      <p className="area-info__footer">{INFO_FOOTER_NOTE}</p>
    </InfoDialogShell>
  );
}
