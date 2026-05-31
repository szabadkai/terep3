import type { VehicleState } from './vehicleDynamics';

export type GateTarget = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
};

export type GateHuntProgress = {
  readonly activeGateIndex: number;
  readonly activeGateId: string;
  readonly gatesCleared: number;
  readonly totalGates: number;
  readonly elapsedSeconds: number;
  readonly distanceToGate: number;
  readonly headingToGate: number;
  readonly completedRuns: number;
  readonly bestSeconds?: number;
  readonly lastRunSeconds?: number;
  readonly bestTimeImproved?: boolean;
  /** Per-gate split times from the most recent completed run (individual gate times) */
  readonly splitTimes?: readonly number[];
  /** Cooldown timer to prevent gate double-triggering */
  readonly gateCooldownSeconds: number;
  /** Cumulative times at each gate during the current run */
  readonly runSplits: readonly number[];
};

export const gateTargets: readonly GateTarget[] = [
  { id: 'A', x: -428, z: -345 },
  { id: 'B', x: -112, z: -472 },
  { id: 'C', x: 240, z: -390 },
  { id: 'D', x: 472, z: -105 },
  { id: 'E', x: 368, z: 285 },
  { id: 'F', x: 30, z: 472 },
  { id: 'G', x: -345, z: 375 },
  { id: 'H', x: -532, z: -22 },
  { id: 'I', x: -495, z: -285 },
] as const;

export const targetCircuitSeconds = 180;

export function getGateCircuitLength() {
  return gateTargets.reduce((length, gate, index) => {
    const nextGate = gateTargets[(index + 1) % gateTargets.length];
    return length + Math.hypot(gate.x - nextGate.x, gate.z - nextGate.z);
  }, 0);
}

export const initialGateHuntProgress: GateHuntProgress = {
  activeGateIndex: 0,
  activeGateId: gateTargets[0].id,
  gatesCleared: 0,
  totalGates: gateTargets.length,
  elapsedSeconds: 0,
  distanceToGate: Number.POSITIVE_INFINITY,
  headingToGate: 0,
  completedRuns: 0,
  gateCooldownSeconds: 0,
  runSplits: [],
};

/**
 * Advances Gate Hunt timing and gate progression for the current vehicle pose.
 *
 * The function records cumulative run splits as gates are cleared, converts
 * them to per-gate split times when a run completes, and applies a short gate
 * cooldown to prevent duplicate triggers while the vehicle remains inside the
 * checkpoint radius.
 */
export function updateGateHuntProgress(
  progress: GateHuntProgress,
  vehicle: VehicleState,
  deltaSeconds: number,
): GateHuntProgress {
  const activeGate = gateTargets[progress.activeGateIndex];
  const distanceToGate = Math.hypot(vehicle.x - activeGate.x, vehicle.z - activeGate.z);
  const headingToGate = Math.atan2(activeGate.x - vehicle.x, activeGate.z - vehicle.z);
  const elapsedSeconds = progress.elapsedSeconds + deltaSeconds;
  const gateCooldownSeconds = Math.max(0, progress.gateCooldownSeconds - deltaSeconds);

  if (distanceToGate > 4.2 || gateCooldownSeconds > 0) {
    return {
      ...progress,
      elapsedSeconds,
      distanceToGate,
      headingToGate,
      bestTimeImproved: false,
      gateCooldownSeconds,
    };
  }

  const nextCleared = progress.gatesCleared + 1;
  const runComplete = nextCleared >= gateTargets.length;
  const previousBest = progress.bestSeconds ?? Number.POSITIVE_INFINITY;
  const bestSeconds = runComplete
    ? Math.min(previousBest, elapsedSeconds)
    : progress.bestSeconds;
  const nextGateIndex = runComplete ? 0 : (progress.activeGateIndex + 1) % gateTargets.length;
  const updatedRunSplits = [...progress.runSplits, elapsedSeconds];
  const splitTimes = runComplete
    ? updatedRunSplits.map((cumulative, i) => cumulative - (updatedRunSplits[i - 1] ?? 0))
    : progress.splitTimes;

  return {
    activeGateIndex: nextGateIndex,
    activeGateId: gateTargets[nextGateIndex].id,
    gatesCleared: runComplete ? 0 : nextCleared,
    totalGates: gateTargets.length,
    elapsedSeconds: runComplete ? 0 : elapsedSeconds,
    distanceToGate: runComplete ? 0 : distanceToGate,
    headingToGate,
    completedRuns: progress.completedRuns + Number(runComplete),
    bestSeconds,
    lastRunSeconds: runComplete ? elapsedSeconds : progress.lastRunSeconds,
    bestTimeImproved: runComplete && elapsedSeconds < previousBest,
    splitTimes,
    gateCooldownSeconds: 0.6,
    runSplits: runComplete ? [] : updatedRunSplits,
  };
}

export function resetGateHuntRun(progress: GateHuntProgress, vehicle: VehicleState): GateHuntProgress {
  const activeGate = gateTargets[0];

  return {
    activeGateIndex: 0,
    activeGateId: activeGate.id,
    gatesCleared: 0,
    totalGates: gateTargets.length,
    elapsedSeconds: 0,
    distanceToGate: Math.hypot(vehicle.x - activeGate.x, vehicle.z - activeGate.z),
    headingToGate: Math.atan2(activeGate.x - vehicle.x, activeGate.z - vehicle.z),
    completedRuns: progress.completedRuns,
    bestSeconds: progress.bestSeconds,
    lastRunSeconds: progress.lastRunSeconds,
    bestTimeImproved: false,
    splitTimes: progress.splitTimes,
    gateCooldownSeconds: 0,
    runSplits: [],
  };
}

export function formatRaceTime(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return '--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
}

export function formatGateDistance(distance: number) {
  if (!Number.isFinite(distance)) {
    return '--';
  }

  return `${Math.round(distance)}m`;
}
