import { Activity, Code2, RadioTower, RotateCcw } from 'lucide-react';
import { formatGateDistance, formatRaceTime, type GateHuntProgress } from '../../game/gateHunt';
import type { GameMode } from '../../game/modes';
import { featuredMode } from '../../game/modes';
import { getVehicleScore, type VehicleSpec } from '../../game/vehicles';

type HudProps = {
  readonly modes: readonly GameMode[];
  readonly vehicles: readonly VehicleSpec[];
  readonly gateHuntProgress: GateHuntProgress;
  readonly onRetryGateHunt?: () => void;
};

export function Hud({ modes, vehicles, gateHuntProgress, onRetryGateHunt }: HudProps) {
  const gateHeadingStyle = {
    transform: `rotate(${gateHuntProgress.headingToGate}rad)`,
  };

  return (
    <section className="hud" aria-label="Game interface">
      <header className="hud__header">
        <div>
          <p className="hud__kicker">Low-poly off-road prototype</p>
          <h1>Terep3</h1>
        </div>
        <div className="hud__actions" aria-label="Project links">
          <button type="button" className="icon-button" aria-label="Network play planned">
            <RadioTower size={19} />
          </button>
          <a className="icon-button" href="https://github.com/szabadkai/terep3" aria-label="GitHub repository">
            <Code2 size={19} />
          </a>
        </div>
      </header>

      <section className="hud-panel hud-panel--mode" aria-labelledby="featured-mode">
        <div className="panel-title panel-title--split">
          <div className="panel-title__label">
            <featuredMode.icon size={18} />
            <h2 id="featured-mode">{featuredMode.label}</h2>
          </div>
          <button
            type="button"
            className="icon-button icon-button--compact"
            aria-label="Retry Gate Hunt"
            onClick={onRetryGateHunt}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <p>{featuredMode.summary}</p>
        <div className="gate-focus" aria-label={`Active gate ${gateHuntProgress.activeGateId}`}>
          <span className="gate-focus__arrow" style={gateHeadingStyle} aria-hidden="true" />
          <strong>Gate {gateHuntProgress.activeGateId}</strong>
          <span>
            {gateHuntProgress.completedRuns > 0 ? `${gateHuntProgress.completedRuns} runs` : 'Run active'}
          </span>
        </div>
        <div className="race-strip" aria-label="Gate Hunt progress">
          <span>
            {gateHuntProgress.gatesCleared}/{gateHuntProgress.totalGates}
          </span>
          <span>{formatGateDistance(gateHuntProgress.distanceToGate)}</span>
          <span>{formatRaceTime(gateHuntProgress.elapsedSeconds)}</span>
          <span>{formatRaceTime(gateHuntProgress.bestSeconds)}</span>
        </div>
        {gateHuntProgress.splitTimes && gateHuntProgress.splitTimes.length > 0 && (
          <div className="split-times" aria-label="Gate split times">
            {gateHuntProgress.splitTimes.map((split, index) => (
              <span key={index} className="split-item">
                <small>G{index + 1}</small>
                <strong>{formatRaceTime(split)}</strong>
              </span>
            ))}
          </div>
        )}
        {gateHuntProgress.lastRunSeconds !== undefined && (
          <div className="run-feedback" data-improved={gateHuntProgress.bestTimeImproved ? 'true' : 'false'}>
            <strong>{gateHuntProgress.bestTimeImproved ? 'Best run' : 'Last run'}</strong>
            <span>{formatRaceTime(gateHuntProgress.lastRunSeconds)}</span>
          </div>
        )}
      </section>

      <section className="hud-panel" aria-labelledby="modes-title">
        <div className="panel-title">
          <Activity size={18} />
          <h2 id="modes-title">Modes</h2>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => (
            <article className="mode-tile" key={mode.id}>
              <mode.icon size={17} />
              <div>
                <h3>{mode.label}</h3>
                <span>{mode.players}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hud-panel" aria-labelledby="garage-title">
        <h2 id="garage-title">Garage</h2>
        <div className="vehicle-list">
          {vehicles.map((vehicle) => (
            <article className="vehicle-row" key={vehicle.id}>
              <span className="vehicle-swatch" style={{ backgroundColor: vehicle.color }} />
              <div>
                <h3>{vehicle.name}</h3>
                <span>{vehicle.className}</span>
              </div>
              <strong>{getVehicleScore(vehicle)}</strong>
            </article>
          ))}
        </div>
      </section>

      <footer className="hud__footer">
        <span>WASD / arrows</span>
        <span>R recover</span>
        <span>Enter retry</span>
        <span>1/2/3 camera</span>
      </footer>
    </section>
  );
}
