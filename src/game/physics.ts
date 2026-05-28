/**
 * Physics tuning constants for Terep3 vehicle dynamics.
 *
 * All values can be adjusted to tune the driving feel.
 */
export const physics = {
  /** Gravity acceleration (m/s²) */
  gravity: 19.5,

  /** Base spring rate for suspension (before vehicle stat multiplier) */
  baseSpring: 86,
  /** Spring rate multiplier applied per vehicle suspension stat point */
  springPerStat: 5.4,

  /** Base damping rate */
  baseDamping: 22,
  /** Damping rate multiplier per vehicle suspension stat point */
  dampingPerStat: 1.25,

  /** Gradient (slope gravity) force multiplier */
  gradientForce: 13,

  /** Brake force applied when not reversing */
  brakeForce: 20,

  /** Drive force multiplier */
  driveMultiplier: 1.34,
  /** Hill torque efficiency factor */
  hillTorqueEfficiency: 0.95,
  /** Reverse drive force multiplier */
  reverseMultiplier: 0.72,
  /** Max speed for hill torque calculation */
  maxHillSpeed: 24,
  /** Speed threshold below which hill torque is strongest */
  minHillSpeedRatio: 0.2,

  /** Reverse intent speed threshold (m/s) — below this, brake triggers reverse */
  reverseSpeedThreshold: 2.4,

  /** Base lateral grip */
  baseLateralGrip: 7.5,
  /** Lateral grip per vehicle grip stat */
  gripPerStat: 0.8,
  /** Lateral grip falloff per unit of forward speed */
  gripSpeedFalloff: 0.045,
  /** Minimum lateral grip */
  minLateralGrip: 3.5,
  /** Maximum lateral grip */
  maxLateralGrip: 13,

  /** Overall grip multiplier range (clamped from surface * vehicle) */
  minTraction: 0.2,
  maxTraction: 1.25,

  /** Steer angle max (rad), multiplied by input, speed, traction, slide */
  maxSteerAngle: 2.75,
  /** Steer speed-dependency: speed / divisor, clamped to [min, 1] */
  steerSpeedDivisor: 10,
  steerSpeedMin: 0.18,
  /** Slide penalty: 1 - |sideSpeed|/divisor, clamped to [min, 1] */
  slidePenaltyDivisor: 36,
  slidePenaltyMin: 0.42,

  /** Boundary reflection coefficient when hitting terrain edge */
  boundaryReflection: -0.22,

  /** Airborne detection: body must be above target by this margin and not falling fast */
  airborneHeightMargin: 0.48,
  airborneVelocityThreshold: -2.2,
  /** Terrain lift speed cap for losing contact */
  airborneTerrainLiftSpeedCap: 15,

  /** Reconnection height above target when falling back to ground */
  reconnectHeightMargin: 0.12,

  /** Airborne pitch/roll evolution rate */
  airborneAttitudeRate: 0.0009,
  airborneAttitudeClamp: 0.035,
  airborneAttitudeLerpRate: 2.2,

  /** Suspension lowest height offset (wheel radius + clearance) */
  lowestHeightClearance: 0.28,
  /** Body height max above ground */
  maxBodyHeightAboveGround: 2.35,
  /** Body height extra above highest wheel */
  maxBodyHeightExtra: 0.1,

  /** Attitude lerp rates for on-ground pitch/roll */
  pitchLerpRate: 14,
  rollLerpRate: 15,

  /** Pitch target clamp from contact plane */
  pitchClamp: 0.34,
  rollClamp: 0.36,

  /** Forward speed pitch damping */
  pitchSpeedDamping: 0.006,
  pitchSpeedDampingClamp: 0.09,

  /** Suspension compression clamp */
  compressionMin: -0.55,
  compressionMax: 0.9,

  /** Terrain lift transfer to vertical velocity */
  terrainLiftTransfer: 0.52,

  /** Rollover risk: roll stress threshold (above this starts accumulating) */
  rolloverRollThreshold: 0.24,
  rolloverRollScale: 0.12,
  rolloverPitchThreshold: 0.28,
  rolloverPitchScale: 0.12,
  rolloverLateralThreshold: 9,
  rolloverLateralScale: 18,
  rolloverSpeedThreshold: 18,
  rolloverSpeedScale: 22,
  rolloverAccumulationMultiplier: 1.45,
  rolloverPitchSpeedMultiplier: 0.82,
  rolloverAirborneRecovery: 0.08,
  rolloverGroundedRecovery: 0.42,

  /** Overturned roll/pitch resolution */
  overturnedRoll: 2.55,
  overturnedPitch: 1.1,
  overturnedPitchLerp: 0.55,

  /** Damage: drag penalty per damage point */
  damageDragPerPoint: 0.012,
  /** Damage: minimum speed for impact */
  damageMinSpeed: 13,
  /** Damage: slope hit threshold (height difference) */
  damageSlopeHitThreshold: 1.8,
  /** Damage: bottom-out threshold */
  damageBottomOutThreshold: 0.82,
  /** Damage: slope hit multiplier */
  damageSlopeMultiplier: 0.014,
  /** Damage: bottom-out multiplier */
  damageBottomOutMultiplier: 0.035,

  /** Wheel contact sampling */
  wheelContactForwardSamples: [-0.92, -0.7, -0.46, -0.23, 0, 0.23, 0.46, 0.7, 0.92] as readonly number[],
  wheelContactSideSamples: [-1, -0.5, 0, 0.5, 1] as readonly number[],
  wheelContactHalfWidth: 0.36,
  wheelContactTireClearance: 0.16,

  /** Wheel suspension drop when airborne */
  airborneWheelDrop: 0.42,

  /** Wheel spin rate */
  wheelSpinRate: 2.8,

  /** Anti-roll bar stiffness (0 = none, 1 = full) */
  antiRollBarStiffness: 0.15,

  /** Handbrake: reduces rear lateral grip (slide boost) */
  handbrakeLateralGripScale: 0.55,
  /** Handbrake: additional forward drag */
  handbrakeDrag: 0.6,
} as const;