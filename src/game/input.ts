import type { ControlInput } from './vehicleDynamics';
import type { GameplayCameraView } from './gameplayCamera';

const activeKeys = new Set<string>();
const pressedKeys = new Set<string>();
const pressedGamepadButtons = new Set<string>();
const previouslyActiveGamepadButtons = new Set<string>();

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

export function readPlayerInput(): ControlInput {
  const keyboard = readKeyboardInput();
  const gamepad = readGamepadInput();

  return {
    throttle: Math.max(keyboard.throttle, gamepad.throttle),
    brake: Math.max(keyboard.brake, gamepad.brake),
    steering: clampAxis(keyboard.steering + gamepad.steering),
    recover: keyboard.recover || gamepad.recover,
    handbrake: Math.max(keyboard.handbrake ?? 0, gamepad.handbrake ?? 0),
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
  refreshGamepadButtons();
  return keyBindings.retry.some((key) => consumePressedKey(key)) || consumePressedGamepadButton('retry');
}

function hasActiveKey(keys: readonly string[]) {
  return keys.some((key) => activeKeys.has(key));
}

function readGamepadInput(): ControlInput {
  const gamepad = getPrimaryGamepad();

  if (!gamepad) {
    pressedGamepadButtons.clear();
    previouslyActiveGamepadButtons.clear();
    return { throttle: 0, brake: 0, steering: 0, recover: false, handbrake: 0 };
  }

  refreshGamepadButtons(gamepad);
  const leftStickX = deadzone(gamepad.axes[0] ?? 0, 0.18);
  const dpadLeft = isGamepadButtonActive(gamepad, 14) ? -1 : 0;
  const dpadRight = isGamepadButtonActive(gamepad, 15) ? 1 : 0;
  const throttle = Math.max(buttonValue(gamepad, 7), isGamepadButtonActive(gamepad, 0) ? 1 : 0);
  const brake = Math.max(buttonValue(gamepad, 6), isGamepadButtonActive(gamepad, 1) ? 1 : 0);

  return {
    throttle,
    brake,
    steering: clampAxis(leftStickX + dpadLeft + dpadRight),
    recover: isGamepadButtonActive(gamepad, 3),
    handbrake: Math.max(buttonValue(gamepad, 5), isGamepadButtonActive(gamepad, 2) ? 1 : 0),
  };
}

function getPrimaryGamepad() {
  return navigator.getGamepads().find((gamepad): gamepad is Gamepad => Boolean(gamepad?.connected));
}

function refreshGamepadButtons(gamepad = getPrimaryGamepad()) {
  const activeButtons = new Set<string>();

  if (gamepad) {
    if (isGamepadButtonActive(gamepad, 9)) {
      activeButtons.add('retry');
    }
  }

  activeButtons.forEach((button) => {
    if (!previouslyActiveGamepadButtons.has(button)) {
      pressedGamepadButtons.add(button);
    }
  });

  previouslyActiveGamepadButtons.clear();
  activeButtons.forEach((button) => previouslyActiveGamepadButtons.add(button));
}

function consumePressedGamepadButton(button: string) {
  const pressed = pressedGamepadButtons.has(button);
  pressedGamepadButtons.delete(button);
  return pressed;
}

function buttonValue(gamepad: Gamepad, index: number) {
  return gamepad.buttons[index]?.value ?? 0;
}

function isGamepadButtonActive(gamepad: Gamepad, index: number) {
  return (gamepad.buttons[index]?.value ?? 0) > 0.45;
}

function deadzone(value: number, threshold: number) {
  return Math.abs(value) < threshold ? 0 : value;
}

function clampAxis(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function consumePressedKey(key: string) {
  const pressed = pressedKeys.has(key);
  pressedKeys.delete(key);
  return pressed;
}
