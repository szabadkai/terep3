import * as THREE from 'three';
import { createPanelTexture } from '../../game/pixelTextures';
import { terrainHeight } from '../../game/terrain';
import { updateVehicleState } from '../../game/vehicleDynamics';
import { wheelLayout, wheelRadius } from '../../game/wheelLayout';

export type VehicleRig = THREE.Group & {
  userData: {
    chassis?: THREE.Group;
    wheels?: THREE.Group[];
    wheelOffsets?: THREE.Vector3[];
    wheelRadius?: number;
    wheelSpin?: number[];
  };
};

type Section = {
  readonly z: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly topHalfWidth: number;
  readonly bottomHalfWidth: number;
};

const visualPitchScale = 0.56;
const visualRollScale = 0.5;

export function createVehicleMesh(): VehicleRig {
  const vehicle = new THREE.Group() as VehicleRig;
  const chassis = new THREE.Group();
  const materials = createVehicleMaterials();
  const wheels: THREE.Group[] = [];
  const wheelOffsets: THREE.Vector3[] = [];

  chassis.add(createMainHull(materials.body));
  chassis.add(createHoodPanel(materials.accent));
  chassis.add(createRearPanel(materials.accent));
  chassis.add(createCabin(materials.glass));
  chassis.add(createSkidPlate(materials.trim));
  chassis.add(createNumberPanel(-1));
  chassis.add(createNumberPanel(1));
  chassis.add(createBumpers(materials.cage));
  chassis.add(createFenders(materials.body));
  chassis.add(createRearDetails(materials.accent, materials.cage));

  wheelLayout.forEach((layout) => {
    const wheel = createWheel(materials.trim, materials.hub);
    wheel.position.set(layout.x, terrainHeight(0, 0) + wheelRadius, layout.z);
    wheels.push(wheel);
    wheelOffsets.push(new THREE.Vector3(layout.x, 0, layout.z));
    vehicle.add(wheel);
  });

  vehicle.add(chassis);
  vehicle.userData.chassis = chassis;
  vehicle.userData.wheels = wheels;
  vehicle.userData.wheelOffsets = wheelOffsets;
  vehicle.userData.wheelRadius = wheelRadius;
  vehicle.userData.wheelSpin = wheels.map(() => 0);

  return vehicle;
}

export function animateVehicleRig(
  vehicle: VehicleRig,
  state: ReturnType<typeof updateVehicleState>,
  steering: number,
  frameTime: number,
  deltaSeconds: number,
) {
  const { chassis, wheels, wheelOffsets } = vehicle.userData;
  const rigWheelRadius = vehicle.userData.wheelRadius;
  const wheelSpin = vehicle.userData.wheelSpin;

  if (!chassis || !wheels || !wheelOffsets || !rigWheelRadius || !wheelSpin) {
    return;
  }

  const averageContactHeight =
    state.wheelContacts.reduce((total, contact) => total + contact.groundHeight, 0) / state.wheelContacts.length;
  const visualBodyHeight = Math.max(state.bodyHeight - 0.34, averageContactHeight + rigWheelRadius + 0.38);
  const visualPitch = state.pitch * visualPitchScale;
  const visualRoll = state.roll * visualRollScale;

  chassis.position.y = visualBodyHeight;
  chassis.rotation.set(visualPitch, 0, visualRoll, 'YXZ');

  wheels.forEach((wheel, index) => {
    const offset = wheelOffsets[index];
    const contact = state.wheelContacts[index] ?? getWheelContactPoint(state.x, state.z, state.yaw, offset);
    const axleHop = Math.sin(frameTime * 0.016 + index * 1.9) * Math.min(0.035, Math.abs(state.speed) * 0.0012);
    const steerAngle = wheelLayout[index]?.steering ? steering * 0.45 : 0;
    const camber = contact.compression * offset.x * 0.08;

    wheelSpin[index] = (wheelSpin[index] - state.speed * deltaSeconds * 2.8) % (Math.PI * 2);
    const suspensionDrop = state.airborne ? -0.42 : 0;
    const wheelHeight = state.airborne
      ? visualBodyHeight - 0.88 + suspensionDrop
      : contact.groundHeight + rigWheelRadius + axleHop;

    wheel.position.set(offset.x, wheelHeight, offset.z);
    wheel.rotation.set(visualPitch * 0.38, steerAngle, visualRoll + camber, 'YXZ');
    spinWheelMeshes(wheel, wheelSpin[index]);
  });
}

function createVehicleMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#b8b7aa', '#5f615b', '#f2eed8'),
      flatShading: true,
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#f01816', '#7e0b0a', '#ff7064'),
      flatShading: true,
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
    cage: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#11171b', '#030405', '#30383e'),
      flatShading: true,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#78a6bd', '#29495a', '#b7dcec'),
      flatShading: true,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
    hub: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#d7c91d', '#6f6803', '#fff36c'),
      flatShading: true,
      roughness: 0.76,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: createCarTexture('#20272b', '#060809', '#4f5a60'),
      flatShading: true,
      roughness: 0.92,
      side: THREE.DoubleSide,
    }),
  };
}

function createMainHull(material: THREE.Material) {
  const sections: readonly Section[] = [
    { z: 2.62, topY: -0.08, bottomY: -0.5, topHalfWidth: 0.82, bottomHalfWidth: 1.12 },
    { z: 1.2, topY: 0.34, bottomY: -0.52, topHalfWidth: 1.04, bottomHalfWidth: 1.26 },
    { z: -0.65, topY: 0.36, bottomY: -0.5, topHalfWidth: 1.18, bottomHalfWidth: 1.28 },
    { z: -2.45, topY: 0.02, bottomY: -0.48, topHalfWidth: 1.0, bottomHalfWidth: 1.14 },
  ];

  const vertices = sections.flatMap((section) => [
    [-section.topHalfWidth, section.topY, section.z],
    [section.topHalfWidth, section.topY, section.z],
    [-section.bottomHalfWidth, section.bottomY, section.z],
    [section.bottomHalfWidth, section.bottomY, section.z],
  ]);
  const faces: number[][] = [];

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = index * 4;
    const next = current + 4;
    faces.push(
      [current, next, next + 1, current + 1],
      [current + 2, current, next, next + 2],
      [current + 1, current + 3, next + 3, next + 1],
      [current + 2, next + 2, next + 3, current + 3],
    );
  }

  faces.push([0, 1, 3, 2], [12, 14, 15, 13]);
  return createPolygonMesh(vertices, faces, material);
}

function createHoodPanel(material: THREE.Material) {
  return createPolygonMesh(
    [
      [-0.86, 0.04, 2.7],
      [0.86, 0.04, 2.7],
      [-1.08, 0.5, 0.75],
      [1.08, 0.5, 0.75],
      [-0.82, 0.18, 2.42],
      [0.82, 0.18, 2.42],
    ],
    [
      [0, 2, 3, 1],
      [4, 5, 3, 2],
    ],
    material,
  );
}

function createRearPanel(material: THREE.Material) {
  return createPolygonMesh(
    [
      [-1.02, 0.24, -0.95],
      [1.02, 0.24, -0.95],
      [-0.82, 0.06, -2.46],
      [0.82, 0.06, -2.46],
    ],
    [[0, 2, 3, 1]],
    material,
  );
}

function createCabin(glassMaterial: THREE.Material) {
  const cabin = new THREE.Group();
  cabin.add(
    createPolygonMesh(
      [
        [-0.94, 0.5, 0.68],
        [0.94, 0.5, 0.68],
        [-1.04, 0.46, -0.92],
        [1.04, 0.46, -0.92],
        [-0.68, 1.28, 0.32],
        [0.68, 1.28, 0.32],
        [-0.78, 1.02, -1.05],
        [0.78, 1.02, -1.05],
      ],
      [
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
        [4, 6, 7, 5],
      ],
      glassMaterial,
    ),
  );

  return cabin;
}

function createSkidPlate(material: THREE.Material) {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 4.05), material);
  plate.position.set(0, -0.66, 0.05);
  plate.castShadow = true;
  return plate;
}

function createNumberPanel(side: -1 | 1) {
  const number = createPolygonMesh(
    [
      [side * 1.286, 0.19, 0.88],
      [side * 1.192, 0.28, 0.08],
      [side * 1.192, -0.28, 0.08],
      [side * 1.286, -0.34, 0.88],
    ],
    [[0, 1, 2, 3]],
    createNumberMaterial(),
  );
  number.renderOrder = 2;
  return number;
}

function createBumpers(material: THREE.Material) {
  const bumpers = new THREE.Group();

  [
    [0, -0.38, 2.8, 2.86],
    [0, -0.42, -2.58, 2.42],
  ].forEach(([x, y, z, width]) => {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.2), material);
    bumper.position.set(x, y, z);
    bumper.castShadow = true;
    bumpers.add(bumper);
  });

  return bumpers;
}

function createFenders(bodyMaterial: THREE.Material) {
  const fenders = new THREE.Group();

  wheelLayout.forEach((wheel) => {
    const fender = createPolygonMesh(
      [
        [-0.5, 0.12, -0.62],
        [0.5, 0.12, -0.62],
        [-0.64, 0.05, 0.62],
        [0.64, 0.05, 0.62],
        [-0.46, 0.42, -0.28],
        [0.46, 0.42, -0.28],
        [-0.52, 0.32, 0.5],
        [0.52, 0.32, 0.5],
      ],
      [
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
        [4, 6, 7, 5],
      ],
      bodyMaterial,
    );
    fender.position.set(wheel.x * 0.76, 0.02, wheel.z);
    fenders.add(fender);
  });

  return fenders;
}

function createRearDetails(accentMaterial: THREE.Material, cageMaterial: THREE.Material) {
  const details = new THREE.Group();
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 0.28), accentMaterial);
  wing.position.set(0, 0.27, -2.43);
  wing.rotation.x = -0.08;
  wing.castShadow = true;
  details.add(wing);

  [-0.78, 0.78].forEach((x) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), cageMaterial);
    tail.position.set(x, 0.12, -2.52);
    tail.castShadow = true;
    details.add(tail);
  });

  return details;
}

function createWheel(tireMaterial: THREE.Material, hubMaterial: THREE.Material) {
  const wheel = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.56, 12), tireMaterial);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.61, 10), hubMaterial);

  tire.rotation.z = Math.PI / 2;
  hub.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  hub.castShadow = true;
  wheel.add(tire, hub);
  return wheel;
}

function spinWheelMeshes(wheel: THREE.Group, spin: number) {
  wheel.children.forEach((child) => {
    child.rotation.x = spin;
    child.rotation.z = Math.PI / 2;
  });
}

function createPolygonMesh(vertices: readonly number[][], faces: readonly number[][], material: THREE.Material) {
  const positions: number[] = [];

  faces.forEach((face) => {
    for (let index = 1; index < face.length - 1; index += 1) {
      [face[0], face[index], face[index + 1]].forEach((vertexIndex) => {
        positions.push(...vertices[vertexIndex]);
      });
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function createNumberMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.MeshBasicMaterial({ color: '#f5f0e1' });
  }

  context.clearRect(0, 0, 128, 128);
  context.fillStyle = '#f7f0d8';
  context.fillRect(10, 16, 108, 96);
  context.fillStyle = '#1a2024';
  context.font = 'bold 76px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('13', 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
}

function createCarTexture(base: string, dark: string, light: string) {
  return createPanelTexture(base, dark, light);
}

function getWheelContactPoint(x: number, z: number, yaw: number, offset: THREE.Vector3) {
  const worldX = x + Math.cos(yaw) * offset.x + Math.sin(yaw) * offset.z;
  const worldZ = z - Math.sin(yaw) * offset.x + Math.cos(yaw) * offset.z;

  return {
    groundHeight: terrainHeight(worldX, worldZ) + 0.04,
  };
}
