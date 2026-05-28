export type WheelId = 'front-left' | 'front-right' | 'rear-left' | 'rear-right';

export type WheelLayout = {
  readonly id: WheelId;
  readonly x: number;
  readonly z: number;
  readonly steering: boolean;
};

export const wheelRadius = 0.72;
export const suspensionRestLength = 0.82;

export const wheelLayout: readonly WheelLayout[] = [
  { id: 'front-left', x: -1.42, z: 1.62, steering: true },
  { id: 'front-right', x: 1.42, z: 1.62, steering: true },
  { id: 'rear-left', x: -1.42, z: -1.72, steering: false },
  { id: 'rear-right', x: 1.42, z: -1.72, steering: false },
] as const;
