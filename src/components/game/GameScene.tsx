import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getGameplayCameraPose, type GameplayCameraView } from '../../game/gameplayCamera';
import { bindKeyboardControls, readCameraViewInput, readGateHuntRetryInput, readPlayerInput } from '../../game/input';
import { createGateMarkers, createSceneryMeshes, createTerrainMesh, terrainHeight } from '../../game/terrain';
import {
  gateTargets,
  initialGateHuntProgress,
  resetGateHuntRun,
  updateGateHuntProgress,
  type GateHuntProgress,
} from '../../game/gateHunt';
import {
  initialVehicleState,
  resetVehicleForGateHunt,
  updateVehicleState,
  type VehicleState,
} from '../../game/vehicleDynamics';
import { vehicleCatalog } from '../../game/vehicles';
import { animateVehicleRig, createVehicleMesh } from './VehicleModel';

type GameSceneProps = {
  readonly onGateHuntProgress?: (progress: GateHuntProgress) => void;
  readonly onVehicleState?: (state: VehicleState) => void;
  readonly gateHuntRetrySignal?: number;
};

type RecoveryTransition = {
  readonly startedAt: number;
  readonly from: VehicleState;
  readonly to: VehicleState;
};

export function GameScene({ onGateHuntProgress, onVehicleState, gateHuntRetrySignal = 0 }: GameSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const retrySignalRef = useRef(gateHuntRetrySignal);

  useEffect(() => {
    retrySignalRef.current = gateHuntRetrySignal;
  }, [gateHuntRetrySignal]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9db6c6');
    scene.fog = new THREE.Fog('#9db6c6', 240, 900);

    const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 0.1, 1100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(createLighting());
    scene.add(createTerrainMesh());
    scene.add(createSceneryMeshes());
    const gateMarkers = createGateMarkers();
    const gateLabels = createGateLabels();
    const gateDirectionMarker = createGateDirectionMarker();
    const activeGateBeacon = createActiveGateBeacon();
    const completionCelebration = createCompletionCelebration();
    scene.add(gateMarkers);
    scene.add(gateLabels);
    scene.add(gateDirectionMarker);
    scene.add(activeGateBeacon);
    scene.add(completionCelebration);

    const vehicle = createVehicleMesh();
    scene.add(vehicle);

    const cleanupControls = bindKeyboardControls();
    let frameId = 0;
    let previousFrameTime = performance.now();
    let vehicleState = initialVehicleState;
    let gateProgress = initialGateHuntProgress;
    let lastProgressEmit = 0;
    let cameraView: GameplayCameraView = 'chase';
    let lastRetrySignal = retrySignalRef.current;
    let previousCompletedRuns = gateProgress.completedRuns;
    let recoveryTransition: RecoveryTransition | undefined;

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    const animate = () => {
      const frameTime = performance.now();
      const deltaSeconds = Math.min((frameTime - previousFrameTime) / 1000, 0.05);
      previousFrameTime = frameTime;
      const input = readPlayerInput();
      cameraView = readCameraViewInput() ?? cameraView;
      const previousVehicleState = vehicleState;
      vehicleState = updateVehicleState(vehicleState, input, vehicleCatalog[0], deltaSeconds);
      if (didRecover(previousVehicleState, vehicleState)) {
        recoveryTransition = {
          startedAt: frameTime,
          from: previousVehicleState,
          to: vehicleState,
        };
      }
      const wantsRetry = readGateHuntRetryInput();
      const didRetry = wantsRetry || retrySignalRef.current !== lastRetrySignal;
      lastRetrySignal = retrySignalRef.current;

      if (didRetry) {
        vehicleState = resetVehicleForGateHunt();
        recoveryTransition = undefined;
      }

      const visualVehicleState = resolveVisualVehicleState(vehicleState, recoveryTransition, frameTime);
      if (recoveryTransition && visualVehicleState === vehicleState) {
        recoveryTransition = undefined;
      }

      vehicle.position.set(visualVehicleState.x, 0, visualVehicleState.z);
      vehicle.rotation.set(0, visualVehicleState.yaw, 0);
      animateVehicleRig(vehicle, visualVehicleState, input.steering, frameTime, deltaSeconds);
      gateProgress = didRetry
        ? resetGateHuntRun(gateProgress, vehicleState)
        : updateGateHuntProgress(gateProgress, vehicleState, deltaSeconds);
      if (gateProgress.completedRuns > previousCompletedRuns && gateProgress.bestTimeImproved) {
        triggerCompletionCelebration(completionCelebration, vehicleState, frameTime);
      }
      previousCompletedRuns = gateProgress.completedRuns;
      updateGateMarkerHighlight(gateMarkers, gateProgress.activeGateIndex);
      updateGateLabels(gateLabels, gateProgress.activeGateIndex, frameTime);
      updateActiveGateBeacon(activeGateBeacon, gateProgress, frameTime);
      updateCompletionCelebration(completionCelebration, frameTime);
      updateGateDirectionMarker(gateDirectionMarker, gateProgress, visualVehicleState, frameTime);

      if (frameTime - lastProgressEmit > 180 || gateProgress.distanceToGate < 4.2 || didRetry) {
        onGateHuntProgress?.(gateProgress);
        onVehicleState?.(vehicleState);
        lastProgressEmit = frameTime;
      }

      const cameraPose = getGameplayCameraPose(visualVehicleState, cameraView);
      const cameraTarget = new THREE.Vector3(...cameraPose.target);
      const cameraShake = recoveryTransition ? calculateRecoveryShake(recoveryTransition, frameTime) : new THREE.Vector3();
      camera.position.lerp(new THREE.Vector3(...cameraPose.position).add(cameraShake), cameraPose.smoothing);
      camera.lookAt(cameraTarget);

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      cleanupControls();
      resizeObserver.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onGateHuntProgress, onVehicleState]);

  return <div className="game-scene" ref={mountRef} data-testid="game-scene" />;
}

function didRecover(previous: VehicleState, current: VehicleState) {
  return previous.overturned && !current.overturned && current.recoveryPenalty > previous.recoveryPenalty;
}

function resolveVisualVehicleState(
  state: VehicleState,
  transition: RecoveryTransition | undefined,
  frameTime: number,
): VehicleState {
  if (!transition) {
    return state;
  }

  const amount = THREE.MathUtils.smoothstep((frameTime - transition.startedAt) / 340, 0, 1);

  if (amount >= 1) {
    return state;
  }

  return {
    ...state,
    x: THREE.MathUtils.lerp(transition.from.x, transition.to.x, amount),
    z: THREE.MathUtils.lerp(transition.from.z, transition.to.z, amount),
    yaw: lerpAngle(transition.from.yaw, transition.to.yaw, amount),
    bodyHeight: THREE.MathUtils.lerp(transition.from.bodyHeight, transition.to.bodyHeight, amount),
    pitch: THREE.MathUtils.lerp(transition.from.pitch, transition.to.pitch, amount),
    roll: THREE.MathUtils.lerp(transition.from.roll, transition.to.roll, amount),
    wheelContacts: transition.to.wheelContacts,
    overturned: false,
  };
}

function calculateRecoveryShake(transition: RecoveryTransition, frameTime: number) {
  const elapsed = (frameTime - transition.startedAt) / 340;
  const strength = Math.max(0, 1 - elapsed) * 0.42;

  return new THREE.Vector3(
    Math.sin(frameTime * 0.052) * strength,
    Math.sin(frameTime * 0.067) * strength * 0.5,
    Math.cos(frameTime * 0.047) * strength,
  );
}

function lerpAngle(start: number, end: number, amount: number) {
  const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  return start + delta * amount;
}

function createGateLabels() {
  const labels = new THREE.Group();

  gateTargets.forEach((gate, gateIndex) => {
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGateLabelTexture(gate.id),
        transparent: true,
        depthWrite: false,
      }),
    );
    label.position.set(gate.x, terrainHeight(gate.x, gate.z) + 7.1, gate.z);
    label.scale.set(3.8, 1.9, 1);
    label.userData.gateIndex = gateIndex;
    labels.add(label);
  });

  return labels;
}

function createGateLabelTexture(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, 128, 64);
  context.fillStyle = 'rgba(23, 32, 38, 0.82)';
  context.fillRect(18, 8, 92, 48);
  context.strokeStyle = '#ffdf45';
  context.lineWidth = 5;
  context.strokeRect(18, 8, 92, 48);
  context.fillStyle = '#f6f1e4';
  context.font = 'bold 38px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 64, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function updateGateLabels(labels: THREE.Group, activeGateIndex: number, frameTime: number) {
  labels.children.forEach((label) => {
    const isActive = label.userData.gateIndex === activeGateIndex;
    const scale = isActive ? 1.1 + Math.sin(frameTime * 0.006) * 0.08 : 0.86;
    label.scale.set(3.8 * scale, 1.9 * scale, 1);
  });
}

function createActiveGateBeacon() {
  const beacon = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.35, 0.08, 6, 28),
    new THREE.MeshStandardMaterial({
      color: '#ffdf45',
      emissive: '#6a4c05',
      emissiveIntensity: 0.9,
      roughness: 0.5,
    }),
  );
  const mast = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 1.25, 4),
    new THREE.MeshStandardMaterial({
      color: '#ff6e54',
      emissive: '#672014',
      emissiveIntensity: 0.75,
      roughness: 0.58,
    }),
  );
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 1.8, 12, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#ffdf45',
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const light = new THREE.PointLight('#ffdf45', 3.1, 34, 1.6);

  ring.rotation.x = Math.PI / 2;
  mast.position.y = 5.9;
  mast.rotation.y = Math.PI / 4;
  beam.position.y = 6.2;
  light.position.y = 5.6;
  beacon.add(ring, mast, beam, light);
  beacon.traverse((object) => {
    object.castShadow = true;
  });

  return beacon;
}

function updateActiveGateBeacon(marker: THREE.Group, progress: GateHuntProgress, frameTime: number) {
  const gate = gateTargets[progress.activeGateIndex];
  const approachPulse = progress.distanceToGate < 10 ? 0.42 : 0.18;
  const pulse = 1 + Math.sin(frameTime * 0.008) * approachPulse;
  const light = marker.children.find((child): child is THREE.PointLight => child instanceof THREE.PointLight);
  const beam = marker.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry);

  marker.position.set(gate.x, terrainHeight(gate.x, gate.z) + 0.18, gate.z);
  marker.scale.set(pulse, 1, pulse);
  marker.rotation.y = frameTime * 0.0016;

  if (light) {
    light.intensity = progress.distanceToGate < 35 ? 4.2 + Math.sin(frameTime * 0.01) * 0.8 : 2.8;
  }

  if (beam instanceof THREE.Mesh && beam.material instanceof THREE.MeshBasicMaterial) {
    beam.material.opacity = progress.distanceToGate < 35 ? 0.22 : 0.13;
  }
}

function createCompletionCelebration() {
  const celebration = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#ffdf45',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 32), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  celebration.add(ring);

  for (let index = 0; index < 12; index += 1) {
    const spark = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.72),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? '#ffdf45' : '#ff6e54',
        transparent: true,
        opacity: 0,
      }),
    );
    spark.userData.angle = (index / 12) * Math.PI * 2;
    celebration.add(spark);
  }

  celebration.visible = false;
  celebration.userData.startedAt = -Infinity;
  return celebration;
}

function triggerCompletionCelebration(marker: THREE.Group, vehicleState: VehicleState, frameTime: number) {
  marker.visible = true;
  marker.userData.startedAt = frameTime;
  marker.position.set(vehicleState.x, vehicleState.bodyHeight + 1.2, vehicleState.z);
}

function updateCompletionCelebration(marker: THREE.Group, frameTime: number) {
  const elapsed = (frameTime - marker.userData.startedAt) / 1000;

  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 1.15) {
    marker.visible = false;
    return;
  }

  const fade = 1 - elapsed / 1.15;
  const spread = 1 + elapsed * 5.6;
  marker.visible = true;
  marker.rotation.y = frameTime * 0.003;

  marker.children.forEach((child, index) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
      child.material.opacity = index === 0 ? fade * 0.82 : fade * 0.95;
    }

    if (index === 0) {
      child.scale.setScalar(spread);
      return;
    }

    const angle = child.userData.angle as number;
    child.position.set(Math.cos(angle) * spread, Math.sin(elapsed * Math.PI) * 2.4, Math.sin(angle) * spread);
    child.rotation.set(angle, angle, elapsed * 8);
  });
}

function createGateDirectionMarker() {
  const marker = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.18, 2.6),
    new THREE.MeshStandardMaterial({ color: '#ffdf45', emissive: '#6a4c05', emissiveIntensity: 0.7, roughness: 0.62 }),
  );
  const point = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 1.45, 4),
    new THREE.MeshStandardMaterial({ color: '#ff6e54', emissive: '#672014', emissiveIntensity: 0.58, roughness: 0.56 }),
  );

  shaft.position.z = 0.56;
  point.position.z = 2.05;
  point.rotation.x = Math.PI / 2;
  marker.add(shaft, point);
  marker.traverse((object) => {
    object.castShadow = true;
  });

  return marker;
}

function updateGateDirectionMarker(
  marker: THREE.Group,
  progress: GateHuntProgress,
  vehicleState: VehicleState,
  frameTime: number,
) {
  const pulse = Math.sin(frameTime * 0.006) * 0.16;
  marker.visible = progress.distanceToGate > 6;
  marker.position.set(vehicleState.x, vehicleState.bodyHeight + 2.9 + pulse, vehicleState.z);
  marker.rotation.set(-0.18, progress.headingToGate, 0, 'YXZ');
  marker.scale.setScalar(progress.bestTimeImproved ? 1.25 : 1);
}

function createLighting() {
  const lighting = new THREE.Group();
  const hemisphere = new THREE.HemisphereLight('#e8f4f4', '#6f6654', 1.9);
  const sun = new THREE.DirectionalLight('#fff1c4', 2.8);
  sun.position.set(-40, 80, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -520;
  sun.shadow.camera.right = 520;
  sun.shadow.camera.top = 520;
  sun.shadow.camera.bottom = -520;
  lighting.add(hemisphere, sun);
  return lighting;
}

function updateGateMarkerHighlight(markers: THREE.Group, activeGateIndex: number) {
  markers.traverse((object) => {
    const material = (object as THREE.Mesh).material;

    if (!material || !('color' in material) || typeof object.userData.gateIndex !== 'number') {
      return;
    }

    const color = object.userData.gateIndex === activeGateIndex ? '#ffdf45' : '#5f8fbd';
    (material as THREE.MeshStandardMaterial).color.set(color);
  });
}
