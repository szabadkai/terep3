# Terep3 Tasklist

> Generated from `ROADMAP.md` and current codebase state (2026-05-28).

Legend: `[x]` done, `[ ]` not started, `[~]` partially done / needs refinement.

---

## Phase 1: Physics Correctness

### Suspension & Contact
- [x] Spring/damper suspension model with per-vehicle tuning (`solveSuspension`, `suspension` spec field)
- [x] Four-wheel contact ground-height sampling with tire-profile footprint (`getWheelContactGroundHeight`)
- [x] Contact-plane attitude calculation driving pitch/roll (`calculateContactPlaneAttitude`, `fitContactPlane`)
- [x] Body height clamped between lowest-allowed and highest-allowed bounds
- [x] Suspension travel tracked per-frame and used for damage estimation
- [x] **Tune suspension on diagonal/cross-axle terrain** — cross-axle damping adds extra control when opposite diagonal wheel pairs are crossed-up
- [x] **Add anti-roll bar simulation** — reduces excessive body lean on side slopes without affecting single-wheel bump compliance

### Airborne & Landing
- [x] Airborne state detection (body too high + not rising fast enough to re-contact)
- [x] Gravity simulation during air time (constant -19.5 m/s²)
- [x] Reconnection gate when body drops below target height + 0.12 margin
- [x] Pitch/roll continues evolving in air (velocity-based)
- [x] **Tune jump takeoff from crests** — fast terrain drop-away now adds a bounded crest-launch boost when contact is lost
- [x] **Landing absorption** — first frame after reconnecting gets stronger damping and reduced retained downward velocity

### Rollover & Flip Dynamics
- [x] Rollover risk accumulates from combined roll stress, lateral stress, and speed stress (`calculateRolloverRisk`)
- [x] Overturned state locks roll to extreme angle and disables controls
- [x] Recovery: R key sets vehicle upright with zero velocity at average wheel ground height
- [x] **Flip detection on side slopes** — static tip-over risk model (`staticTipOverRisk`) adds risk from steep attitudes even at rest
- [x] **Recovery animation/transition** — the instant snap to upright is jarring; add a brief 0.3s lerp or camera transition

### Torque, Grip, Braking
- [x] Drive force with hill-torque compensation (`hillTorque` based on speed ratio)
- [x] Lateral grip proportional to vehicle grip stat and surface grip multiplier
- [x] Braking force at 20 units (no brake on reverse intent)
- [x] Drag from surface + damage penalty
- [x] Gradient force (gravity on slopes, 13 units)
- [ ] **Hill-climb tuning pass** — current `climbs a repeatable grass test hill` test passes but real hills may feel weak; test on max-terrain-gradient locations (ridge areas) and adjust `hillTorque` multiplier
- [x] **Handbrake / slide mechanic** — spacebar locks rear grip for tighter slides (`handbrake` input, physics constants)

### Regression Tests
- [x] Forward acceleration test
- [x] Steering speed-dependence test
- [x] Right-turn convention test (negative steering)
- [x] Terrain boundary clamping test
- [x] Lateral grip damping test
- [x] Surface traction comparison (water vs rock)
- [x] Hill-climb validation test
- [x] Braking test
- [x] Suspension body-height test
- [x] Airborne state entry test
- [x] Rollover test
- [x] Recovery test
- [x] Contact plane pitch/roll derivation test
- [x] Tire footprint above terrain test
- [x] **Add brake-reverse transition test** — verify that brake input does NOT produce reverse drive force when car is moving forward at speed
- [x] **Add ground contact loss/reconnect cycle test** — verify the car re-grounds correctly after a small jump

---

## Phase 2: Terrain Visuals

### Texture & Coloring
- [x] World-space / tile-space coloring via `getTerrainPixelColor` (no UV textures, no banding)
- [x] Cell-based noise for color variety (`seededTerrainNoise` with three layered noise channels)
- [x] Surface-type tinting (grass, mud, rock, snow, water)
- [x] Surface-type-specific shading patterns (`getSurfaceShade`)
- [x] `flatShading: true` for chunky retro look
- [x] `DoubleSide` rendering — no backface culling issues
- [ ] **Eliminate visible cell-grid seams** — the 3.2-unit cell size creates visible edges at certain distances; consider overlapping cell edges or adding a second octave of noise at a different scale
- [x] **Water surface flatness** — water areas currently follow the same terrain height function; consider making water cells perfectly flat or adding a subtle wave shader for the "water cut" feel mentioned in the Gate Hunt description

### Surface Distinction
- [x] Five surface types with distinct colors and shading
- [x] Terrain color-distance test verifies surfaces are visually distinct (>0.16 color distance)
- [ ] **Mud vs grass readability at distance** — mud is darker brown, grass is olive green; verify from chase camera that these remain distinguishable at 50-100m
- [ ] **Snow-ridge edge blending** — snow currently appears where `ridge > 0.75 && z > 10`; add a transition zone (0.65-0.75) with lerp blending instead of sharp cutoff

### Camera Validation
- [x] Three camera views: chase, slope, close-up
- [x] Camera target is always above body height (not ground plane)
- [ ] **Terrain LOD or distance fog tuning** — fog starts at 110 and ends at 310; verify that terrain is still readable from the slope camera at typical chase distances
- [ ] **Shadow map coverage** — sun shadow camera is 300x300; verify shadows don't cut off visibly at any camera angle near terrain edges

---

## Phase 3: Vehicle Art Pass

### Body Shape
- [x] Multi-section body: main hull, hood panel, rear panel, cabin, skid plate
- [x] Fenders per wheel position
- [x] Front and rear bumpers
- [x] Rear wing and tail details
- [x] **Narrow the body profile** — hull sections tightened to a narrower race-machine silhouette
- [x] **Slope the hood more aggressively** — hood nose lowered and narrowed for a sharper front profile
- [ ] **Raise and compact the cabin** — cabin roof is at y=1.28; consider raising slightly (1.4) and shortening the cabin length to emphasize the off-road machine silhouette
- [x] **Add visible suspension arms** — simple low-poly A-arms or trailing arms connecting chassis to wheel hubs; needs a less fragmentary treatment

### Wheel & Tire Details
- [x] Cylindrical tires with 12 segments and textured material
- [x] Visible hubs with contrasting yellow color
- [x] Wheel spin animation based on speed
- [x] Steering angle applied to front wheels (0.45 rad max)
- [x] Suspension compression visually moves wheels up/down
- [x] Camber simulation from compression
- [x] **Add tire tread texture** — dedicated tire material with visible tread blocks
- [x] **Make hub geometry more detailed** — current hub is a simple cylinder; add spokes or a star pattern for recognizable wheel-hub identity
- [ ] **Tire sidewall height** — tires are purely cylindrical; add a slight sidewall bulge or profile variation

### Decals & Number Panels
- [x] Number panels on both sides (number "13")
- [x] Panel texture with pixel-art base/dark/light colors
- [x] **Add race number to hood or roof** — current numbers are only on side panels; put the number on the hood for top-down readability
- [ ] **Sponsor/decal stripe geometry** — add a simple colored stripe or band across the body sides using a polygon strip rather than floating geometry
- [ ] **Make number panel conform to body curvature** — current panels are flat quads at fixed lateral offset; they should bend slightly to follow the hull's taper

### Visual Cleanup
- [ ] **Audit for floating/accidental geometry** — review all child meshes of the vehicle rig; remove any that read as construction artifacts
- [ ] **Ensure consistent material roughness** — body (0.84), accent (0.72), cage (0.9), glass (0.68), trim (0.92); decide on a cohesive range and keep materials within it
- [ ] **Wheel-well clearance check** — verify wheels don't clip through fenders at maximum compression + steering angle

---

## Phase 4: Gate Hunt Gameplay

### Gate Detection & Routing
- [x] Six gates (A-F) placed across the terrain
- [x] Gate detection at 4.2-unit radius
- [x] Sequential progression: A→B→C→D→E→F→(loop to A)
- [x] Run completion tracking with `completedRuns` counter
- [x] **Add gate-approach feedback sound or visual pulse** — active gate beacon/pulse intensifies within 10 units
- [x] **Prevent gate double-triggering** — cooldown prevents immediate repeat gate triggers

### Timing & Scoring
- [x] `elapsedSeconds` tracking with delta accumulation
- [x] `bestSeconds` persistence across runs
- [x] `lastRunSeconds` for last-completion display
- [x] `bestTimeImproved` flag for UI feedback
- [x] Time format: `M:SS.S`
- [x] **Add split times** — record time at each individual gate for post-run display; helps players identify which segments to improve
- [x] **Display best time prominently** — HUD now includes a dedicated best-time callout during runs

### In-World Feedback
- [x] Direction arrow marker with pulse animation and heading rotation
- [x] Gate post/banner color changes when active (yellow vs blue)
- [x] Arrow scales up on best-time-improved runs
- [x] Arrow hides when within 6 units of gate
- [x] **Add gate number floating label** — in-world sprite labels identify each gate above the posts
- [x] **Add completion celebration** — best-time run completion triggers a deterministic burst around the vehicle
- [x] **Active gate pulse beacon** — active gate has a pulsing beacon, translucent column, and point light for long-distance orientation

### Reset & Retry
- [x] `resetGateHuntRun` resets gate index, time, and progress while preserving history
- [x] Retry via Enter key, T key, or HUD button
- [x] Retry signal passed from HUD to GameScene
- [x] Direction arrow marker with heading rotation
- [x] **Add "start line" spawn position** — retry teleports the vehicle to the Gate Hunt start position

### HUD
- [x] Active gate ID display
- [x] Gate progress: cleared/total, distance, elapsed time, best time
- [x] Run feedback: "Best run" / "Last run" display
- [x] Completed runs counter
- [x] Retry button in panel header
- [x] **Add mini route map** — HUD shows gate positions, active gate, route line, vehicle position, and heading-to-gate line
- [x] **Show next gate preview** — HUD callout shows the next gate after the current active target
- [x] **Compact HUD cleanup** — remove unimplemented catalog, garage, and network affordances from the live overlay
- [ ] **Detailed split review UI** — move split times into a compact post-run or expandable panel instead of always reserving HUD space
- [ ] **Mode selection UI** — reintroduce a mode picker only after additional modes have playable logic and clear selected-mode behavior
- [ ] **Garage selection UI** — add vehicle selection, switching, and selected-vehicle feedback before showing garage stats in the HUD again

---

## Phase 5: Damage, Flips, and Recovery

### Damage System
- [x] `estimateImpactDamage` from slope hits and suspension bottom-outs
- [x] Damage affects vehicle drag (`state.damage * 0.012` added to drag)
- [x] Damage clamped to 0-100 range
- [x] **Differentiate damage types** — separate cosmetic damage from mechanical damage; mechanical damage only applies mild acceleration/drag penalties
- [~] **Damage thresholds** — replaced hard handling thresholds with a gentle continuous acceleration penalty
- [x] **HUD damage indicator** — show current damage as a bar or percentage in the HUD

### Visual Damage
- [x] **Panel deformation states** — create 2-3 levels of dented geometry variants for hood, doors, and roof that swap in based on damage level
- [ ] **Bumper detachment** — at high damage, bumpers should visibly hang or detach
- [ ] **Broken glass** — add crack texture overlay on cabin glass at moderate damage
- [ ] **Wheel damage visuals** — bent wheel geometry or wobble animation at high damage
- [ ] **Smoke/steam particles** — add engine smoke particles that increase with damage level

### Flip & Roll Logic
- [x] Rollover risk accumulation → overturn state
- [x] Overturned vehicles cannot drive
- [x] Recovery input (R key)
- [ ] **Partial roll states** — distinguish between "on side" (can self-right with throttle + steering), "on roof" (needs recovery), and "end-over-end" (full flip)
- [ ] **Roll momentum continuation** — currently once `overturned` is true, the car locks; allow the car to continue rolling through a full flip and potentially land back on wheels naturally

### Recovery
- [x] `recoverVehicle` resets position above ground with zero velocity
- [x] Recovery preserves damage state
- [x] **Recovery cooldown** — 2-second cooldown after recovery prevents spam
- [x] **Recovery penalty** — +3 seconds added to Gate Hunt clock on recovery
- [x] **Recovery animation** — brief camera shake or transition instead of instant teleport

---

## Phase 6: Multiplayer Readiness

### State Serialization
- [x] `ControlInput` type — throttle, brake, steering, recover
- [x] `VehicleState` type — position, velocity, orientation, contacts, damage, airborne
- [x] `GateHuntProgress` type — gate index, timing, runs completed
- [x] `GameMode` type — mode ID, label, summary, player count
- [ ] **Add network-serializable snapshot format** — define a compact binary or JSON schema for all three state types suitable for 20Hz network sync
- [ ] **Add state checksum/delta support** — define which fields can be delta-compressed vs full-sent
- [ ] **Input history buffer** — store last N frames of `ControlInput` for rollback netcode

### Simulation Determinism
- [ ] **Verify deterministic physics** — ensure `updateVehicleState` produces identical results given identical state, input, and delta; audit for any `Math.random()` or external state leakage
- [ ] **Fixed-point or quantized physics option** — consider quantizing positions/velocities to fixed precision for cross-platform determinism
- [ ] **Define authoritative reconciliation rules** — document which state fields the server overwrites vs. client-predicts

### Mode Readiness
- [x] Six game modes defined in catalog (`free-roam`, `gate-hunt`, `pathfinder`, `flag-run`, `destruction-zone`, `hill-trial`)
- [x] Player counts specified per mode
- [ ] **Pathfinder mode logic** — same gates, any order; implement path-finding scoring (shortest route wins)
- [ ] **Flag Run mode logic** — flag pickup, carry, drop, return mechanics
- [ ] **Destruction Zone scoring** — impact-angle and speed-based scoring formula
- [ ] **Hill Trial logic** — climb-checkpoint detection, rollback penalty timer
- [ ] **Network status UI** — add online-room/status controls only after networking architecture and room flow are implemented

### Pre-Multiplayer Gate
- [ ] **Single-player polish complete** — Gate Hunt loop, damage visuals, recovery all finalized (Phases 1-5 done)
- [ ] **Evaluate networking library** — research WebRTC vs WebSocket with authoritative server for room-based multiplayer
- [ ] **Prototype 2-player local split-screen** — validates state separation before adding network layer

---

## Cross-Cutting Tasks

### Build & Quality
- [x] `npm run check` pipeline: typecheck → lint → test → build
- [x] Vitest test suite with 6 test files
- [x] ESLint config with React hooks and refresh plugins
- [x] **Add CI workflow** — GitHub Actions to run `npm run check` on PRs
- [ ] **Performance budget** — establish baseline FPS on target hardware; add frame-time regression test

### Code Organization
- [x] **Extract physics constants to a config module** — physics tuning values live in `physics.ts`
- [ ] **Split `VehicleModel.ts`** — it's ~400 lines mixing body geometry, wheel animation, and material creation; separate into `VehicleBody.ts`, `VehicleWheels.ts`, `VehicleMaterials.ts`
- [ ] **Add JSDoc to public APIs** — `updateVehicleState`, `updateGateHuntProgress`, `getGameplayCameraPose`, `getSurfaceForPoint`

### Accessibility
- [x] **Keyboard remapping** — extract key bindings to a config constant so players can customize controls
- [x] **Gamepad support** — add Gamepad API input reader alongside keyboard controls
- [ ] **Colorblind terrain mode** — add pattern-based (not color-only) surface differentiation option

---

## Summary

| Phase | Done | Partial | Remaining | Total |
|-------|------|---------|-----------|-------|
| Phase 1: Physics | 40 | 0 | 1 | 41 |
| Phase 2: Terrain | 11 | 0 | 5 | 16 |
| Phase 3: Vehicle Art | 18 | 0 | 7 | 25 |
| Phase 4: Gate Hunt | 33 | 0 | 3 | 36 |
| Phase 5: Damage/Flips | 14 | 1 | 6 | 21 |
| Phase 6: Multiplayer | 6 | 0 | 14 | 20 |
| Cross-cutting | 7 | 0 | 4 | 11 |
| **Total** | **129** | **1** | **40** | **170** |

**Overall completion: ~76%** of the full-scope tasklist is done.

### Recommended Priority Order

1. **Phase 1 remaining** — physics tuning is foundational; everything else depends on good driving feel
2. **Phase 3 body narrowing + hood slope** — quick geometry changes with high visual impact
3. **Phase 4 gate feedback polish** — Gate Hunt is the flagship mode; make it shine
4. **Phase 5 damage visuals** — adds game-feel payoff for crashes that already exist in the physics
5. **Phase 2 terrain edge blending** — smooth out the few remaining visual artifacts
6. **Phase 5 recovery polish** — cooldown, penalty, animation
7. **Cross-cutting cleanup** — extract constants, add CI
8. **Phase 6 pre-multiplayer prep** — only after everything above is stable
