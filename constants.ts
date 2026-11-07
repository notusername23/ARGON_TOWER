/**
 * Constants and Game Definitions for Nexus Grid 3D
 */

export const GRID_W = 18;
export const GRID_H = 10;
export const TILE_SIZE = 2.0;

export interface GridCell {
  x: number;
  z: number;
}

export const SPAWN_CELLS: GridCell[] = [
  { x: 0, z: 4 },
  { x: 0, z: 5 },
];

export const GOAL_CELLS: GridCell[] = [
  { x: 17, z: 4 },
  { x: 17, z: 5 },
];

export type TurretTypeId = 'pulse' | 'cryo' | 'mortar' | 'tesla';

export interface TurretLevelStat {
  damage: number;
  rate: number;
  range: number;
  upgradeCost: number;
  slowFactor?: number;
  slowDuration?: number;
  splash?: number;
  chains?: number;
  chainRange?: number;
}

export interface TurretSpec {
  id: TurretTypeId;
  name: string;
  iconName: string;
  color: number;
  hex: string;
  cost: number;
  tagline: string;
  desc: string;
  special: string;
  levels: TurretLevelStat[];
}

export const TURRET_SPECS: Record<TurretTypeId, TurretSpec> = {
  pulse: {
    id: 'pulse',
    name: 'PULSE CANNON',
    iconName: 'crosshair',
    color: 0x22d3ee,
    hex: '#22d3ee',
    cost: 100,
    tagline: 'Rapid Laser',
    desc: 'High-velocity twin kinetic laser turret delivering surgical single-target burst DPS.',
    special: 'Instant Laser Lock',
    levels: [
      { damage: 28, rate: 2.8, range: 3.8, upgradeCost: 110 },
      { damage: 52, rate: 3.4, range: 4.4, upgradeCost: 170 },
      { damage: 92, rate: 4.2, range: 5.0, upgradeCost: 0 },
    ],
  },
  cryo: {
    id: 'cryo',
    name: 'CRYO EMITTER',
    iconName: 'snowflake',
    color: 0x60a5fa,
    hex: '#60a5fa',
    cost: 125,
    tagline: 'Frost Nova Beam',
    desc: 'Sub-zero frost spire that slows target groups with chilling AoE shockwaves.',
    special: '45% Movement Chill',
    levels: [
      { damage: 16, rate: 2.2, range: 3.5, slowFactor: 0.55, slowDuration: 2.2, splash: 1.5, upgradeCost: 125 },
      { damage: 30, rate: 2.8, range: 4.0, slowFactor: 0.45, slowDuration: 2.8, splash: 1.9, upgradeCost: 185 },
      { damage: 50, rate: 3.4, range: 4.6, slowFactor: 0.35, slowDuration: 3.5, splash: 2.4, upgradeCost: 0 },
    ],
  },
  mortar: {
    id: 'mortar',
    name: 'MORTAR BATTERY',
    iconName: 'bomb',
    color: 0xf97316,
    hex: '#f97316',
    cost: 150,
    tagline: 'AoE Artillery Shells',
    desc: 'Heavy long-range artillery lobbing ballistic plasma shells with destructive splash radius.',
    special: 'Ballistic AoE Splash',
    levels: [
      { damage: 60, rate: 0.8, range: 6.4, splash: 2.4, upgradeCost: 150 },
      { damage: 110, rate: 1.0, range: 7.2, splash: 2.9, upgradeCost: 220 },
      { damage: 195, rate: 1.25, range: 8.0, splash: 3.5, upgradeCost: 0 },
    ],
  },
  tesla: {
    id: 'tesla',
    name: 'TESLA COIL',
    iconName: 'zap',
    color: 0xc084fc,
    hex: '#c084fc',
    cost: 175,
    tagline: 'Chain Lightning',
    desc: 'High-voltage coil discharging ionized chain lightning arcs that fry swarm clusters.',
    special: '3-6 Target Chain Arc',
    levels: [
      { damage: 42, rate: 1.3, range: 4.2, chains: 3, chainRange: 3.2, upgradeCost: 175 },
      { damage: 75, rate: 1.6, range: 4.7, chains: 4, chainRange: 3.7, upgradeCost: 250 },
      { damage: 135, rate: 2.0, range: 5.3, chains: 6, chainRange: 4.2, upgradeCost: 0 },
    ],
  },
};

export type EnemyTypeId = 'scout' | 'sprinter' | 'tank' | 'boss' | 'colossus' | 'final_boss';

export interface EnemySpec {
  name: string;
  hp: number;
  speed: number;
  reward: number;
  color: number;
  hex: string;
  scale: number;
  damage: number;
  isBoss?: boolean;
  bossTitle?: string;
  shieldRecharge?: boolean;
}

export const ENEMY_TYPES: Record<EnemyTypeId, EnemySpec> = {
  scout: {
    name: 'Swarm Scout',
    hp: 80,
    speed: 2.5,
    reward: 14,
    color: 0x38bdf8,
    hex: '#38bdf8',
    scale: 0.55,
    damage: 1,
  },
  sprinter: {
    name: 'Speed Sprinter',
    hp: 65,
    speed: 3.8,
    reward: 16,
    color: 0xfacc15,
    hex: '#facc15',
    scale: 0.52,
    damage: 1,
  },
  tank: {
    name: 'Armored Tank',
    hp: 260,
    speed: 1.4,
    reward: 30,
    color: 0xf43f5e,
    hex: '#f43f5e',
    scale: 0.8,
    damage: 2,
  },
  boss: {
    name: 'Dreadnought Core',
    bossTitle: 'Tier I Boss',
    hp: 950,
    speed: 1.1,
    reward: 110,
    color: 0xa855f7,
    hex: '#a855f7',
    scale: 1.15,
    damage: 4,
    isBoss: true,
  },
  colossus: {
    name: 'Apex Colossus',
    bossTitle: 'Tier II Boss',
    hp: 1750,
    speed: 0.95,
    reward: 200,
    color: 0xf97316,
    hex: '#f97316',
    scale: 1.35,
    damage: 6,
    isBoss: true,
  },
  final_boss: {
    name: 'NEXUS OVERLORD PRIMUS',
    bossTitle: '★ SUPREME FINAL BOSS ★',
    hp: 3400,
    speed: 0.75,
    reward: 450,
    color: 0xef4444,
    hex: '#ef4444',
    scale: 1.6,
    damage: 10,
    isBoss: true,
    shieldRecharge: true,
  },
};

export function gridToWorld(gx: number, gz: number) {
  return {
    x: (gx - GRID_W / 2 + 0.5) * TILE_SIZE,
    z: (gz - GRID_H / 2 + 0.5) * TILE_SIZE,
  };
}

export function worldToGrid(wx: number, wz: number) {
  const gx = Math.floor(wx / TILE_SIZE + GRID_W / 2);
  const gz = Math.floor(wz / TILE_SIZE + GRID_H / 2);
  return { x: gx, z: gz };
}

export function isSpawnCell(gx: number, gz: number): boolean {
  return SPAWN_CELLS.some((c) => c.x === gx && c.z === gz);
}

export function isGoalCell(gx: number, gz: number): boolean {
  return GOAL_CELLS.some((c) => c.x === gx && c.z === gz);
}

export function isValidCell(gx: number, gz: number): boolean {
  return gx >= 0 && gx < GRID_W && gz >= 0 && gz < GRID_H;
}
