import { physics as p } from './physics';
import { getSurfaceForPoint } from './surfaces';
import { playableHalfSize, terrainGradient, terrainHeight } from './terrain';
import type { VehicleSpec } from './vehicles';
import { suspensionRestLength, wheelLayout, wheelRadius } from './wheelLayout';

/**
 * Driver control input — read every frame from keyboard or gamepad.
 *
 * - `throttle`: 0-1 forward drive
 * - `brake`: 0-1 braking (reverses when moving slowly backwards / below threshold)
 * - `steering`: -1 left, 0 centre, +1 right
 * - `recover`: flip the vehicle upright when overturned
 * - `handbrake`: 0-1 handbrake for sliding (locks rear wheels)
 */
export type ControlInput = {
  readonly throttle: number;
  readonly brake: number;
  readonly steering: number;
  readonly recover?: boolean;
  readonly handbrake?: number;
};

/**
 * Full driveable state of the vehicle, suitable for rendering and network sync.
 */
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
  /** Seconds until recovery input is accepted again */
  readonly recoveryCooldown: number;
  /** Time penalty added to Gate Hunt on recovery */
  readonly recoveryPenalty: number;
};

/**
 * Per-wheel ground-contact snapshot used by suspension and attitude calculations.
 */
export type WheelContact = {
  readonly id: string;
  readonly localX: number;
  readonly localZ: number;
  readonly worldX: number;
  readonly worldZ: number;
  readonly groundHeight: number;
  readonly compression: number;
};

/** Initial vehicle placement near the start area. */
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
  recoveryCooldown: 0,
  recoveryPenalty: 0,
};

/**
 * Advances the vehicle simulation by one frame.
 *
 * Order of operations: input → drive forces → kinematics → suspension →
 * rollover → damage → state assembly.
 *
 * Fully deterministic given identical state, input, vehicle spec, and
 * deltaSeconds. Does not use Math.random() or external mutable state.
 *
 * @param state    Previous frame vehicle state.
 * @param input    Driver controls for this frame.
 * @param vehicle  Vehicle specification (mass, grip, suspension, etc.).
 * @param deltaSeconds  Frame duration in seconds.
 * @returns New vehicle state.
 */
export function updateVehicleState(
  state: VehicleState,
  input: ControlInput,
  vehicle: VehicleSpec,
  deltaSeconds: number,
): VehicleState {
  if (input.recover && state.overturned && state.recoveryCooldown <= 0) {
    return recoverVehicle(state);
  }

  const surface = getSurfaceForPoint(state.x, state.z);
  const traction = clamp(surface.gripMultiplier * (vehicle.grip / 8), p.minTraction, p.maxTraction);
  const forwardX = Math.sin(state.yaw);
  const forwardZ = Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = -Math.sin(state.yaw);
  const forwardSpeed = state.velocityX * forwardX + state.velocityZ * forwardZ;
  const sideSpeed = state.velocityX * rightX + state.velocityZ * rightZ;
  const reverseIntent = input.brake > 0 && forwardSpeed < p.reverseSpeedThreshold;
  const disabledControlScale = state.overturned ? 0 : 1;
  const handbrake = (input.handbrake ?? 0) * disabledControlScale;

  const brakeForce = reverseIntent ? 0 : input.brake * p.brakeForce;
  const hillTorque =
    input.throttle *
    vehicle.acceleration *
    clamp(1 - Math.abs(forwardSpeed) / p.maxHillSpeed, p.minHillSpeedRatio, 1) *
    p.hillTorqueEfficiency;
  const driveForce =
    (input.throttle * vehicle.acceleration * p.driveMultiplier +
      hillTorque -
      Number(reverseIntent) * vehicle.acceleration * p.reverseMultiplier) *
    traction *
    disabledControlScale;

  const lateralGrip =
    clamp(
      p.baseLateralGrip + vehicle.grip * p.gripPerStat - Math.abs(forwardSpeed) * p.gripSpeedFalloff,
      p.minLateralGrip,
      p.maxLateralGrip,
    ) * traction;

  const gradient = terrainGradient(state.x, state.z);
  const drag = surface.drag + state.damage * p.damageDragPerPoint + handbrake * p.handbrakeDrag;
  // Handbrake reduces lateral grip to allow slides
  const effectiveLateralGrip = lateralGrip * (1 - handbrake * (1 - p.handbrakeLateralGripScale));

  let velocityX =
    state.velocityX +
    (forwardX * driveForce -
      forwardX * Math.sign(forwardSpeed) * brakeForce -
      rightX * sideSpeed * effectiveLateralGrip -
      gradient.x * p.gradientForce -
      state.velocityX * drag) *
      deltaSeconds;
  let velocityZ =
    state.velocityZ +
    (forwardZ * driveForce -
      forwardZ * Math.sign(forwardSpeed) * brakeForce -
      rightZ * sideSpeed * effectiveLateralGrip -
      gradient.z * p.gradientForce -
      state.velocityZ * drag) *
      deltaSeconds;

  const speed = Math.hypot(velocityX, velocityZ);
  const signedSpeed = velocityX * forwardX + velocityZ * forwardZ;
  const steerSpeedFactor = clamp(speed / p.steerSpeedDivisor, p.steerSpeedMin, 1);
  const slidePenalty = clamp(1 - Math.abs(sideSpeed) / p.slidePenaltyDivisor, p.slidePenaltyMin, 1);
  const yaw =
    state.yaw +
    input.steering *
      disabledControlScale *
      steerSpeedFactor *
      traction *
      slidePenalty *
      Math.sign(signedSpeed || 1) *
      p.maxSteerAngle *
      deltaSeconds;
  const x = state.x + velocityX * deltaSeconds;
  const z = state.z + velocityZ * deltaSeconds;
  const boundedX = clamp(x, -playableHalfSize, playableHalfSize);
  const boundedZ = clamp(z, -playableHalfSize, playableHalfSize);

  if (boundedX !== x) {
    velocityX *= p.boundaryReflection;
  }

  if (boundedZ !== z) {
    velocityZ *= p.boundaryReflection;
  }

  const suspension = solveSuspension(state, boundedX, boundedZ, velocityX, velocityZ, yaw, vehicle, deltaSeconds);
  const rolloverRisk = calculateRolloverRisk(state, suspension, sideSpeed, speed, deltaSeconds);
  const overturned = state.overturned || rolloverRisk >= 1;
  const resolvedPitch = overturned
    ? lerp(suspension.pitch, Math.sign(suspension.pitch || state.pitch || 1) * p.overturnedPitch, p.overturnedPitchLerp)
    : suspension.pitch;
  const resolvedRoll = overturned
    ? Math.sign(suspension.roll || state.roll || sideSpeed || 1) * p.overturnedRoll
    : suspension.roll;
  const damage = clamp(
    state.damage + estimateImpactDamage(state, boundedX, boundedZ, speed, suspension.suspensionTravel),
    0,
    100,
  );

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
    recoveryCooldown: Math.max(0, state.recoveryCooldown - deltaSeconds),
    recoveryPenalty: state.recoveryPenalty,
  };
}

/**
 * Returns the current vehicle body height above sea level.
 */
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
    recoveryCooldown: 2,
    recoveryPenalty: state.recoveryPenalty + 3,
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
    state.bodyHeight > targetHeight + p.airborneHeightMargin &&
    state.verticalVelocity > p.airborneVelocityThreshold &&
    Math.abs(terrainLiftSpeed) < p.airborneTerrainLiftSpeedCap;

  if (state.airborne || shouldLoseContact) {
    const airborneVelocity = state.verticalVelocity - p.gravity * deltaSeconds;
    const airborneHeight = state.bodyHeight + airborneVelocity * deltaSeconds;
    const reconnectHeight = targetHeight + p.reconnectHeightMargin;

    if (airborneHeight > reconnectHeight) {
      return {
        bodyHeight: airborneHeight,
        verticalVelocity: airborneVelocity,
        pitch: lerp(
          state.pitch,
          state.pitch + clamp(velocityZ * p.airborneAttitudeRate, -p.airborneAttitudeClamp, p.airborneAttitudeClamp),
          clamp(deltaSeconds * p.airborneAttitudeLerpRate, 0, 1),
        ),
        roll: lerp(
          state.roll,
          state.roll + clamp(velocityX * p.airborneAttitudeRate, -p.airborneAttitudeClamp, p.airborneAttitudeClamp),
          clamp(deltaSeconds * p.airborneAttitudeLerpRate, 0, 1),
        ),
        suspensionTravel: 0,
        wheelContacts,
        airborne: true,
      };
    }
  }

  const spring = p.baseSpring + vehicle.suspension * p.springPerStat;
  const damping = p.baseDamping + vehicle.suspension * p.dampingPerStat;
  const verticalVelocity =
    state.verticalVelocity +
    ((targetHeight - state.bodyHeight) * spring -
      state.verticalVelocity * damping +
      Math.max(0, terrainLiftSpeed) * p.terrainLiftTransfer) *
      deltaSeconds;
  const lowestAllowedHeight =
    Math.max(...wheelContacts.map((contact) => contact.groundHeight)) + wheelRadius + p.lowestHeightClearance;
  const highestAllowedHeight = Math.max(lowestAllowedHeight + p.maxBodyHeightExtra, groundHeight + p.maxBodyHeightAboveGround);
  const bodyHeight = clamp(state.bodyHeight + verticalVelocity * deltaSeconds, lowestAllowedHeight, highestAllowedHeight);

  // Anti-roll bar: reduce body-height difference between left and right wheel pairs
  const antiRollAdjustedHeight = applyAntiRollBar(
    bodyHeight,
    targetHeight,
    wheelContacts,
    averageWheelGround,
    wheelRadius,
    suspensionRestLength,
  );

  const loadedContacts = wheelContacts.map((contact) => ({
    ...contact,
    compression: clamp(targetHeight - antiRollAdjustedHeight + (contact.groundHeight - averageWheelGround), p.compressionMin, p.compressionMax),
  }));
  const suspensionTravel =
    loadedContacts.reduce((total, contact) => total + Math.max(0, contact.compression), 0) / loadedContacts.length;
  const attitude = calculateContactPlaneAttitude(loadedContacts);
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const forwardSpeed = velocityX * forwardX + velocityZ * forwardZ;
  const pitchTarget = attitude.pitch - clamp(forwardSpeed * p.pitchSpeedDamping, -p.pitchSpeedDampingClamp, p.pitchSpeedDampingClamp);
  const rollTarget = attitude.roll;

  return {
    bodyHeight: antiRollAdjustedHeight,
    verticalVelocity,
    pitch: lerp(state.pitch, pitchTarget, clamp(deltaSeconds * p.pitchLerpRate, 0, 1)),
    roll: lerp(state.roll, rollTarget, clamp(deltaSeconds * p.rollLerpRate, 0, 1)),
    suspensionTravel,
    wheelContacts: loadedContacts,
    airborne: false,
  };
}

/**
 * Computes pitch and roll from a set of wheel contacts by fitting a plane
 * through all contact points. Pitch is forward-back tilt, roll is side-to-side.
 */
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

/**
 * Returns the minimum axle-centre height such that a cylindrical tire
 * footprint (sampled as a grid of points) clears the terrain.
 *
 * Used to compute per-wheel ground-contact heights for suspension solving.
 *
 * @param x              Wheel centre X in world space.
 * @param z              Wheel centre Z in world space.
 * @param yaw            Vehicle yaw.
 * @param extraClearance Additional clearance margin (used for tilted wheels).
 * @returns The ground height of the wheel centre.
 */
export function getWheelContactGroundHeight(x: number, z: number, yaw: number, extraClearance = 0) {
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const sideX = Math.cos(yaw);
  const sideZ = -Math.sin(yaw);
  const halfWidth = p.wheelContactHalfWidth;
  const forwardSamples = p.wheelContactForwardSamples;
  const sideSamples = p.wheelContactSideSamples;

  let requiredAxleHeight = Number.NEGATIVE_INFINITY;

  for (const forwardAmount of forwardSamples) {
    for (const sideAmount of sideSamples) {
      const forwardOffset = forwardAmount * wheelRadius;
      const sideOffset = sideAmount * halfWidth;
      const sampleX = x + forwardX * forwardOffset + sideX * sideOffset;
      const sampleZ = z + forwardZ * forwardOffset + sideZ * sideOffset;
      const tireProfileHeight = Math.sqrt(Math.max(0, wheelRadius * wheelRadius - forwardOffset * forwardOffset));

      requiredAxleHeight = Math.max(
        requiredAxleHeight,
        terrainHeight(sampleX, sampleZ) + tireProfileHeight + p.wheelContactTireClearance + extraClearance,
      );
    }
  }

  return requiredAxleHeight - wheelRadius;
}

/**
 * Anti-roll bar simulation: applies a corrective force that resists the
 * difference in body height between left and right wheel pairs, without
 * affecting single-wheel bump compliance.
 *
 * The body height is nudged toward the average of left-side height and
 * right-side height by the stiffness factor.
 */
function applyAntiRollBar(
  bodyHeight: number,
  targetHeight: number,
  contacts: readonly WheelContact[],
  averageWheelGround: number,
  radius: number,
  restLength: number,
) {
  if (p.antiRollBarStiffness <= 0) {
    return bodyHeight;
  }

  // Compute left-side and right-side ground heights
  const leftContacts = contacts.filter((c) => c.id.includes('left'));
  const rightContacts = contacts.filter((c) => c.id.includes('right'));

  if (leftContacts.length === 0 || rightContacts.length === 0) {
    return bodyHeight;
  }

  const leftAverage =
    leftContacts.reduce((total, c) => total + c.groundHeight, 0) / leftContacts.length;
  const rightAverage =
    rightContacts.reduce((total, c) => total + c.groundHeight, 0) / rightContacts.length;
  const leftTarget = leftAverage + radius + restLength;
  const rightTarget = rightAverage + radius + restLength;

  // Blended target that resists pure side-to-side tilt
  const antiRollTarget = lerp(targetHeight, (leftTarget + rightTarget) / 2, p.antiRollBarStiffness);

  return lerp(bodyHeight, antiRollTarget, p.antiRollBarStiffness);
}

function fitContactPlane(contacts: readonly WheelContact[]) {
  const averageHeight = contacts.reduce((total, contact) => total + contact.groundHeight, 0) / contacts.length;
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

function estimateImpactDamage(previous: VehicleState, x: number, z: number, speed: number, suspensionTravel: number) {
  const previousHeight = terrainHeight(previous.x, previous.z);
  const nextHeight = terrainHeight(x, z);
  const slopeHit = Math.max(0, nextHeight - previousHeight - p.damageSlopeHitThreshold);
  const bottomOut = Math.max(0, suspensionTravel - p.damageBottomOutThreshold);

  if ((slopeHit === 0 && bottomOut === 0) || Math.abs(speed) < p.damageMinSpeed) {
    return 0;
  }

  return slopeHit * Math.abs(speed) * p.damageSlopeMultiplier + bottomOut * Math.abs(speed) * p.damageBottomOutMultiplier;
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

  const rollStress = Math.max(0, (Math.abs(suspension.roll) - p.rolloverRollThreshold) / p.rolloverRollScale);
  const pitchStress = Math.max(0, (Math.abs(suspension.pitch) - p.rolloverPitchThreshold) / p.rolloverPitchScale);
  const lateralStress = Math.max(0, (Math.abs(sideSpeed) - p.rolloverLateralThreshold) / p.rolloverLateralScale);
  const speedStress = Math.max(0, (speed - p.rolloverSpeedThreshold) / p.rolloverSpeedScale);
  const staticTipRisk = staticTipOverRisk(suspension);
  const accumulating =
    (rollStress * lateralStress * p.rolloverAccumulationMultiplier +
      pitchStress * speedStress * p.rolloverPitchSpeedMultiplier +
      staticTipRisk) *
    deltaSeconds;
  // Static tip-over suppresses recovery — the vehicle cannot self-right on a steep slope
  const activeStaticTip = staticTipRisk > 0.02;
  const recovering =
    (suspension.airborne ? p.rolloverAirborneRecovery : activeStaticTip ? 0.04 : p.rolloverGroundedRecovery) * deltaSeconds;

  return clamp(previous.rolloverRisk + accumulating - recovering, 0, 1.1);
}

/**
 * Detects static tip-over risk when the vehicle is on a steep slope without
 * needing speed. When the contact-plane attitude exceeds safe limits, the
 * vehicle should slowly tip even at rest.
 */
function staticTipOverRisk(suspension: ReturnType<typeof solveSuspension>) {
  if (suspension.airborne) {
    return 0;
  }

  const maxSafeAngle = 0.18;
  const rollExcess = Math.max(0, Math.abs(suspension.roll) - maxSafeAngle);
  const pitchExcess = Math.max(0, Math.abs(suspension.pitch) - maxSafeAngle);

  return (rollExcess * 2.2 + pitchExcess * 1.4) * 0.5;
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}