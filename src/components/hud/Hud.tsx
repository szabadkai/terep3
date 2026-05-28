import { Activity, Code2, Flag, RadioTower, RotateCcw, Trophy, Wrench } from 'lucide-react';
import { formatGateDistance, formatRaceTime, gateTargets, type GateHuntProgress } from '../../game/gateHunt';
import type { GameMode } from '../../game/modes';
import { featuredMode } from '../../game/modes';
import type { VehicleState } from '../../game/vehicleDynamics';
import { getVehicleScore, type VehicleSpec } from '../../game/vehicles';

type HudProps = {
  readonly modes: readonly GameMode[];
  readonly vehicles: readonly VehicleSpec[];
  readonly gateHuntProgress: GateHuntProgress;
  readonly vehicleState: VehicleState;
  readonly onRetryGateHunt?: () => void;
};

export function Hud({ modes, vehicles, gateHuntProgress, vehicleState, onRetryGateHunt }: HudProps) {
  const gateHeadingStyle = {
    transform: `rotate(${gateHuntProgress.headingToGate}rad)`,
  };
  const damagePercent = Math.round(vehicleState.damage);
  const damageStyle = {
    width: `${damagePercent}%`,
  };
  const nextGateId = gateTargets[(gateHuntProgress.activeGateIndex + 1) % gateTargets.length].id;

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
        <div className="race-callouts" aria-label="Race timing callouts">
          <div className="race-callout">
            <Trophy size={15} />
            <span>Best</span>
            <strong>{formatRaceTime(gateHuntProgress.bestSeconds)}</strong>
          </div>
          <div className="race-callout">
            <Flag size={15} />
            <span>Next</span>
            <strong>Gate {nextGateId}</strong>
          </div>
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
        <RouteMap gateHuntProgress={gateHuntProgress} vehicleState={vehicleState} />
        <div className="damage-meter" data-severity={getDamageSeverity(vehicleState.mechanicalDamage)}>
          <div className="damage-meter__label">
            <span>
              <Wrench size={14} />
              Damage
            </span>
            <strong>{damagePercent}%</strong>
          </div>
          <div className="damage-meter__track" aria-label={`Vehicle damage ${damagePercent}%`}>
            <span className="damage-meter__fill" style={damageStyle} />
          </div>
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
        <span>R recover</span>
        <span>Enter retry</span>
        <span>1/2/3 camera</span>
      </footer>
    </section>
  );
}

function RouteMap({
  gateHuntProgress,
  vehicleState,
}: {
  readonly gateHuntProgress: GateHuntProgress;
  readonly vehicleState: VehicleState;
}) {
  const worldToMap = (x: number, z: number) => ({
    x: 10 + ((x + 120) / 240) * 140,
    y: 10 + ((120 - z) / 240) * 86,
  });
  const vehiclePoint = worldToMap(vehicleState.x, vehicleState.z);
  const activeGate = gateTargets[gateHuntProgress.activeGateIndex];
  const activePoint = worldToMap(activeGate.x, activeGate.z);
  const routePoints = gateTargets
    .map((gate) => worldToMap(gate.x, gate.z))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  return (
    <div className="route-map" aria-label="Mini route map">
      <svg viewBox="0 0 160 106" role="img" aria-label={`Vehicle route to gate ${gateHuntProgress.activeGateId}`}>
        <polyline className="route-map__route" points={routePoints} />
        {gateTargets.map((gate, index) => {
          const point = worldToMap(gate.x, gate.z);
          const isActive = index === gateHuntProgress.activeGateIndex;

          return (
            <g key={gate.id} className="route-map__gate" data-active={isActive ? 'true' : 'false'}>
              <circle cx={point.x} cy={point.y} r={isActive ? 5.5 : 4} />
              <text x={point.x} y={point.y + 1.8}>
                {gate.id}
              </text>
            </g>
          );
        })}
        <line className="route-map__heading" x1={vehiclePoint.x} y1={vehiclePoint.y} x2={activePoint.x} y2={activePoint.y} />
        <path
          className="route-map__vehicle"
          d={`M ${vehiclePoint.x} ${vehiclePoint.y - 5} L ${vehiclePoint.x + 4.5} ${vehiclePoint.y + 4} L ${vehiclePoint.x} ${vehiclePoint.y + 2} L ${vehiclePoint.x - 4.5} ${vehiclePoint.y + 4} Z`}
          transform={`rotate(${(vehicleState.yaw * 180) / Math.PI} ${vehiclePoint.x} ${vehiclePoint.y})`}
        />
      </svg>
    </div>
  );
}

function getDamageSeverity(mechanicalDamage: number) {
  if (mechanicalDamage >= 90) {
    return 'critical';
  }

  if (mechanicalDamage >= 60) {
    return 'major';
  }

  if (mechanicalDamage >= 30) {
    return 'minor';
  }

  return 'clean';
}
