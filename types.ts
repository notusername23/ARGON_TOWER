/**
 * Game Types and State definitions
 */
import * as THREE from 'three';
import { TurretTypeId, EnemyTypeId, GridCell, EnemySpec } from './constants';

export type HazardType = 'slime' | 'electric';

export interface HazardEntity {
  id: string;
  type: HazardType;
  gx: number;
  gz: number;
  wx: number;
  wz: number;
  mesh: THREE.Group;
  phase: 'warning' | 'active';
  timer: number;
  maxTimer: number;
  tickTimer: number;
  warningRing?: THREE.Mesh;
  animTime: number;
}

export interface TowerEntity {
  id: string;
  gx: number;
  gz: number;
  wx: number;
  wz: number;
  type: TurretTypeId;
  level: number;
  totalInvested: number;
  cooldown: number;
  recoil: number;
  kills: number;
  damageDealt: number;
  mesh: THREE.Group;
  hazardEffect?: HazardType | null;
  hazardTimer?: number;
}

export interface EnemyEntity {
  id: string;
  type: EnemyTypeId;
  spec: EnemySpec;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  damage: number;
  mesh: THREE.Group;
  hpBar: HTMLDivElement;
  hpFill: HTMLDivElement;
  path: GridCell[];
  pathIndex: number;
  slowTimer: number;
  slowFactor: number;
}

export interface ProjectileEntity {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  elapsed: number;
  duration: number;
  arcHeight: number;
  damage: number;
  splashRadius: number;
  color: number;
}

export interface BeamEntity {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export interface ParticleEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ShockwaveEntity {
  mesh: THREE.Mesh;
  maxRadius: number;
  elapsed: number;
  duration: number;
}

export interface SpawnQueueItem {
  type: EnemyTypeId;
  hpMult: number;
  delay: number;
}

export interface ToastAlert {
  id: number;
  message: string;
  type?: 'error' | 'warning' | 'info';
}
