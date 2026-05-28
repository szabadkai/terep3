import type { ControlInput } from './vehicleDynamics';

const activeKeys = new Set<string>();

export function bindKeyboardControls() {
  const keydown = (event: KeyboardEvent) => activeKeys.add(event.key.toLowerCase());
  const keyup = (event: KeyboardEvent) => activeKeys.delete(event.key.toLowerCase());

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);

  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    activeKeys.clear();
  };
}

export function readKeyboardInput(): ControlInput {
  const forward = activeKeys.has('w') || activeKeys.has('arrowup');
  const reverse = activeKeys.has('s') || activeKeys.has('arrowdown');
  const left = activeKeys.has('a') || activeKeys.has('arrowleft');
  const right = activeKeys.has('d') || activeKeys.has('arrowright');

  return {
    throttle: forward ? 1 : 0,
    brake: reverse ? 1 : 0,
    steering: Number(left) - Number(right),
  };
}
