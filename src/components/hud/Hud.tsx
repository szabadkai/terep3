import { Code2, RotateCcw, Wrench } from 'lucide-react';
import { formatGateDistance, formatRaceTime, gateTargets, type GateHuntProgress } from '../../game/gateHunt';
import { featuredMode } from '../../game/modes';
import type { VehicleState } from '../../game/vehicleDynamics';

type HudProps = {
  readonly gateHuntProgress: GateHuntProgress;
  readonly vehicleState: VehicleState;
  readonly onRetryGateHunt?: () => void;
};

export function Hud({ gateHuntProgress, vehicleState, onRetryGateHunt }: HudProps) {
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
          <p className="hud__kicker">Terep3</p>
          <h1>{featuredMode.label}</h1>
        </div>
        <div className="hud__actions" aria-label="Project links">
          <a className="icon-button" href="https://github.com/szabadkai/terep3" aria-label="GitHub repository">
            <Code2 size={19} />
          </a>
        </div>
      </header>

      <section className="hud-panel hud-panel--compact" aria-labelledby="featured-mode">
        <div className="gate-focus" aria-label={`Active gate ${gateHuntProgress.activeGateId}`}>
          <span className="gate-focus__arrow" style={gateHeadingStyle} aria-hidden="true" />
          <div>
            <h2 id="featured-mode">Gate {gateHuntProgress.activeGateId}</h2>
            <span>
              {gateHuntProgress.completedRuns > 0 ? `${gateHuntProgress.completedRuns} runs` : 'Run active'} / Next{' '}
              {nextGateId}
            </span>
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

        <div className="race-grid" aria-label="Gate Hunt progress">
          <HudStat label="Cleared" value={`${gateHuntProgress.gatesCleared}/${gateHuntProgress.totalGates}`} />
          <HudStat label="Distance" value={formatGateDistance(gateHuntProgress.distanceToGate)} />
          <HudStat label="Time" value={formatRaceTime(gateHuntProgress.elapsedSeconds)} />
          <HudStat label="Best" value={formatRaceTime(gateHuntProgress.bestSeconds)} />
        </div>

        <div className="hud-row">
          <RouteMap gateHuntProgress={gateHuntProgress} vehicleState={vehicleState} />
          <div className="hud-row__stack">
            {gateHuntProgress.lastRunSeconds !== undefined && (
              <div className="run-feedback" data-improved={gateHuntProgress.bestTimeImproved ? 'true' : 'false'}>
                <strong>{gateHuntProgress.bestTimeImproved ? 'Best run' : 'Last run'}</strong>
                <span>{formatRaceTime(gateHuntProgress.lastRunSeconds)}</span>
              </div>
            )}
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
          </div>
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

function HudStat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <span className="hud-stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
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
