import { describe, expect, it } from 'vitest';
import {
  formatGateDistance,
  formatRaceTime,
  gateTargets,
  initialGateHuntProgress,
  resetGateHuntRun,
  updateGateHuntProgress,
} from './gateHunt';
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
    expect(next.activeGateId).toBe('B');
  });

  it('records best time and starts the route over after the final gate', () => {
    const finalGate = gateTargets[gateTargets.length - 1];
    const next = updateGateHuntProgress(
      {
        ...initialGateHuntProgress,
        activeGateIndex: gateTargets.length - 1,
        gatesCleared: gateTargets.length - 1,
        elapsedSeconds: 42,
      },
      { ...initialVehicleState, x: finalGate.x, z: finalGate.z },
      1.25,
    );

    expect(next.activeGateIndex).toBe(0);
    expect(next.gatesCleared).toBe(0);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.completedRuns).toBe(1);
    expect(next.bestSeconds).toBe(43.25);
    expect(next.lastRunSeconds).toBe(43.25);
    expect(next.bestTimeImproved).toBe(true);
  });

  it('resets a retry run without clearing completed run history or best time', () => {
    const next = resetGateHuntRun(
      {
        ...initialGateHuntProgress,
        activeGateIndex: 3,
        gatesCleared: 3,
        elapsedSeconds: 31.4,
        completedRuns: 2,
        bestSeconds: 58.8,
        lastRunSeconds: 61.2,
      },
      initialVehicleState,
    );

    expect(next.activeGateIndex).toBe(0);
    expect(next.gatesCleared).toBe(0);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.completedRuns).toBe(2);
    expect(next.bestSeconds).toBe(58.8);
    expect(next.lastRunSeconds).toBe(61.2);
    expect(next.bestTimeImproved).toBe(false);
    expect(next.distanceToGate).toBeGreaterThan(0);
    expect(Number.isFinite(next.headingToGate)).toBe(true);
  });

  it('tracks active gate heading while the vehicle is away from the checkpoint', () => {
    const next = updateGateHuntProgress(initialGateHuntProgress, initialVehicleState, 0.5);

    expect(next.activeGateId).toBe('A');
    expect(next.distanceToGate).toBeGreaterThan(0);
    expect(next.headingToGate).toBeLessThan(0);
  });

  it('formats unset values cleanly', () => {
    expect(formatRaceTime(undefined)).toBe('--');
    expect(formatGateDistance(Number.POSITIVE_INFINITY)).toBe('--');
  });
});
