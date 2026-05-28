import { getSurfaceForPoint } from './surfaces';
import { playableHalfSize, terrainGradient, terrainHeight } from './terrain';
import type { VehicleSpec } from './vehicles';
import { suspensionRestLength, wheelLayout, wheelRadius } from './wheelLayout';

export type ControlInput = {
  readonly throttle: number;
  readonly brake: number;
  readonly steering: number;
  readonly recover?: boolean;
};

export type VehicleState = {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly velocityX: number;
  readonly velocityZ: number;
  readonly bodyHeight: number;
  readonly verticalVelocity: number;
  readonly pitch: number;
  readonly roll: number;
  readonly suspensionTravel: number;
  readonly wheelContacts: readonly WheelContact[];
  readonly airborne: boolean;
  readonly speed: number;
  readonly damage: number;
  readonly rolloverRisk: number;
  readonly overturned: boolean;
};

export type WheelContact = {
  readonly id: string;
  readonly localX: number;
  readonly localZ: number;
  readonly worldX: number;
  readonly worldZ: number;
  readonly groundHeight: number;
  readonly compression: number;
};

export const initialVehicleState: VehicleState = {
  x: -58,
  z: -46,
  yaw: 0.72,
  velocityX: 0,
  velocityZ: 0,
  bodyHeight: terrainHeight(-58, -46) + 1.35,
  verticalVelocity: 0,
  pitch: 0,
  roll: 0,
  suspensionTravel: 0,
  wheelContacts: makeWheelContacts(-58, -46, 0.72),
  airborne: false,
  speed: 0,
  damage: 0,
  rolloverRisk: 0,
  overturned: false,
};

export function updateVehicleState(
  state: VehicleState,
  input: ControlInput,
  vehicle: VehicleSpec,
  deltaSeconds: number,
): VehicleState {
  if (input.recover && state.overturned) {
    return recoverVehicle(state);
  }

  const surface = getSurfaceForPoint(state.x, state.z);
  const traction = clamp(surface.gripMultiplier * (vehicle.grip / 8), 0.2, 1.25);
  const forwardX = Math.sin(state.yaw);
  const forwardZ = Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = -Math.sin(state.yaw);
  const forwardSpeed = state.velocityX * forwardX + state.velocityZ * forwardZ;
  const sideSpeed = state.velocityX * rightX + state.velocityZ * rightZ;
  const reverseIntent = input.brake > 0 && forwardSpeed < 2.4;
  const disabledControlScale = state.overturned ? 0 : 1;
  const brakeForce = reverseIntent ? 0 : input.brake * 20;
  const hillTorque = input.throttle * vehicle.acceleration * clamp(1 - Math.abs(forwardSpeed) / 24, 0.2, 1) * 0.95;
  const driveForce =
    (input.throttle * vehicle.acceleration * 1.34 + hillTorque - Number(reverseIntent) * vehicle.acceleration * 0.72) *
    traction *
    disabledControlScale;
  const lateralGrip = clamp(7.5 + vehicle.grip * 0.8 - Math.abs(forwardSpeed) * 0.045, 3.5, 13) * traction;
  const gradient = terrainGradient(state.x, state.z);
  const drag = surface.drag + state.damage * 0.012;

  let velocityX =
    state.velocityX +
    (forwardX * driveForce -
      forwardX * Math.sign(forwardSpeed) * brakeForce -
      rightX * sideSpeed * lateralGrip -
      gradient.x * 13 -
      state.velocityX * drag) *
      deltaSeconds;
  let velocityZ =
    state.velocityZ +
    (forwardZ * driveForce -
      forwardZ * Math.sign(forwardSpeed) * brakeForce -
      rightZ * sideSpeed * lateralGrip -
      gradient.z * 13 -
      state.velocityZ * drag) *
      deltaSeconds;

  const speed = Math.hypot(velocityX, velocityZ);
  const signedSpeed = velocityX * forwardX + velocityZ * forwardZ;
  const steerSpeedFactor = clamp(speed / 10, 0.18, 1);
  const slidePenalty = clamp(1 - Math.abs(sideSpeed) / 36, 0.42, 1);
  const yaw =
    state.yaw +
    input.steering *
      disabledControlScale *
      steerSpeedFactor *
      traction *
      slidePenalty *
      Math.sign(signedSpeed || 1) *
      2.75 *
      deltaSeconds;
  const x = state.x + velocityX * deltaSeconds;
  const z = state.z + velocityZ * deltaSeconds;
  const boundedX = clamp(x, -playableHalfSize, playableHalfSize);
  const boundedZ = clamp(z, -playableHalfSize, playableHalfSize);

  if (boundedX !== x) {
    velocityX *= -0.22;
  }

  if (boundedZ !== z) {
    velocityZ *= -0.22;
  }

  const suspension = solveSuspension(state, boundedX, boundedZ, velocityX, velocityZ, yaw, vehicle, deltaSeconds);
  const rolloverRisk = calculateRolloverRisk(state, suspension, sideSpeed, speed, deltaSeconds);
  const overturned = state.overturned || rolloverRisk >= 1;
  const resolvedPitch = overturned ? lerp(suspension.pitch, Math.sign(suspension.pitch || state.pitch || 1) * 1.1, 0.55) : suspension.pitch;
  const resolvedRoll = overturned ? Math.sign(suspension.roll || state.roll || sideSpeed || 1) * 2.55 : suspension.roll;
  const damage = clamp(state.damage + estimateImpactDamage(state, boundedX, boundedZ, speed, suspension.suspensionTravel), 0, 100);

  return {
    x: boundedX,
    z: boundedZ,
    yaw,
    velocityX,
    velocityZ,
    bodyHeight: suspension.bodyHeight,
    verticalVelocity: suspension.verticalVelocity,
    pitch: resolvedPitch,
    roll: resolvedRoll,
    suspensionTravel: suspension.suspensionTravel,
    wheelContacts: suspension.wheelContacts,
    airborne: overturned ? false : suspension.airborne,
    speed: signedSpeed,
    damage,
    rolloverRisk: overturned ? 1 : rolloverRisk,
    overturned,
  };
}

export function getVehicleAltitude(state: VehicleState) {
  return state.bodyHeight;
}

function recoverVehicle(state: VehicleState): VehicleState {
  const wheelContacts = makeWheelContacts(state.x, state.z, state.yaw);
  const averageWheelGround =
    wheelContacts.reduce((total, contact) => total + contact.groundHeight, 0) / wheelContacts.length;

  return {
    ...state,
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

function solveSuspension(
  state: VehicleState,
  x: number,
  z: number,
  velocityX: number,
  velocityZ: number,
  yaw: number,
  vehicle: VehicleSpec,
  deltaSeconds: number,
) {
  const groundHeight = terrainHeight(x, z);
  const wheelContacts = makeWheelContacts(x, z, yaw);
  const averageWheelGround =
    wheelContacts.reduce((total, contact) => total + contact.groundHeight, 0) / wheelContacts.length;
  const targetHeight = averageWheelGround + wheelRadius + suspensionRestLength;
  const previousAverageWheelGround =
    state.wheelContacts.reduce((total, contact) => total + contact.groundHeight, 0) / state.wheelContacts.length;
  const terrainLiftSpeed = (averageWheelGround - previousAverageWheelGround) / Math.max(deltaSeconds, 0.001);
  const shouldLoseContact =
    state.bodyHeight > targetHeight + 0.48 && state.verticalVelocity > -2.2 && Math.abs(terrainLiftSpeed) < 15;

  if (state.airborne || shouldLoseContact) {
    const airborneVelocity = state.verticalVelocity - 19.5 * deltaSeconds;
    const airborneHeight = state.bodyHeight + airborneVelocity * deltaSeconds;
    const reconnectHeight = targetHeight + 0.12;

    if (airborneHeight > reconnectHeight) {
      return {
        bodyHeight: airborneHeight,
        verticalVelocity: airborneVelocity,
        pitch: lerp(state.pitch, state.pitch + clamp(velocityZ * 0.0009, -0.035, 0.035), clamp(deltaSeconds * 2.2, 0, 1)),
        roll: lerp(state.roll, state.roll + clamp(velocityX * 0.0009, -0.035, 0.035), clamp(deltaSeconds * 2.2, 0, 1)),
        suspensionTravel: 0,
        wheelContacts,
        airborne: true,
      };
    }
  }

  const spring = 86 + vehicle.suspension * 5.4;
  const damping = 22 + vehicle.suspension * 1.25;
  const verticalVelocity =
    state.verticalVelocity +
    ((targetHeight - state.bodyHeight) * spring - state.verticalVelocity * damping + Math.max(0, terrainLiftSpeed) * 0.52) *
      deltaSeconds;
  const lowestAllowedHeight = Math.max(...wheelContacts.map((contact) => contact.groundHeight)) + wheelRadius + 0.28;
  const highestAllowedHeight = Math.max(lowestAllowedHeight + 0.1, groundHeight + 2.35);
  const bodyHeight = clamp(state.bodyHeight + verticalVelocity * deltaSeconds, lowestAllowedHeight, highestAllowedHeight);
  const loadedContacts = wheelContacts.map((contact) => ({
    ...contact,
    compression: clamp(targetHeight - bodyHeight + (contact.groundHeight - averageWheelGround), -0.55, 0.9),
  }));
  const suspensionTravel =
    loadedContacts.reduce((total, contact) => total + Math.max(0, contact.compression), 0) / loadedContacts.length;
  const attitude = calculateContactPlaneAttitude(loadedContacts);
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const forwardSpeed = velocityX * forwardX + velocityZ * forwardZ;
  const pitchTarget = attitude.pitch - clamp(forwardSpeed * 0.006, -0.09, 0.09);
  const rollTarget = attitude.roll;

  return {
    bodyHeight,
    verticalVelocity,
    pitch: lerp(state.pitch, pitchTarget, clamp(deltaSeconds * 14, 0, 1)),
    roll: lerp(state.roll, rollTarget, clamp(deltaSeconds * 15, 0, 1)),
    suspensionTravel,
    wheelContacts: loadedContacts,
    airborne: false,
  };
}

export function calculateContactPlaneAttitude(contacts: readonly WheelContact[]) {
  const plane = fitContactPlane(contacts);

  return {
    pitch: clamp(Math.atan2(-plane.forwardSlope, 1), -0.34, 0.34),
    roll: clamp(Math.atan2(plane.sideSlope, 1), -0.36, 0.36),
  };
}

function makeWheelContacts(x: number, z: number, yaw: number): readonly WheelContact[] {
  return wheelLayout.map((wheel) => {
    const worldX = x + Math.cos(yaw) * wheel.x + Math.sin(yaw) * wheel.z;
    const worldZ = z - Math.sin(yaw) * wheel.x + Math.cos(yaw) * wheel.z;

    return {
      id: wheel.id,
      localX: wheel.x,
      localZ: wheel.z,
      worldX,
      worldZ,
      groundHeight: getWheelContactGroundHeight(worldX, worldZ, yaw),
      compression: 0,
    };
  });
}

export function getWheelContactGroundHeight(x: number, z: number, yaw: number, extraClearance = 0) {
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const sideX = Math.cos(yaw);
  const sideZ = -Math.sin(yaw);
  const halfWidth = 0.36;
  const forwardSamples = [-0.92, -0.7, -0.46, -0.23, 0, 0.23, 0.46, 0.7, 0.92];
  const sideSamples = [-1, -0.5, 0, 0.5, 1];

  let requiredAxleHeight = Number.NEGATIVE_INFINITY;

  forwardSamples.forEach((forwardAmount) => {
    sideSamples.forEach((sideAmount) => {
      const forwardOffset = forwardAmount * wheelRadius;
      const sideOffset = sideAmount * halfWidth;
      const sampleX = x + forwardX * forwardOffset + sideX * sideOffset;
      const sampleZ = z + forwardZ * forwardOffset + sideZ * sideOffset;
      const tireProfileHeight = Math.sqrt(Math.max(0, wheelRadius * wheelRadius - forwardOffset * forwardOffset));

      requiredAxleHeight = Math.max(
        requiredAxleHeight,
        terrainHeight(sampleX, sampleZ) + tireProfileHeight + 0.16 + extraClearance,
      );
    });
  });

  return requiredAxleHeight - wheelRadius;
}

function fitContactPlane(contacts: readonly WheelContact[]) {
  const averageHeight = contacts.reduce((total, contact) => total + contact.groundHeight, 0) / contacts.length;
  const sideNumerator = contacts.reduce((total, contact) => total + contact.localX * (contact.groundHeight - averageHeight), 0);
  const sideDenominator = contacts.reduce((total, contact) => total + contact.localX * contact.localX, 0);
  const forwardNumerator = contacts.reduce(
    (total, contact) => total + contact.localZ * (contact.groundHeight - averageHeight),
    0,
  );
  const forwardDenominator = contacts.reduce((total, contact) => total + contact.localZ * contact.localZ, 0);

  return {
    sideSlope: sideNumerator / sideDenominator,
    forwardSlope: forwardNumerator / forwardDenominator,
  };
}

function estimateImpactDamage(previous: VehicleState, x: number, z: number, speed: number, suspensionTravel: number) {
  const previousHeight = terrainHeight(previous.x, previous.z);
  const nextHeight = terrainHeight(x, z);
  const slopeHit = Math.max(0, nextHeight - previousHeight - 1.8);
  const bottomOut = Math.max(0, suspensionTravel - 0.82);

  if ((slopeHit === 0 && bottomOut === 0) || Math.abs(speed) < 13) {
    return 0;
  }

  return slopeHit * Math.abs(speed) * 0.014 + bottomOut * Math.abs(speed) * 0.035;
}

function calculateRolloverRisk(
  previous: VehicleState,
  suspension: ReturnType<typeof solveSuspension>,
  sideSpeed: number,
  speed: number,
  deltaSeconds: number,
) {
  if (previous.overturned) {
    return 1;
  }

  const rollStress = Math.max(0, (Math.abs(suspension.roll) - 0.24) / 0.12);
  const pitchStress = Math.max(0, (Math.abs(suspension.pitch) - 0.28) / 0.12);
  const lateralStress = Math.max(0, (Math.abs(sideSpeed) - 9) / 18);
  const speedStress = Math.max(0, (speed - 18) / 22);
  const accumulating = (rollStress * lateralStress * 1.45 + pitchStress * speedStress * 0.82) * deltaSeconds;
  const recovering = (suspension.airborne ? 0.08 : 0.42) * deltaSeconds;

  return clamp(previous.rolloverRisk + accumulating - recovering, 0, 1.1);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
