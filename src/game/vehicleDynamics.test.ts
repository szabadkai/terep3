import { describe, expect, it } from 'vitest';
import { playableHalfSize, terrainHeight } from './terrain';
import {
  calculateContactPlaneAttitude,
  calculateDamageEffects,
  getWheelContactGroundHeight,
  initialVehicleState,
  resetVehicleForGateHunt,
  updateVehicleState,
  type ControlInput,
  type VehicleState,
  type WheelContact,
} from './vehicleDynamics';
import { vehicleCatalog } from './vehicles';
import { suspensionRestLength, wheelLayout, wheelRadius } from './wheelLayout';

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

  it('blocks terrain steps that are too steep to climb', () => {
    const start = makeVehicleStateAt(-18, 28, 0);
    const staleLowContacts = start.wheelContacts.map((contact) => ({
      ...contact,
      groundHeight: contact.groundHeight - 3,
    }));
    const next = updateVehicleState(
      {
        ...start,
        velocityX: 0,
        velocityZ: 14,
        speed: 14,
        wheelContacts: staleLowContacts,
      },
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(next.z).toBe(start.z);
    expect(next.speed).toBeLessThan(0);
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

  it('keeps more lateral slide on low-grip water than rock', () => {
    const water = updateVehicleState(
      { ...makeVehicleStateAt(-10, 96, 0), velocityX: 14, velocityZ: 0, speed: 0 },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );
    const rock = updateVehicleState(
      { ...makeVehicleStateAt(-102, 60, 0), velocityX: 14, velocityZ: 0, speed: 0 },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(Math.abs(water.velocityX)).toBeGreaterThan(Math.abs(rock.velocityX));
  });

  it('climbs a repeatable grass test hill under sustained throttle', () => {
    const start = makeVehicleStateAt(-12, 16, Math.atan2(0.39495092012806643, 0.05867509264925598));
    const next = simulateDrive(start, { throttle: 1, brake: 0, steering: 0 }, 3.2);

    expect(terrainHeight(next.x, next.z)).toBeGreaterThan(terrainHeight(start.x, start.z) + 0.7);
    expect(next.speed).toBeGreaterThan(4);
    expect(next.overturned).toBe(false);
  });

  it('brakes a moving vehicle to a much lower forward speed', () => {
    const start = { ...makeVehicleStateAt(12, 90, 0), velocityX: 0, velocityZ: 22, speed: 22 };
    const next = simulateDrive(start, { throttle: 0, brake: 1, steering: 0 }, 1);

    expect(next.speed).toBeLessThan(7);
  });

  it('does not turn brake input into reverse force while moving forward at speed', () => {
    const start = { ...makeVehicleStateAt(12, 90, 0), velocityX: 0, velocityZ: 18, speed: 18 };
    const next = updateVehicleState(start, { throttle: 0, brake: 1, steering: 0 }, vehicleCatalog[0], 0.2);

    expect(next.speed).toBeGreaterThan(0);
    expect(next.speed).toBeLessThan(start.speed);
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

  it('launches from a sharp crest when the ground drops away at speed', () => {
    const start = makeVehicleStateAt(-18, 28, 0);
    const liftedPreviousContacts = start.wheelContacts.map((contact) => ({
      ...contact,
      groundHeight: contact.groundHeight + 2.4,
    }));
    const next = updateVehicleState(
      {
        ...start,
        velocityX: 0,
        velocityZ: 18,
        speed: 18,
        bodyHeight: start.bodyHeight + 0.36,
        wheelContacts: liftedPreviousContacts,
      },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(next.airborne).toBe(true);
    expect(next.verticalVelocity).toBeGreaterThan(0);
  });

  it('absorbs the first landing frame after reconnecting with ground contact', () => {
    const start = makeVehicleStateAt(-22, 34, 0);
    const next = updateVehicleState(
      {
        ...start,
        airborne: true,
        bodyHeight: start.bodyHeight + 0.08,
        verticalVelocity: -8,
      },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(next.airborne).toBe(false);
    expect(next.verticalVelocity).toBeGreaterThan(-5);
  });

  it('adds bounded damage for hard landings instead of a runaway wreck', () => {
    const start = makeVehicleStateAt(-22, 34, 0);
    const next = updateVehicleState(
      {
        ...start,
        airborne: true,
        bodyHeight: start.bodyHeight + 0.08,
        verticalVelocity: -10,
        velocityX: 0,
        velocityZ: 24,
        speed: 24,
      },
      { throttle: 0, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.05,
    );

    expect(next.damage).toBeGreaterThan(0);
    expect(next.cosmeticDamage).toBeLessThanOrEqual(7.5);
    expect(next.mechanicalDamage).toBeLessThanOrEqual(3);
    expect(next.mechanicalDamage).toBeLessThan(next.cosmeticDamage);
  });

  it('reconnects to ground after a small jump cycle', () => {
    const start = makeVehicleStateAt(-22, 34, 0);
    let next: VehicleState = {
      ...start,
      airborne: true,
      bodyHeight: start.bodyHeight + 1.3,
      verticalVelocity: 1.4,
    };

    for (let elapsed = 0; elapsed < 1.1 && next.airborne; elapsed += 0.05) {
      next = updateVehicleState(next, { throttle: 0, brake: 0, steering: 0 }, vehicleCatalog[0], 0.05);
    }

    expect(next.airborne).toBe(false);
    expect(next.bodyHeight).toBeGreaterThan(terrainHeight(next.x, next.z) + wheelRadius);
    expect(next.verticalVelocity).toBeGreaterThan(-6);
  });

  it('can roll over on steep terrain under enough speed stress', () => {
    const next = updateVehicleState(
      {
        ...initialVehicleState,
        x: 18,
        z: -27,
        yaw: 3.6,
        velocityX: -18,
        velocityZ: -36,
        speed: 40,
        rolloverRisk: 0.82,
      },
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      1,
    );

    expect(next.overturned).toBe(true);
    expect(Math.abs(next.roll)).toBeGreaterThan(1);
    expect(next.airborne).toBe(false);
    expect(next.damage).toBeGreaterThan(0);
  });

  it('recovers an overturned vehicle onto its wheels', () => {
    const next = updateVehicleState(
      {
        ...initialVehicleState,
        velocityX: 12,
        velocityZ: -4,
        speed: 12,
        roll: 2.55,
        rolloverRisk: 1,
        overturned: true,
        recoveryCooldown: 0,
      },
      { throttle: 0, brake: 0, steering: 0, recover: true },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.overturned).toBe(false);
    expect(next.rolloverRisk).toBe(0);
    expect(next.speed).toBe(0);
    expect(next.roll).toBe(0);
    expect(next.bodyHeight).toBeGreaterThan(terrainHeight(next.x, next.z) + wheelRadius);
    expect(next.recoveryCooldown).toBeGreaterThan(0);
    expect(next.recoveryPenalty).toBe(3);
  });

  it('lets normal drive input recover an overturned vehicle', () => {
    const next = updateVehicleState(
      {
        ...initialVehicleState,
        roll: 2.55,
        rolloverRisk: 1,
        overturned: true,
        recoveryCooldown: 0,
      },
      { throttle: 1, brake: 0, steering: 0 },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.overturned).toBe(false);
    expect(next.speed).toBe(0);
    expect(next.recoveryPenalty).toBe(3);
  });

  it('preserves damage when recovering an overturned vehicle', () => {
    const next = updateVehicleState(
      {
        ...initialVehicleState,
        damage: 48,
        cosmeticDamage: 48,
        mechanicalDamage: 36,
        overturned: true,
        rolloverRisk: 1,
        recoveryCooldown: 0,
      },
      { throttle: 0, brake: 0, steering: 0, recover: true },
      vehicleCatalog[0],
      0.16,
    );

    expect(next.damage).toBe(48);
    expect(next.cosmeticDamage).toBe(48);
    expect(next.mechanicalDamage).toBe(36);
  });

  it('uses damage as a gentle acceleration penalty without steering or grip penalties', () => {
    expect(calculateDamageEffects(0)).toEqual({
      accelerationScale: 1,
    });
    expect(calculateDamageEffects(8).accelerationScale).toBeGreaterThan(0.95);
    expect(calculateDamageEffects(60).accelerationScale).toBeLessThan(calculateDamageEffects(30).accelerationScale);
    expect(calculateDamageEffects(100).accelerationScale).toBeGreaterThanOrEqual(0.55);
  });

  it('resets Gate Hunt retries to the start line with a clean vehicle', () => {
    const next = resetVehicleForGateHunt();

    expect(next.x).toBe(initialVehicleState.x);
    expect(next.z).toBe(initialVehicleState.z);
    expect(next.speed).toBe(0);
    expect(next.damage).toBe(0);
    expect(next.overturned).toBe(false);
  });

  it('respects recovery cooldown', () => {
    const first = updateVehicleState(
      {
        ...initialVehicleState,
        overturned: true,
        rolloverRisk: 1,
        recoveryCooldown: 0,
      },
      { throttle: 0, brake: 0, steering: 0, recover: true },
      vehicleCatalog[0],
      0.1,
    );

    expect(first.overturned).toBe(false);
    expect(first.recoveryCooldown).toBeGreaterThan(1.5);

    // Now try to recover again while cooldown is active
    const second = updateVehicleState(
      { ...first, overturned: true, rolloverRisk: 1 },
      { throttle: 0, brake: 0, steering: 0, recover: true },
      vehicleCatalog[0],
      0.1,
    );

    expect(second.overturned).toBe(true);
    expect(second.recoveryCooldown).toBeGreaterThan(1);
  });

  it('handbrake reduces lateral grip for slides on side-speeds', () => {
    // Car moving with side component — handbrake should reduce grip, letting it slide more
    const without = simulateDrive(
      { ...initialVehicleState, velocityX: 14, velocityZ: 0, speed: 14, yaw: 0 },
      { throttle: 0, brake: 0, steering: 0, handbrake: 0 },
      0.5,
    );
    const withHandbrake = simulateDrive(
      { ...initialVehicleState, velocityX: 14, velocityZ: 0, speed: 14, yaw: 0 },
      { throttle: 0, brake: 0, steering: 0, handbrake: 1 },
      0.5,
    );

    // With handbrake and sideways velocity, lateral grip is reduced
    // so more sideways speed is retained (less deceleration)
    expect(Math.abs(withHandbrake.velocityX)).toBeGreaterThan(Math.abs(without.velocityX));
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

  it('keeps the tire footprint above nearby terrain samples', () => {
    const x = -42;
    const z = -33;
    const yaw = 0.64;
    const axleHeight = getWheelContactGroundHeight(x, z, yaw) + wheelRadius;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const sideX = Math.cos(yaw);
    const sideZ = -Math.sin(yaw);
    const forwardOffsets = [-0.92, -0.46, 0, 0.46, 0.92].map((amount) => amount * wheelRadius);
    const sideOffsets = [-0.36, 0, 0.36];

    forwardOffsets.forEach((forwardOffset) => {
      sideOffsets.forEach((sideOffset) => {
        const sampleX = x + forwardX * forwardOffset + sideX * sideOffset;
        const sampleZ = z + forwardZ * forwardOffset + sideZ * sideOffset;
        const tireProfileHeight = Math.sqrt(Math.max(0, wheelRadius * wheelRadius - forwardOffset * forwardOffset));

        expect(axleHeight - tireProfileHeight).toBeGreaterThan(terrainHeight(sampleX, sampleZ));
      });
    });
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

function makeVehicleStateAt(x: number, z: number, yaw: number): VehicleState {
  const wheelContacts = wheelLayout.map((wheel) => {
    const worldX = x + Math.cos(yaw) * wheel.x + Math.sin(yaw) * wheel.z;
    const worldZ = z - Math.sin(yaw) * wheel.x + Math.cos(yaw) * wheel.z;

    return makeContact(wheel.id, wheel.x, wheel.z, getWheelContactGroundHeight(worldX, worldZ, yaw));
  });
  const averageWheelGround =
    wheelContacts.reduce((total, contact) => total + contact.groundHeight, 0) / wheelContacts.length;

  return {
    ...initialVehicleState,
    x,
    z,
    yaw,
    velocityX: 0,
    velocityZ: 0,
    bodyHeight: averageWheelGround + wheelRadius + suspensionRestLength,
    verticalVelocity: 0,
    pitch: 0,
    roll: 0,
    suspensionTravel: 0,
    wheelContacts,
    airborne: false,
    speed: 0,
    rolloverRisk: 0,
    overturned: false,
  };
}

function simulateDrive(state: VehicleState, input: ControlInput, seconds: number) {
  let next = state;
  const deltaSeconds = 0.05;

  for (let elapsed = 0; elapsed < seconds; elapsed += deltaSeconds) {
    next = updateVehicleState(next, input, vehicleCatalog[0], deltaSeconds);
  }

  return next;
}
