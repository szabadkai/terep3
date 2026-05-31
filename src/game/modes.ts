import { Flag, Gauge, MapPinned, Mountain, Swords, Trophy, Waypoints } from 'lucide-react';
import type { ComponentType } from 'react';

export type GameModeId =
  | 'free-roam'
  | 'gate-hunt'
  | 'pathfinder'
  | 'flag-run'
  | 'destruction-zone'
  | 'hill-trial';

export type GameMode = {
  readonly id: GameModeId;
  readonly label: string;
  readonly summary: string;
  readonly icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  readonly players: string;
};

export const modeCatalog: readonly GameMode[] = [
  {
    id: 'free-roam',
    label: 'Free Roam',
    summary: 'Open terrain, vehicle switching, recovery practice, and hidden lines.',
    icon: MapPinned,
    players: '1-8',
  },
  {
    id: 'gate-hunt',
    label: 'Gate Hunt',
    summary: 'Dynamic checkpoints across ridges, mud flats, ice, and water cuts.',
    icon: Waypoints,
    players: '1-8',
  },
  {
    id: 'pathfinder',
    label: 'Pathfinder',
    summary: 'Same gate set, any order. Route choice and hill reads win.',
    icon: Gauge,
    players: '1-8',
  },
  {
    id: 'flag-run',
    label: 'Flag Run',
    summary: 'Steal, hold, and return the flag while the pack hunts you.',
    icon: Flag,
    players: '2-8',
  },
  {
    id: 'destruction-zone',
    label: 'Destruction',
    summary: 'Score from impact angle, speed, rollovers, and survival time.',
    icon: Swords,
    players: '2-8',
  },
  {
    id: 'hill-trial',
    label: 'Hill Trial',
    summary: 'Low-speed climbs, technical routes, penalties for rollbacks.',
    icon: Mountain,
    players: '1-4',
  },
];

export const featuredMode = modeCatalog.find((mode) => mode.id === 'gate-hunt') ?? modeCatalog[0];

export const scoringSignals = [
  { label: 'Terrain gates', value: '18' },
  { label: 'Surface types', value: '5' },
  { label: 'Recovery gates', value: '7' },
  { label: 'Target FPS', value: '60' },
  { label: 'Online rooms', value: 'Planned' },
  { label: 'Split screen', value: 'Planned' },
] as const;

export const modeIconFallback = Trophy;
