import type { ControlInput } from './vehicleDynamics';
import type { GameplayCameraView } from './gameplayCamera';

const activeKeys = new Set<string>();
const pressedKeys = new Set<string>();

export const keyBindings = {
  throttle: ['w', 'arrowup'],
  brake: ['s', 'arrowdown'],
  steerLeft: ['a', 'arrowleft'],
  steerRight: ['d', 'arrowright'],
  recover: ['r'],
  handbrake: [' '],
  retry: ['enter', 't'],
  cameraViews: {
    chase: ['1'],
    slope: ['2'],
    close: ['3'],
  },
} as const;

export function bindKeyboardControls() {
  const keydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    activeKeys.add(key);

    if (!event.repeat) {
      pressedKeys.add(key);
    }
  };
  const keyup = (event: KeyboardEvent) => activeKeys.delete(event.key.toLowerCase());

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);

  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    activeKeys.clear();
    pressedKeys.clear();
  };
}

export function readKeyboardInput(): ControlInput {
  const forward = hasActiveKey(keyBindings.throttle);
  const reverse = hasActiveKey(keyBindings.brake);
  const left = hasActiveKey(keyBindings.steerLeft);
  const right = hasActiveKey(keyBindings.steerRight);
  const recover = hasActiveKey(keyBindings.recover);
  const handbrake = hasActiveKey(keyBindings.handbrake) ? 1 : 0;

  return {
    throttle: forward ? 1 : 0,
    brake: reverse ? 1 : 0,
    steering: Number(left) - Number(right),
    recover,
    handbrake,
  };
}

export function readCameraViewInput(): GameplayCameraView | undefined {
  if (hasActiveKey(keyBindings.cameraViews.chase)) {
    return 'chase';
  }

  if (hasActiveKey(keyBindings.cameraViews.slope)) {
    return 'slope';
  }

  if (hasActiveKey(keyBindings.cameraViews.close)) {
    return 'close';
  }

  return undefined;
}

export function readGateHuntRetryInput() {
  return keyBindings.retry.some((key) => consumePressedKey(key));
}

function hasActiveKey(keys: readonly string[]) {
  return keys.some((key) => activeKeys.has(key));
}

function consumePressedKey(key: string) {
  const pressed = pressedKeys.has(key);
  pressedKeys.delete(key);
  return pressed;
}
