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
  /** Maximum terrain step the vehicle can climb in one contact solve */
  maxClimbStep: 1.35,
  /** Speed threshold where over-steep climb contacts start acting like impacts */
  climbImpactMinSpeed: 4,
  /** Velocity retained after hitting terrain too steep to climb */
  climbImpactRetain: -0.12,
  /** Tangential velocity retained when scraping along a wall-like terrain face */
  climbImpactSlideRetain: 0.62,

  /** Airborne detection: body must be above target by this margin and not falling fast */
  airborneHeightMargin: 0.48,
  airborneVelocityThreshold: -2.2,
  /** Terrain lift speed cap for losing contact */
  airborneTerrainLiftSpeedCap: 15,
  /** Crest launch: minimum horizontal speed before terrain drop can launch the car */
  crestLaunchMinSpeed: 13,
  /** Crest launch: terrain must drop away this fast before wheels lose contact */
  crestLaunchDropSpeed: 18,
  /** Crest launch: lower height margin used when a fast crest drops away under the wheels */
  crestLaunchHeightMargin: 0.14,
  /** Crest launch: upward velocity added when all contact points fall away at speed */
  crestLaunchVelocityBoost: 2.7,
  /** Crest launch: maximum upward boost from crests */
  crestLaunchVelocityMax: 5.2,

  /** Reconnection height above target when falling back to ground */
  reconnectHeightMargin: 0.12,
  /** Landing: extra damping on the first frame after reconnecting with ground */
  landingDampingMultiplier: 2.15,
  /** Landing: retained downward velocity when reconnecting after air time */
  landingVelocityRetain: 0.34,

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
  rolloverRollThreshold: 0.2,
  rolloverRollScale: 0.1,
  rolloverPitchThreshold: 0.24,
  rolloverPitchScale: 0.1,
  rolloverLateralThreshold: 7.5,
  rolloverLateralScale: 15,
  rolloverSpeedThreshold: 16,
  rolloverSpeedScale: 18,
  rolloverAccumulationMultiplier: 2.1,
  rolloverPitchSpeedMultiplier: 1.15,
  rolloverAirborneRecovery: 0.08,
  rolloverGroundedRecovery: 0.42,

  /** Overturned roll/pitch resolution */
  overturnedRoll: 2.55,
  overturnedPitch: 1.1,
  overturnedPitchLerp: 0.55,
  /** Partial rollover angle used when the vehicle settles on its side */
  sideRestRoll: 1.42,
  sideRollThreshold: 0.92,
  roofRollThreshold: 2.3,
  /** Roll momentum after crossing the rollover threshold */
  rollMomentumBase: 3.4,
  rollMomentumDamping: 1.35,
  rollMomentumSettleVelocity: 0.6,
  flipPitchVelocityScale: 5,
  flipPitchVelocityMax: 2.4,

  /** Damage: drag penalty per damage point */
  damageDragPerPoint: 0.006,
  /** Damage: minimum horizontal speed for terrain impact damage */
  damageMinSpeed: 32,
  /** Damage: speed range where terrain impacts ramp from minor to full force */
  damageSpeedRamp: 42,
  /** Damage: slope hit threshold (height difference) */
  damageSlopeHitThreshold: 5.8,
  /** Damage: bottom-out threshold */
  damageBottomOutThreshold: 0.84,
  /** Damage: minimum upward suspension impulse before grounded terrain hits count */
  damageVerticalImpulseThreshold: 10,
  /** Damage: hard landing threshold from downward velocity */
  damageLandingThreshold: 15,
  /** Damage: slope hit multiplier */
  damageSlopeMultiplier: 0.0024,
  /** Damage: bottom-out multiplier */
  damageBottomOutMultiplier: 0.004,
  /** Damage: hard landing multiplier */
  damageLandingMultiplier: 0.0032,
  /** Damage: maximum cosmetic damage from one impact frame */
  damageCosmeticImpactCap: 1.8,
  /** Damage: maximum mechanical damage from one impact frame */
  damageMechanicalImpactCap: 0.35,

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
  /** Extra damping when opposite diagonal wheel pairs are crossed-up */
  crossAxleDampingScale: 0.46,
  /** Diagonal height difference before cross-axle damping starts */
  crossAxleDampingThreshold: 0.18,

  /** Handbrake: reduces rear lateral grip (slide boost) */
  handbrakeLateralGripScale: 0.55,
  /** Handbrake: additional forward drag */
  handbrakeDrag: 0.6,
} as const;
