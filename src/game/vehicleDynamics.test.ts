import { describe, expect, it } from 'vitest';
import { playableHalfSize, terrainHeight } from './terrain';
import { calculateContactPlaneAttitude, initialVehicleState, updateVehicleState, type WheelContact } from './vehicleDynamics';
import { vehicleCatalog } from './vehicles';

describe('updateVehicleState', () => {
  it('accelerates forward when throttle is applied', () => {
    const next = updateVehicleState(
      initialVehicleState,
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      1,
    );

    expect(next.speed).toBeGreaterThan(initialVehicleState.speed);
  });

  it('turns more slowly from rest than at speed', () => {
    const still = updateVehicleState(
      initialVehicleState,
      { throttle: 0, brake: 0, steering: 1 },
      vehicleCatalog[0],
      1,
    );
    const moving = updateVehicleState(
      { ...initialVehicleState, velocityX: 16, velocityZ: 18, speed: 24 },
      { throttle: 0, brake: 0, steering: 1 },
      vehicleCatalog[0],
      1,
    );

    expect(Math.abs(moving.yaw - initialVehicleState.yaw)).toBeGreaterThan(
      Math.abs(still.yaw - initialVehicleState.yaw),
    );
  });

  it('uses negative steering input for the corrected right-turn convention', () => {
    const next = updateVehicleState(
      { ...initialVehicleState, yaw: 0, velocityX: 0, velocityZ: 18, speed: 18 },
      { throttle: 0, brake: 0, steering: -1 },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.yaw).toBeLessThan(0);
  });

  it('keeps vehicle state inside the playable terrain bounds', () => {
    const next = updateVehicleState(
      { ...initialVehicleState, x: playableHalfSize, z: playableHalfSize, speed: 38 },
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      5,
    );

    expect(next.x).toBeLessThanOrEqual(playableHalfSize);
    expect(next.z).toBeLessThanOrEqual(playableHalfSize);
  });

  it('damps sideways velocity through tire grip', () => {
    const next = updateVehicleState(
      { ...initialVehicleState, velocityX: 20, velocityZ: -18, yaw: 0, speed: 0 },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(Math.abs(next.velocityX)).toBeLessThan(20);
  });

  it('keeps the body height above the terrain through suspension travel', () => {
    const next = updateVehicleState(
      { ...initialVehicleState, bodyHeight: initialVehicleState.bodyHeight + 3, verticalVelocity: -8 },
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.bodyHeight).toBeGreaterThan(terrainHeight(next.x, next.z) + 0.8);
    expect(next.suspensionTravel).toBeGreaterThanOrEqual(-1);
    expect(next.suspensionTravel).toBeLessThanOrEqual(1);
  });

  it('can enter an airborne state when the body is above suspension reach', () => {
    const next = updateVehicleState(
      { ...initialVehicleState, bodyHeight: initialVehicleState.bodyHeight + 3.2, verticalVelocity: 2.4 },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.airborne).toBe(true);
    expect(next.verticalVelocity).toBeLessThan(2.4);
  });

  it('derives pitch and roll from a diagonal four-wheel contact plane', () => {
    const contacts: readonly WheelContact[] = [
      makeContact('front-left', -1, 1, 0.1),
      makeContact('front-right', 1, 1, 0.9),
      makeContact('rear-left', -1, -1, -0.9),
      makeContact('rear-right', 1, -1, -0.1),
    ];

    const attitude = calculateContactPlaneAttitude(contacts);

    expect(Math.abs(attitude.pitch)).toBeGreaterThan(0.2);
    expect(Math.abs(attitude.roll)).toBeGreaterThan(0.2);
  });

  it('rolls the right side up when the right wheels are higher', () => {
    const contacts: readonly WheelContact[] = [
      makeContact('front-left', -1, 1, 0),
      makeContact('front-right', 1, 1, 1),
      makeContact('rear-left', -1, -1, 0),
      makeContact('rear-right', 1, -1, 1),
    ];

    const attitude = calculateContactPlaneAttitude(contacts);

    expect(attitude.roll).toBeGreaterThan(0);
    expect(Math.abs(attitude.pitch)).toBeLessThan(0.01);
  });
});

function makeContact(id: string, localX: number, localZ: number, groundHeight: number): WheelContact {
  return {
    id,
    localX,
    localZ,
    worldX: localX,
    worldZ: localZ,
    groundHeight,
    compression: 0,
  };
}
