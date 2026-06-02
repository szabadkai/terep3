import { Code2, Music2, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatGateDistance, formatRaceTime, gateTargets, type GateHuntProgress } from '../../game/gateHunt';
import { featuredMode } from '../../game/modes';
import { playableHalfSize } from '../../game/terrain';
import type { VehicleState } from '../../game/vehicleDynamics';

type HudProps = {
  readonly gateHuntProgress: GateHuntProgress;
  readonly vehicleState: VehicleState;
  readonly onRetryGateHunt?: () => void;
  readonly musicEnabled?: boolean;
  readonly sfxEnabled?: boolean;
  readonly musicTrackLabel?: string;
  readonly onToggleMusic?: () => void;
  readonly onToggleSfx?: () => void;
  readonly onNextMusicTrack?: () => void;
};

export function Hud({
  gateHuntProgress,
  vehicleState,
  onRetryGateHunt,
  musicEnabled = false,
  sfxEnabled = false,
  musicTrackLabel = 'Music',
  onToggleMusic,
  onToggleSfx,
  onNextMusicTrack,
}: HudProps) {
  const gateHeadingStyle = {
    transform: `rotate(${gateHuntProgress.headingToGate}rad)`,
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
          <button
            type="button"
            className="icon-button"
            aria-label={musicEnabled ? 'Mute music' : 'Enable music'}
            aria-pressed={musicEnabled}
            title={musicTrackLabel}
            onClick={onToggleMusic}
          >
            {musicEnabled ? <Music2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={sfxEnabled ? 'Mute SFX' : 'Enable SFX'}
            aria-pressed={sfxEnabled}
            onClick={onToggleSfx}
          >
            {sfxEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Next music track: ${musicTrackLabel}`}
            onClick={onNextMusicTrack}
          >
            <SkipForward size={19} />
          </button>
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
              <RunReview gateHuntProgress={gateHuntProgress} />
            )}
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

function RunReview({ gateHuntProgress }: { readonly gateHuntProgress: GateHuntProgress }) {
  return (
    <details className="run-review" data-improved={gateHuntProgress.bestTimeImproved ? 'true' : 'false'}>
      <summary>
        <strong>{gateHuntProgress.bestTimeImproved ? 'Best run' : 'Last run'}</strong>
        <span>{formatRaceTime(gateHuntProgress.lastRunSeconds)}</span>
      </summary>
      {gateHuntProgress.splitTimes && (
        <ol className="split-list" aria-label="Last run split times">
          {gateHuntProgress.splitTimes.map((split, index) => (
            <li key={gateTargets[index].id}>
              <span>{gateTargets[index].id}</span>
              <strong>{formatRaceTime(split)}</strong>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

function RouteMap({
  gateHuntProgress,
  vehicleState,
}: {
  readonly gateHuntProgress: GateHuntProgress;
  readonly vehicleState: VehicleState;
}) {
  const mapPadding = 8;
  const mapWidth = 160;
  const mapHeight = 106;
  const mapWorldSize = playableHalfSize * 2;
  const worldToMap = (x: number, z: number) => ({
    x: mapPadding + ((x + playableHalfSize) / mapWorldSize) * (mapWidth - mapPadding * 2),
    y: mapPadding + ((playableHalfSize - z) / mapWorldSize) * (mapHeight - mapPadding * 2),
  });
  const vehiclePoint = worldToMap(vehicleState.x, vehicleState.z);
  const activeGate = gateTargets[gateHuntProgress.activeGateIndex];
  const activePoint = worldToMap(activeGate.x, activeGate.z);
  const routePoints = gateTargets
    .concat(gateTargets[0])
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
