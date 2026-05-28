# Terep3 Roadmap

## Current State

Terep3 is a browser-rendered, Terep2-inspired low-poly off-road prototype. It currently has a Three.js terrain scene, a custom low-poly 4x4 mesh, keyboard driving controls, terrain surface types, a Gate Hunt HUD loop, and a lightweight four-wheel contact model.

The project direction is simulation-first: the driving feel, wheel contact, suspension, terrain readability, and vehicle silhouette must be convincing before expanding into larger game modes or multiplayer.

## Phase 1: Physics Correctness

- Make suspension behavior physically readable on slopes, diagonal inclines, crests, and uneven wheel contact.
- Improve airborne behavior so jumps, wheel lift, landings, and recoveries are possible without the vehicle feeling glued to the terrain.
- Add rollover and flip dynamics with stable recovery handling.
- Tune torque, grip, braking, and hill-climb behavior against repeatable test hills.
- Keep regression tests for steering direction, wheel-contact plane attitude, airborne state, and suspension bounds.

## Phase 2: Terrain Visuals

- Restore sharp, unblurred, low-resolution terrain texture detail without UV striping or invisible/backface terrain.
- Prefer world-space or tile-space terrain coloring over repeated UV textures that alias into visible bands.
- Make grass, mud, rock, snow, and water visually distinct while preserving the chunky retro style.
- Validate terrain from chase camera, slope camera, and close-up views.

## Phase 3: Vehicle Art Pass

- Replace blocky or placeholder shapes with intentional low-poly forms: sloped hood, compact cabin, wheel arches, exposed wheels, visible hubs, number panels, and race-machine stance.
- Keep the car narrower and closer to the original 4x4 race-machine vibe.
- Make decals conform to body geometry rather than float as flat panels.
- Ensure tires, hubs, and panel textures read as sharp low-resolution textures.
- Remove visual elements that read as accidental posts, floating parts, or unrelated construction pieces.

## Phase 4: Gate Hunt Gameplay

- Turn Gate Hunt into a fully playable loop with active checkpoint direction, gate detection, run timing, best time, and reset/retry behavior.
- Make active gates clear in-world without overwhelming the retro visual style.
- Add simple completion feedback and route progression.
- Keep the mode playable in single-player before adding competing vehicles or network play.

## Phase 5: Damage, Flips, and Recovery

- Add crash response that affects handling without making the vehicle unusable too quickly.
- Add visible low-poly deformation or damage states for panels, wheels, and bumpers.
- Implement flip, roll, and landing logic so crashes are part of the game feel.
- Add recovery behavior that is fair but not intrusive.

## Phase 6: Multiplayer Readiness

- Do not implement multiplayer until the core driving feel, Gate Hunt loop, and recovery behavior are solid.
- Prepare the simulation state for future synchronization by keeping vehicle inputs, transforms, gate progress, and mode state explicit.
- Evaluate authoritative room-based multiplayer only after single-player physics and mode rules are stable.

## Acceptance Criteria

- Terrain is always visible and sharp from normal gameplay cameras.
- Vehicle body roll follows the terrain contact plane and does not lean opposite to ramps.
- The car can climb hills with enough torque while still being possible to slide, jump, flip, and land.
- Vehicle visuals read as a deliberate low-poly 4x4 racer, not stacked primitives.
- Gate Hunt is playable from start to finish with clear timing and progress.
- `npm run check` passes before commits.
