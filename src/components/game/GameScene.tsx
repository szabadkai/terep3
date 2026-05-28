import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getGameplayCameraPose, type GameplayCameraView } from '../../game/gameplayCamera';
import { bindKeyboardControls, readCameraViewInput, readKeyboardInput } from '../../game/input';
import { createGateMarkers, createTerrainMesh } from '../../game/terrain';
import { initialGateHuntProgress, updateGateHuntProgress, type GateHuntProgress } from '../../game/gateHunt';
import { initialVehicleState, updateVehicleState } from '../../game/vehicleDynamics';
import { vehicleCatalog } from '../../game/vehicles';
import { animateVehicleRig, createVehicleMesh } from './VehicleModel';

type GameSceneProps = {
  readonly onGateHuntProgress?: (progress: GateHuntProgress) => void;
};

export function GameScene({ onGateHuntProgress }: GameSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9db6c6');
    scene.fog = new THREE.Fog('#9db6c6', 110, 310);

    const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 0.1, 520);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(createLighting());
    scene.add(createTerrainMesh());
    const gateMarkers = createGateMarkers();
    scene.add(gateMarkers);

    const vehicle = createVehicleMesh();
    scene.add(vehicle);

    const cleanupControls = bindKeyboardControls();
    let frameId = 0;
    let previousFrameTime = performance.now();
    let vehicleState = initialVehicleState;
    let gateProgress = initialGateHuntProgress;
    let lastProgressEmit = 0;
    let cameraView: GameplayCameraView = 'chase';

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
      const input = readKeyboardInput();
      cameraView = readCameraViewInput() ?? cameraView;
      vehicleState = updateVehicleState(vehicleState, input, vehicleCatalog[0], deltaSeconds);

      vehicle.position.set(vehicleState.x, 0, vehicleState.z);
      vehicle.rotation.set(0, vehicleState.yaw, 0);
      animateVehicleRig(vehicle, vehicleState, input.steering, frameTime, deltaSeconds);
      gateProgress = updateGateHuntProgress(gateProgress, vehicleState, deltaSeconds);
      updateGateMarkerHighlight(gateMarkers, gateProgress.activeGateIndex);

      if (frameTime - lastProgressEmit > 180 || gateProgress.distanceToGate < 4.2) {
        onGateHuntProgress?.(gateProgress);
        lastProgressEmit = frameTime;
      }

      const cameraPose = getGameplayCameraPose(vehicleState, cameraView);
      const cameraTarget = new THREE.Vector3(...cameraPose.target);
      camera.position.lerp(new THREE.Vector3(...cameraPose.position), cameraPose.smoothing);
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
  }, [onGateHuntProgress]);

  return <div className="game-scene" ref={mountRef} data-testid="game-scene" />;
}

function createLighting() {
  const lighting = new THREE.Group();
  const hemisphere = new THREE.HemisphereLight('#e8f4f4', '#6f6654', 1.9);
  const sun = new THREE.DirectionalLight('#fff1c4', 2.8);
  sun.position.set(-40, 80, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
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
