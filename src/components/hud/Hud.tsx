import { Activity, Code2, RadioTower } from 'lucide-react';
import { formatGateDistance, formatRaceTime, type GateHuntProgress } from '../../game/gateHunt';
import type { GameMode } from '../../game/modes';
import { featuredMode, scoringSignals } from '../../game/modes';
import { getVehicleScore, type VehicleSpec } from '../../game/vehicles';

type HudProps = {
  readonly modes: readonly GameMode[];
  readonly vehicles: readonly VehicleSpec[];
  readonly gateHuntProgress: GateHuntProgress;
};

export function Hud({ modes, vehicles, gateHuntProgress }: HudProps) {
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
          <a className="icon-button" href="https://github.com/lszabadkai/terep3" aria-label="GitHub repository">
            <Code2 size={19} />
          </a>
        </div>
      </header>

      <div className="hud__status" aria-label="Current drive status">
        {scoringSignals.map((signal) => (
          <div className="stat" key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </div>
        ))}
      </div>

      <section className="hud-panel hud-panel--mode" aria-labelledby="featured-mode">
        <div className="panel-title">
          <featuredMode.icon size={18} />
          <h2 id="featured-mode">{featuredMode.label}</h2>
        </div>
        <p>{featuredMode.summary}</p>
        <div className="race-strip" aria-label="Gate Hunt progress">
          <span>
            {gateHuntProgress.gatesCleared}/{gateHuntProgress.totalGates}
          </span>
          <span>{formatGateDistance(gateHuntProgress.distanceToGate)}</span>
          <span>{formatRaceTime(gateHuntProgress.elapsedSeconds)}</span>
          <span>{formatRaceTime(gateHuntProgress.bestSeconds)}</span>
        </div>
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
        <span>free camera chase</span>
      </footer>
    </section>
  );
}
