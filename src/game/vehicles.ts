export type VehicleClass = 'crawler' | 'rally' | 'truck';

export type VehicleSpec = {
  readonly id: string;
  readonly name: string;
  readonly className: VehicleClass;
  readonly mass: number;
  readonly acceleration: number;
  readonly grip: number;
  readonly suspension: number;
  readonly durability: number;
  readonly color: string;
};

export const vehicleCatalog: readonly VehicleSpec[] = [
  {
    id: 'puli-4x4',
    name: 'Puli 4x4',
    className: 'crawler',
    mass: 1280,
    acceleration: 10.6,
    grip: 10.2,
    suspension: 9.2,
    durability: 7.4,
    color: '#e7c66d',
  },
  {
    id: 'betyar-r',
    name: 'Betyar R',
    className: 'rally',
    mass: 1120,
    acceleration: 8.9,
    grip: 7.6,
    suspension: 7.9,
    durability: 6.3,
    color: '#da6c54',
  },
  {
    id: 'csiko-heavy',
    name: 'Csiko Heavy',
    className: 'truck',
    mass: 1620,
    acceleration: 5.9,
    grip: 8.1,
    suspension: 8.6,
    durability: 9.5,
    color: '#5fae8f',
  },
];

export function getVehicleScore(vehicle: VehicleSpec) {
  return Math.round(
    vehicle.acceleration * 1.8 +
      vehicle.grip * 2.2 +
      vehicle.suspension * 2 +
      vehicle.durability * 1.4 -
      vehicle.mass / 600,
  );
}
