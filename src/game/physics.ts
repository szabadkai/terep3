/**
 * Baseline vehicle physics constants.
 *
 * Current model: planar arcade driving plus four-wheel terrain contact.
 * There is intentionally no jump, rollover, roof, side-rest, or hull solver.
 */
export const physics = {
  // Drive
  gradientForce: 13,
  brakeForce: 20,
  driveMultiplier: 1.34,
  hillTorqueEfficiency: 0.95,
  reverseMultiplier: 0.72,
  maxHillSpeed: 24,
  minHillSpeedRatio: 0.2,
  reverseSpeedThreshold: 2.4,
  minTraction: 0.2,
  maxTraction: 1.25,

  // Grip and steering
  baseLateralGrip: 7.5,
  gripPerStat: 0.8,
  gripSpeedFalloff: 0.045,
  minLateralGrip: 3.5,
  maxLateralGrip: 13,
  handbrakeLateralGripScale: 0.55,
  handbrakeDrag: 0.6,
  maxSteerAngle: 2.75,
  steerSpeedDivisor: 10,
  steerSpeedMin: 0.18,
  slidePenaltyDivisor: 36,
  slidePenaltyMin: 0.42,

  // Terrain collision
  boundaryReflection: -0.22,
  maxClimbStep: 1.35,
  climbImpactRetain: -0.12,
  climbImpactSlideRetain: 0.62,

  // Suspension
  baseSpring: 86,
  springPerStat: 5.4,
  baseDamping: 22,
  dampingPerStat: 1.25,
  lowestHeightClearance: 0.28,
  compressionMin: -0.55,
  compressionMax: 0.9,

  // Visual attitude
  pitchLerpRate: 14,
  rollLerpRate: 15,
  pitchClamp: 0.34,
  rollClamp: 0.36,
  pitchSpeedDamping: 0.006,
  pitchSpeedDampingClamp: 0.09,

  // Wheel contact sampling
  wheelContactForwardSamples: [-0.92, -0.7, -0.46, -0.23, 0, 0.23, 0.46, 0.7, 0.92] as readonly number[],
  wheelContactSideSamples: [-1, -0.5, 0, 0.5, 1] as readonly number[],
  wheelContactHalfWidth: 0.36,
  wheelContactTireClearance: 0.16,
} as const;
