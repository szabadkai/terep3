import type { VehicleState } from './vehicleDynamics';

export type GateTarget = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
};

export type GateHuntProgress = {
  readonly activeGateIndex: number;
  readonly gatesCleared: number;
  readonly totalGates: number;
  readonly elapsedSeconds: number;
  readonly distanceToGate: number;
  readonly completedRuns: number;
  readonly bestSeconds?: number;
};

export const gateTargets: readonly GateTarget[] = [
  { id: 'A', x: -74, z: -58 },
  { id: 'B', x: -34, z: 8 },
  { id: 'C', x: 26, z: -24 },
  { id: 'D', x: 78, z: 42 },
  { id: 'E', x: 12, z: 92 },
  { id: 'F', x: -82, z: 70 },
] as const;

export const initialGateHuntProgress: GateHuntProgress = {
  activeGateIndex: 0,
  gatesCleared: 0,
  totalGates: gateTargets.length,
  elapsedSeconds: 0,
  distanceToGate: Number.POSITIVE_INFINITY,
  completedRuns: 0,
};

export function updateGateHuntProgress(
  progress: GateHuntProgress,
  vehicle: VehicleState,
  deltaSeconds: number,
): GateHuntProgress {
  const activeGate = gateTargets[progress.activeGateIndex];
  const distanceToGate = Math.hypot(vehicle.x - activeGate.x, vehicle.z - activeGate.z);
  const elapsedSeconds = progress.elapsedSeconds + deltaSeconds;

  if (distanceToGate > 4.2) {
    return {
      ...progress,
      elapsedSeconds,
      distanceToGate,
    };
  }

  const nextCleared = progress.gatesCleared + 1;
  const runComplete = nextCleared >= gateTargets.length;
  const bestSeconds = runComplete
    ? Math.min(progress.bestSeconds ?? Number.POSITIVE_INFINITY, elapsedSeconds)
    : progress.bestSeconds;

  return {
    activeGateIndex: runComplete ? 0 : (progress.activeGateIndex + 1) % gateTargets.length,
    gatesCleared: runComplete ? 0 : nextCleared,
    totalGates: gateTargets.length,
    elapsedSeconds: runComplete ? 0 : elapsedSeconds,
    distanceToGate: runComplete ? 0 : distanceToGate,
    completedRuns: progress.completedRuns + Number(runComplete),
    bestSeconds,
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
