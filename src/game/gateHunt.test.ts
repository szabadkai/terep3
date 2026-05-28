import { describe, expect, it } from 'vitest';
import { formatGateDistance, formatRaceTime, gateTargets, initialGateHuntProgress, updateGateHuntProgress } from './gateHunt';
import { initialVehicleState } from './vehicleDynamics';

describe('gate hunt', () => {
  it('advances to the next gate when the vehicle reaches the active gate', () => {
    const activeGate = gateTargets[initialGateHuntProgress.activeGateIndex];
    const next = updateGateHuntProgress(
      initialGateHuntProgress,
      { ...initialVehicleState, x: activeGate.x, z: activeGate.z },
      1.2,
    );

    expect(next.gatesCleared).toBe(1);
    expect(next.activeGateIndex).toBe(1);
  });

  it('formats unset values cleanly', () => {
    expect(formatRaceTime(undefined)).toBe('--');
    expect(formatGateDistance(Number.POSITIVE_INFINITY)).toBe('--');
  });
});
