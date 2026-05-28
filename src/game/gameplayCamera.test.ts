import { describe, expect, it } from 'vitest';
import { getGameplayCameraPose, type GameplayCameraView } from './gameplayCamera';
import { initialVehicleState } from './vehicleDynamics';

describe('gameplay camera', () => {
  it('keeps chase, slope, and close-up views at distinct validation distances', () => {
    const distances = getCameraViews().map((view) => ({
      view,
      distance: distanceToTarget(getGameplayCameraPose(initialVehicleState, view)),
    }));

    expect(distances.find(({ view }) => view === 'close')?.distance).toBeLessThan(
      distances.find(({ view }) => view === 'chase')?.distance ?? 0,
    );
    expect(distances.find(({ view }) => view === 'slope')?.distance).toBeGreaterThan(
      distances.find(({ view }) => view === 'chase')?.distance ?? 0,
    );
  });

  it('aims every camera view at the vehicle body instead of the ground plane', () => {
    getCameraViews().forEach((view) => {
      const pose = getGameplayCameraPose(initialVehicleState, view);

      expect(pose.target[0]).toBe(initialVehicleState.x);
      expect(pose.target[1]).toBeGreaterThan(initialVehicleState.bodyHeight);
      expect(pose.target[2]).toBe(initialVehicleState.z);
      expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
    });
  });
});

function getCameraViews(): readonly GameplayCameraView[] {
  return ['chase', 'slope', 'close'];
}

function distanceToTarget(pose: ReturnType<typeof getGameplayCameraPose>) {
  return Math.hypot(
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  );
}
