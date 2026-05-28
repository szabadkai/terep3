import type { VehicleState } from './vehicleDynamics';

export type GameplayCameraView = 'chase' | 'slope' | 'close';

export type GameplayCameraPose = {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly smoothing: number;
};

export function getGameplayCameraPose(vehicle: VehicleState, view: GameplayCameraView): GameplayCameraPose {
  const targetHeight = vehicle.bodyHeight + (view === 'close' ? 1.35 : 2.2);
  const target: readonly [number, number, number] = [vehicle.x, targetHeight, vehicle.z];

  if (view === 'slope') {
    return {
      position: [
        vehicle.x - Math.sin(vehicle.yaw + 0.52) * 19,
        vehicle.bodyHeight + 14,
        vehicle.z - Math.cos(vehicle.yaw + 0.52) * 19,
      ],
      target,
      smoothing: 0.075,
    };
  }

  if (view === 'close') {
    return {
      position: [vehicle.x - Math.sin(vehicle.yaw) * 8.4, vehicle.bodyHeight + 3.8, vehicle.z - Math.cos(vehicle.yaw) * 8.4],
      target,
      smoothing: 0.12,
    };
  }

  return {
    position: [vehicle.x - Math.sin(vehicle.yaw) * 16, vehicle.bodyHeight + 8.5, vehicle.z - Math.cos(vehicle.yaw) * 16],
    target,
    smoothing: 0.08,
  };
}
