import { physics as p } from './physics';
import { getSurfaceForPoint } from './surfaces';
import { playableHalfSize, terrainGradient, terrainHeight } from './terrain';
import type { VehicleSpec } from './vehicles';
import { suspensionRestLength, wheelLayout, wheelRadius } from './wheelLayout';

export type ControlInput = {
  readonly throttle: number;
  readonly brake: number;
  readonly steering: number;
  readonly recover?: boolean;
  readonly handbrake?: number;
};

export type RollState = 'upright' | 'side' | 'roof' | 'flipping';

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
  readonly rolloverRisk: number;
  readonly rollState: RollState;
  readonly rollVelocity: number;
  readonly pitchVelocity: number;
  readonly overturned: boolean;
  readonly recoveryCooldown: number;
  readonly recoveryPenalty: number;
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

const fixedStep = 1 / 60;
const maxDeltaSeconds = 0.05;
const rideHeight = wheelRadius + suspensionRestLength;

export const initialVehicleState: VehicleState = makeVehicleStateAt(-477, -390, 0.83);

export function updateVehicleState(
  state: VehicleState,
  input: ControlInput,
  vehicle: VehicleSpec,
  deltaSeconds: number,
): VehicleState {
  const normalizedState = normalizeState(state);
  let next = normalizedState;
  let remaining = clamp(deltaSeconds, 0, maxDeltaSeconds);

  while (remaining > 0) {
    const step = Math.min(remaining, fixedStep);
    next = updateVehicleSubstep(next, input, vehicle, step);
    remaining -= step;
  }

  return next;
}

export function getVehicleAltitude(state: VehicleState) {
  return state.bodyHeight;
}

export function resetVehicleForGateHunt(): VehicleState {
  return makeVehicleStateAt(initialVehicleState.x, initialVehicleState.z, initialVehicleState.yaw);
}

function updateVehicleSubstep(
  state: VehicleState,
  input: ControlInput,
  vehicle: VehicleSpec,
  deltaSeconds: number,
): VehicleState {
  const basis = getBasis(state.yaw);
  const localVelocity = worldToLocal(state.velocityX, state.velocityZ, basis);
  const surface = getSurfaceForPoint(state.x, state.z);
  const traction = clamp(surface.gripMultiplier * (vehicle.grip / 8), p.minTraction, p.maxTraction);
  const reverseIntent = input.brake > 0 && localVelocity.forward < p.reverseSpeedThreshold;
  const handbrake = clamp(input.handbrake ?? 0, 0, 1);
  const gradient = terrainGradient(state.x, state.z);
  const slopeForward = gradient.x * basis.forwardX + gradient.z * basis.forwardZ;
  const slopeSide = gradient.x * basis.rightX + gradient.z * basis.rightZ;
  const driveInput = input.throttle - (reverseIntent ? input.brake * p.reverseMultiplier : 0);
  const driveAcceleration = driveInput * vehicle.acceleration * p.driveMultiplier * traction;
  const hillAssist =
    input.throttle *
    vehicle.acceleration *
    p.hillTorqueEfficiency *
    clamp(1 - Math.abs(localVelocity.forward) / p.maxHillSpeed, p.minHillSpeedRatio, 1) *
    traction;
  const braking = reverseIntent ? 0 : input.brake * p.brakeForce;
  const lateralGrip =
    clamp(
      p.baseLateralGrip + vehicle.grip * p.gripPerStat - Math.abs(localVelocity.forward) * p.gripSpeedFalloff,
      p.minLateralGrip,
      p.maxLateralGrip,
    ) *
    traction *
    (1 - handbrake * (1 - p.handbrakeLateralGripScale));
  const drag = surface.drag + handbrake * p.handbrakeDrag;

  let forwardSpeed =
    localVelocity.forward + (driveAcceleration + hillAssist - slopeForward * p.gradientForce) * deltaSeconds;
  forwardSpeed = applyBraking(forwardSpeed, braking * deltaSeconds);
  forwardSpeed *= Math.exp(-drag * deltaSeconds);

  let sideSpeed = localVelocity.side - slopeSide * p.gradientForce * deltaSeconds;
  sideSpeed *= Math.exp(-lateralGrip * deltaSeconds);
  sideSpeed *= Math.exp(-drag * deltaSeconds);

  const speed = Math.hypot(forwardSpeed, sideSpeed);
  const steerSpeedFactor = clamp(speed / p.steerSpeedDivisor, p.steerSpeedMin, 1);
  const slidePenalty = clamp(1 - Math.abs(sideSpeed) / p.slidePenaltyDivisor, p.slidePenaltyMin, 1);
  const yaw =
    state.yaw +
    input.steering *
      steerSpeedFactor *
      traction *
      slidePenalty *
      Math.sign(forwardSpeed || 1) *
      p.maxSteerAngle *
      deltaSeconds;
  const movedBasis = getBasis(yaw);
  let velocityX = movedBasis.forwardX * forwardSpeed + movedBasis.rightX * sideSpeed;
  let velocityZ = movedBasis.forwardZ * forwardSpeed + movedBasis.rightZ * sideSpeed;
  let x = state.x + velocityX * deltaSeconds;
  let z = state.z + velocityZ * deltaSeconds;

  const collision = solveTerrainCollision(state, x, z, yaw, velocityX, velocityZ);
  x = collision.x;
  z = collision.z;
  velocityX = collision.velocityX;
  velocityZ = collision.velocityZ;

  const contact = solveGroundContact(state, x, z, yaw, velocityX, velocityZ, vehicle, deltaSeconds);
  const signedSpeed = velocityX * movedBasis.forwardX + velocityZ * movedBasis.forwardZ;

  return {
    x,
    z,
    yaw,
    velocityX,
    velocityZ,
    bodyHeight: contact.bodyHeight,
    verticalVelocity: contact.verticalVelocity,
    pitch: contact.pitch,
    roll: contact.roll,
    suspensionTravel: contact.suspensionTravel,
    wheelContacts: contact.wheelContacts,
    airborne: false,
    speed: signedSpeed,
    rolloverRisk: 0,
    rollState: 'upright',
    rollVelocity: 0,
    pitchVelocity: 0,
    overturned: false,
    recoveryCooldown: Math.max(0, state.recoveryCooldown - deltaSeconds),
    recoveryPenalty: state.recoveryPenalty,
  };
}

function solveTerrainCollision(
  state: VehicleState,
  x: number,
  z: number,
  yaw: number,
  velocityX: number,
  velocityZ: number,
) {
  const boundedX = clamp(x, -playableHalfSize, playableHalfSize);
  const boundedZ = clamp(z, -playableHalfSize, playableHalfSize);
  let nextVelocityX = boundedX === x ? velocityX : velocityX * p.boundaryReflection;
  let nextVelocityZ = boundedZ === z ? velocityZ : velocityZ * p.boundaryReflection;
  const currentGround = averageGroundHeight(state.wheelContacts);
  const nextContacts = makeWheelContacts(boundedX, boundedZ, yaw);
  const nextGround = averageGroundHeight(nextContacts);

  if (nextGround - currentGround <= p.maxClimbStep) {
    return { x: boundedX, z: boundedZ, velocityX: nextVelocityX, velocityZ: nextVelocityZ };
  }

  const gradient = terrainGradient(boundedX, boundedZ);
  const normalLength = Math.hypot(gradient.x, gradient.z) || 1;
  const normalX = gradient.x / normalLength;
  const normalZ = gradient.z / normalLength;
  const intoWallSpeed = Math.max(0, nextVelocityX * normalX + nextVelocityZ * normalZ);
  const tangentX = nextVelocityX - normalX * intoWallSpeed;
  const tangentZ = nextVelocityZ - normalZ * intoWallSpeed;

  nextVelocityX = tangentX * p.climbImpactSlideRetain + normalX * intoWallSpeed * p.climbImpactRetain;
  nextVelocityZ = tangentZ * p.climbImpactSlideRetain + normalZ * intoWallSpeed * p.climbImpactRetain;

  return { x: state.x, z: state.z, velocityX: nextVelocityX, velocityZ: nextVelocityZ };
}

function solveGroundContact(
  state: VehicleState,
  x: number,
  z: number,
  yaw: number,
  velocityX: number,
  velocityZ: number,
  vehicle: VehicleSpec,
  deltaSeconds: number,
) {
  const wheelContacts = makeWheelContacts(x, z, yaw);
  const averageWheelGround = averageGroundHeight(wheelContacts);
  const targetHeight = averageWheelGround + rideHeight;
  const spring = p.baseSpring + vehicle.suspension * p.springPerStat;
  const damping = p.baseDamping + vehicle.suspension * p.dampingPerStat;
  const verticalVelocity =
    state.verticalVelocity + ((targetHeight - state.bodyHeight) * spring - state.verticalVelocity * damping) * deltaSeconds;
  const highestWheel = Math.max(...wheelContacts.map((contact) => contact.groundHeight));
  const lowestHeight = highestWheel + wheelRadius + p.lowestHeightClearance;
  const bodyHeight = clamp(state.bodyHeight + verticalVelocity * deltaSeconds, lowestHeight, targetHeight + 0.55);
  const settledVerticalVelocity =
    bodyHeight <= lowestHeight + 0.001 && verticalVelocity < 0 ? 0 : verticalVelocity;
  const loadedContacts = wheelContacts.map((contact) => ({
    ...contact,
    compression: clamp(targetHeight - bodyHeight + (contact.groundHeight - averageWheelGround), p.compressionMin, p.compressionMax),
  }));
  const attitude = calculateContactPlaneAttitude(loadedContacts);
  const basis = getBasis(yaw);
  const forwardSpeed = velocityX * basis.forwardX + velocityZ * basis.forwardZ;
  const pitchTarget = attitude.pitch - clamp(forwardSpeed * p.pitchSpeedDamping, -p.pitchSpeedDampingClamp, p.pitchSpeedDampingClamp);
  const suspensionTravel =
    loadedContacts.reduce((total, contact) => total + Math.max(0, contact.compression), 0) / loadedContacts.length;

  return {
    bodyHeight,
    verticalVelocity: settledVerticalVelocity,
    pitch: lerp(state.pitch, pitchTarget, clamp(deltaSeconds * p.pitchLerpRate, 0, 1)),
    roll: lerp(state.roll, attitude.roll, clamp(deltaSeconds * p.rollLerpRate, 0, 1)),
    suspensionTravel,
    wheelContacts: loadedContacts,
  };
}

function normalizeState(state: VehicleState): VehicleState {
  if (
    state.rollState === 'upright' &&
    !state.overturned &&
    !state.airborne &&
    state.rollVelocity === 0 &&
    state.pitchVelocity === 0 &&
    state.rolloverRisk === 0
  ) {
    return state;
  }

  const wheelContacts = makeWheelContacts(state.x, state.z, state.yaw);

  return {
    ...state,
    bodyHeight: Math.max(state.bodyHeight, averageGroundHeight(wheelContacts) + rideHeight),
    verticalVelocity: 0,
    wheelContacts,
    airborne: false,
    rolloverRisk: 0,
    rollState: 'upright',
    rollVelocity: 0,
    pitchVelocity: 0,
    overturned: false,
  };
}

function makeVehicleStateAt(x: number, z: number, yaw: number): VehicleState {
  const wheelContacts = makeWheelContacts(x, z, yaw);

  return {
    x,
    z,
    yaw,
    velocityX: 0,
    velocityZ: 0,
    bodyHeight: averageGroundHeight(wheelContacts) + rideHeight,
    verticalVelocity: 0,
    pitch: 0,
    roll: 0,
    suspensionTravel: 0,
    wheelContacts,
    airborne: false,
    speed: 0,
    rolloverRisk: 0,
    rollState: 'upright',
    rollVelocity: 0,
    pitchVelocity: 0,
    overturned: false,
    recoveryCooldown: 0,
    recoveryPenalty: 0,
  };
}

function applyBraking(speed: number, amount: number) {
  if (amount <= 0) {
    return speed;
  }

  if (Math.abs(speed) <= amount) {
    return 0;
  }

  return speed - Math.sign(speed) * amount;
}

export function calculateContactPlaneAttitude(contacts: readonly WheelContact[]) {
  const plane = fitContactPlane(contacts);

  return {
    pitch: clamp(Math.atan2(-plane.forwardSlope, 1), -p.pitchClamp, p.pitchClamp),
    roll: clamp(Math.atan2(plane.sideSlope, 1), -p.rollClamp, p.rollClamp),
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

function averageGroundHeight(contacts: readonly WheelContact[]) {
  return contacts.reduce((total, contact) => total + contact.groundHeight, 0) / contacts.length;
}

export function getWheelContactGroundHeight(x: number, z: number, yaw: number, extraClearance = 0) {
  const basis = getBasis(yaw);
  let requiredAxleHeight = Number.NEGATIVE_INFINITY;

  for (const forwardAmount of p.wheelContactForwardSamples) {
    for (const sideAmount of p.wheelContactSideSamples) {
      const forwardOffset = forwardAmount * wheelRadius;
      const sideOffset = sideAmount * p.wheelContactHalfWidth;
      const sampleX = x + basis.forwardX * forwardOffset + basis.rightX * sideOffset;
      const sampleZ = z + basis.forwardZ * forwardOffset + basis.rightZ * sideOffset;
      const tireProfileHeight = Math.sqrt(Math.max(0, wheelRadius * wheelRadius - forwardOffset * forwardOffset));

      requiredAxleHeight = Math.max(
        requiredAxleHeight,
        terrainHeight(sampleX, sampleZ) + tireProfileHeight + p.wheelContactTireClearance + extraClearance,
      );
    }
  }

  return requiredAxleHeight - wheelRadius;
}

function fitContactPlane(contacts: readonly WheelContact[]) {
  const averageHeight = averageGroundHeight(contacts);
  const sideNumerator = contacts.reduce(
    (total, contact) => total + contact.localX * (contact.groundHeight - averageHeight),
    0,
  );
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

function getBasis(yaw: number) {
  return {
    forwardX: Math.sin(yaw),
    forwardZ: Math.cos(yaw),
    rightX: Math.cos(yaw),
    rightZ: -Math.sin(yaw),
  };
}

function worldToLocal(velocityX: number, velocityZ: number, basis: ReturnType<typeof getBasis>) {
  return {
    forward: velocityX * basis.forwardX + velocityZ * basis.forwardZ,
    side: velocityX * basis.rightX + velocityZ * basis.rightZ,
  };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
