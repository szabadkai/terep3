import type { ControlInput } from './vehicleDynamics';
import type { GameplayCameraView } from './gameplayCamera';

const activeKeys = new Set<string>();
const pressedKeys = new Set<string>();

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
  const forward = activeKeys.has('w') || activeKeys.has('arrowup');
  const reverse = activeKeys.has('s') || activeKeys.has('arrowdown');
  const left = activeKeys.has('a') || activeKeys.has('arrowleft');
  const right = activeKeys.has('d') || activeKeys.has('arrowright');
  const recover = activeKeys.has('r');
  const handbrake = activeKeys.has(' ') ? 1 : 0;

  return {
    throttle: forward ? 1 : 0,
    brake: reverse ? 1 : 0,
    steering: Number(left) - Number(right),
    recover,
    handbrake,
  };
}

export function readCameraViewInput(): GameplayCameraView | undefined {
  if (activeKeys.has('1')) {
    return 'chase';
  }

  if (activeKeys.has('2')) {
    return 'slope';
  }

  if (activeKeys.has('3')) {
    return 'close';
  }

  return undefined;
}

export function readGateHuntRetryInput() {
  return consumePressedKey('enter') || consumePressedKey('t');
}

function consumePressedKey(key: string) {
  const pressed = pressedKeys.has(key);
  pressedKeys.delete(key);
  return pressed;
}
