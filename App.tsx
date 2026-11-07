/**
 * Main Application Component for Nexus Grid 3D
 * Integrates Three.js 60fps Loop, Procedural Web Audio, A* Pathfinding, and Polished UI Animations
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';
import { AlertTriangle } from 'lucide-react';

import {
  GRID_W,
  GRID_H,
  TILE_SIZE,
  SPAWN_CELLS,
  GOAL_CELLS,
  TURRET_SPECS,
  ENEMY_TYPES,
  TurretTypeId,
  EnemyTypeId,
  gridToWorld,
  worldToGrid,
  isSpawnCell,
  isGoalCell,
  isValidCell,
} from './game/constants';
import { findAStarPath } from './game/pathfinding';
import { createTurretMesh, createEnemyMesh, createHazardMesh } from './game/meshBuilders';
import { soundEngine } from './game/SoundEngine';
import {
  TowerEntity,
  EnemyEntity,
  ProjectileEntity,
  BeamEntity,
  ParticleEntity,
  ShockwaveEntity,
  SpawnQueueItem,
  HazardEntity,
  HazardType,
} from './game/types';

import { TitleScreen } from './components/TitleScreen';
import { TopBar } from './components/TopBar';
import { BottomDock } from './components/BottomDock';
import { GameOverModal } from './components/GameOverModal';
import { AssetStudio } from './components/AssetStudio';

// Android Mobile Haptic Feedback Helper
const triggerHaptic = (pattern: number | number[] = 15) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
};

export default function App() {
  // App Phase & Modes
  const [inTitleScreen, setInTitleScreen] = useState(true);
  const [appMode, setAppMode] = useState<'game' | 'studio'>('game');
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeBossName, setActiveBossName] = useState<string | null>(null);
  const [activeHazardCount, setActiveHazardCount] = useState(0);

  // Game UI state synced from loop
  const [credits, setCredits] = useState(450);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [autoWave, setAutoWave] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [camModeName, setCamModeName] = useState('Tactical');
  const [pathLength, setPathLength] = useState(18);

  const [buildType, setBuildType] = useState<TurretTypeId | null>('pulse');
  const [selectedTower, setSelectedTower] = useState<TowerEntity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References to DOM and 3D objects
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const labelsMountRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Mutable Game Simulation State (Held in ref so 60fps loop runs without React re-renders)
  const simRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    raycastPlane: THREE.Mesh;
    hoverGroup: THREE.Group;
    cursorBox: THREE.Mesh;
    cursorMat: THREE.MeshBasicMaterial;
    rangeRing: THREE.Mesh;
    rangeRingMat: THREE.MeshBasicMaterial;
    selectionRing: THREE.Mesh;
    pathVisualGroup: THREE.Group;
    pathChevrons: Array<{ mesh: THREE.Mesh; index: number }>;
    nexusCrystal: THREE.Mesh;
    nexusShieldRing: THREE.Mesh;
    portalInnerRing: THREE.Mesh;
    ghostMesh: THREE.Group | null;
    arenaGroup: THREE.Group;
    spawnPortalGroup: THREE.Group;
    nexusGroup: THREE.Group;
    studioGroup: THREE.Group;
    hazardGroup: THREE.Group;
    showcaseHolder: THREE.Group;
    dummyGroup: THREE.Group;

    // Simulation Data
    credits: number;
    lives: number;
    maxLives: number;
    wave: number;
    score: number;
    gameSpeed: number;
    autoWave: boolean;
    isGameOver: boolean;
    inTitleScreen: boolean;
    appMode: 'game' | 'studio';
    studioSpin: boolean;
    studioWireframe: boolean;

    blockedGrid: boolean[][];
    towers: TowerEntity[];
    enemies: EnemyEntity[];
    hazards: HazardEntity[];
    hazardSpawnTimer: number;
    projectiles: ProjectileEntity[];
    beams: BeamEntity[];
    particles: ParticleEntity[];
    shockwaves: ShockwaveEntity[];
    spawnQueue: SpawnQueueItem[];
    spawnTimer: number;
    waveActive: boolean;

    // Mobile & Touch State
    isMobile: boolean;
    isPinching: boolean;
    touchStartDist: number;
    touchStartRadius: number;

    buildType: TurretTypeId | null;
    selectedTower: TowerEntity | null;
    hoverCell: { x: number; z: number } | null;
    hoverValid: boolean;

    camPresetIndex: number;
    camSpherical: {
      radius: number;
      theta: number;
      phi: number;
      target: THREE.Vector3;
    };
    isDraggingCam: boolean;
    prevPointer: { x: number; y: number };
    pointerDownPos: { x: number; y: number };
    screenShake: number;
    lastTime: number;
  }>({} as never);

  // Toast alert helper
  const showToast = useCallback((msg: string, autoDismiss = true) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    if (autoDismiss) {
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastMessage(null);
      }, 2400);
    }
  }, []);

  // Update hover range and ghost turret mesh
  const refreshGhostPreview = useCallback((type: TurretTypeId | null) => {
    const sim = simRef.current;
    if (!sim || !sim.scene) return;

    if (sim.ghostMesh) {
      sim.hoverGroup.remove(sim.ghostMesh);
      sim.ghostMesh = null;
    }

    if (type) {
      sim.ghostMesh = createTurretMesh(type, 1, true);
      sim.hoverGroup.add(sim.ghostMesh);
      sim.hoverGroup.visible = !!sim.hoverCell;
    } else {
      sim.hoverGroup.visible = false;
      sim.rangeRing.visible = false;
    }
  }, []);

  // Select build type from dock
  const handleSelectBuildType = useCallback((type: TurretTypeId | null) => {
    const sim = simRef.current;
    if (!sim) return;

    sim.buildType = type;
    setBuildType(type);

    sim.selectedTower = null;
    setSelectedTower(null);
    if (sim.selectionRing) sim.selectionRing.visible = false;

    refreshGhostPreview(type);
  }, [refreshGhostPreview]);

  // Recalculate A* Paths
  const recalculateGlobalPaths = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !sim.pathVisualGroup) return;

    while (sim.pathVisualGroup.children.length > 0) {
      sim.pathVisualGroup.remove(sim.pathVisualGroup.children[0]);
    }
    sim.pathChevrons = [];

    const path1 = findAStarPath(SPAWN_CELLS[0].x, SPAWN_CELLS[0].z, sim.blockedGrid);
    const path2 = findAStarPath(SPAWN_CELLS[1].x, SPAWN_CELLS[1].z, sim.blockedGrid);

    const primary = path1 || path2 || [];
    setPathLength(primary.length);

    const pathsToRender = [path1, path2].filter(Boolean) as Array<Array<{ x: number; z: number }>>;
    const visitedSegment = new Set<string>();

    pathsToRender.forEach((path, pIdx) => {
      const worldPoints = path.map((cell) => {
        const wp = gridToWorld(cell.x, cell.z);
        return new THREE.Vector3(wp.x, 0.09 + pIdx * 0.02, wp.z);
      });

      if (worldPoints.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(worldPoints, false, 'catmullrom', 0.25);
        const tubeGeo = new THREE.TubeGeometry(curve, worldPoints.length * 4, 0.07, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: pIdx === 0 ? 0x22d3ee : 0xa855f7,
          transparent: true,
          opacity: 0.55,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        sim.pathVisualGroup.add(tubeMesh);
      }

      for (let i = 0; i < path.length - 1; i++) {
        const c = path[i];
        const n = path[i + 1];
        const segKey = `${c.x},${c.z}->${n.x},${n.z}`;
        if (visitedSegment.has(segKey)) continue;
        visitedSegment.add(segKey);

        const wp1 = gridToWorld(c.x, c.z);
        const wp2 = gridToWorld(n.x, n.z);

        const coneGeo = new THREE.ConeGeometry(0.18, 0.36, 4);
        coneGeo.rotateX(Math.PI / 2);
        const coneMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.75,
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set((wp1.x + wp2.x) * 0.5, 0.12, (wp1.z + wp2.z) * 0.5);
        cone.lookAt(wp2.x, 0.12, wp2.z);
        sim.pathVisualGroup.add(cone);
        sim.pathChevrons.push({ mesh: cone, index: i });
      }
    });

    // Reroute active enemies smoothly
    for (const enemy of sim.enemies) {
      const currGrid = worldToGrid(enemy.mesh.position.x, enemy.mesh.position.z);
      const gx = Math.max(0, Math.min(GRID_W - 1, currGrid.x));
      const gz = Math.max(0, Math.min(GRID_H - 1, currGrid.z));
      const newPath = findAStarPath(gx, gz, sim.blockedGrid);
      if (newPath && newPath.length > 0) {
        enemy.path = newPath;
        enemy.pathIndex = newPath.length > 1 ? 1 : 0;
      }
    }
  }, []);

  // Check if placement is legal
  const canPlaceTowerAt = useCallback((gx: number, gz: number) => {
    const sim = simRef.current;
    if (!sim) return { ok: false, reason: 'NOT INITIALIZED' };

    if (!isValidCell(gx, gz)) return { ok: false, reason: 'OUT OF BOUNDS' };
    if (isSpawnCell(gx, gz)) return { ok: false, reason: 'CANNOT BUILD ON SPAWN PORTAL' };
    if (isGoalCell(gx, gz)) return { ok: false, reason: 'CANNOT BUILD ON NEXUS CORE' };
    if (sim.blockedGrid[gx][gz]) return { ok: false, reason: 'TILE OCCUPIED' };

    for (const enemy of sim.enemies) {
      const eg = worldToGrid(enemy.mesh.position.x, enemy.mesh.position.z);
      if (eg.x === gx && eg.z === gz) {
        return { ok: false, reason: 'HOSTILE UNIT ON TILE' };
      }
    }

    const candidate = { x: gx, z: gz };
    for (const sp of SPAWN_CELLS) {
      const testPath = findAStarPath(sp.x, sp.z, sim.blockedGrid, candidate);
      if (!testPath) {
        return { ok: false, reason: 'PATH BLOCKED! ENEMIES REQUIRE AN OPEN ROUTE' };
      }
    }

    for (const enemy of sim.enemies) {
      const eg = worldToGrid(enemy.mesh.position.x, enemy.mesh.position.z);
      const ex = Math.max(0, Math.min(GRID_W - 1, eg.x));
      const ez = Math.max(0, Math.min(GRID_H - 1, eg.z));
      const enemyPath = findAStarPath(ex, ez, sim.blockedGrid, candidate);
      if (!enemyPath) {
        return { ok: false, reason: 'WOULD TRAP ACTIVE HOSTILE UNIT!' };
      }
    }

    return { ok: true, reason: '' };
  }, []);

  // Floating 2D damage / credit text projection
  const spawnFloatingText = useCallback((worldPos: THREE.Vector3, text: string, colorHex = '#38bdf8') => {
    const sim = simRef.current;
    if (!sim || !sim.camera || !labelsMountRef.current) return;

    const v = worldPos.clone().project(sim.camera);
    if (v.z >= 1) return;

    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    const div = document.createElement('div');
    div.className = 'floating-text';
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.color = colorHex;
    div.textContent = text;
    labelsMountRef.current.appendChild(div);

    window.setTimeout(() => {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 900);
  }, []);

  // 3D Particles burst
  const spawnBurstParticles = useCallback((origin: THREE.Vector3, color: number, count = 16, speed = 3.2) => {
    const sim = simRef.current;
    if (!sim || !sim.scene) return;

    // Mobile performance guard: throttle maximum particle pool
    const maxParticles = sim.isMobile ? 80 : 300;
    if (sim.particles.length >= maxParticles) return;
    const actualCount = sim.isMobile ? Math.min(count, 10) : count;

    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (let i = 0; i < actualCount; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = (0.4 + Math.random() * 0.8) * speed;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.abs(Math.cos(phi)) * spd + 1.2,
        Math.sin(phi) * Math.sin(theta) * spd
      );

      sim.scene.add(mesh);
      sim.particles.push({
        mesh,
        vel,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.75,
      });
    }
  }, []);

  // 3D Shockwave
  const spawnShockwave = useCallback((origin: THREE.Vector3, color: number, maxRadius = 2.5) => {
    const sim = simRef.current;
    if (!sim || !sim.scene) return;

    const geo = new THREE.RingGeometry(0.15, 0.32, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    sim.scene.add(mesh);

    sim.shockwaves.push({
      mesh,
      maxRadius,
      elapsed: 0,
      duration: 0.38,
    });
  }, []);

  // Select placed tower for inspector
  const handleSelectTower = useCallback((tower: TowerEntity) => {
    const sim = simRef.current;
    if (!sim) return;

    sim.buildType = null;
    setBuildType(null);

    sim.selectedTower = tower;
    setSelectedTower({ ...tower });

    if (sim.ghostMesh) {
      sim.hoverGroup.remove(sim.ghostMesh);
      sim.ghostMesh = null;
    }
    sim.hoverGroup.visible = false;

    sim.selectionRing.position.set(tower.wx, 0.07, tower.wz);
    sim.selectionRing.visible = true;

    const spec = TURRET_SPECS[tower.type];
    const lvlStats = spec.levels[tower.level - 1];
    const rangeWorld = lvlStats.range * TILE_SIZE;

    sim.rangeRing.position.set(tower.wx, 0.08, tower.wz);
    sim.rangeRing.scale.set(rangeWorld, 1, rangeWorld);
    sim.rangeRingMat.color.setHex(spec.color);
    sim.rangeRing.visible = true;

    soundEngine.playClick();
  }, []);

  // Place Tower
  const handlePlaceTower = useCallback((gx: number, gz: number, type: TurretTypeId) => {
    const sim = simRef.current;
    if (!sim) return;

    const spec = TURRET_SPECS[type];
    if (sim.credits < spec.cost) {
      soundEngine.playError();
      showToast('INSUFFICIENT CREDITS TO CONSTRUCT TURRET!');
      return;
    }

    const check = canPlaceTowerAt(gx, gz);
    if (!check.ok) {
      soundEngine.playError();
      showToast(check.reason);
      return;
    }

    sim.credits -= spec.cost;
    setCredits(sim.credits);
    sim.blockedGrid[gx][gz] = true;

    const wp = gridToWorld(gx, gz);
    const mesh = createTurretMesh(type, 1, false);
    mesh.position.set(wp.x, 0, wp.z);
    sim.scene.add(mesh);

    const tower: TowerEntity = {
      id: `tower-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      gx,
      gz,
      wx: wp.x,
      wz: wp.z,
      type,
      level: 1,
      totalInvested: spec.cost,
      cooldown: 0,
      recoil: 0,
      kills: 0,
      damageDealt: 0,
      mesh,
    };

    sim.towers.push(tower);
    soundEngine.playBuild();
    spawnBurstParticles(new THREE.Vector3(wp.x, 0.6, wp.z), spec.color, 18, 2.8);
    spawnFloatingText(new THREE.Vector3(wp.x, 1.4, wp.z), `-${spec.cost} CR`, '#f59e0b');

    recalculateGlobalPaths();
  }, [canPlaceTowerAt, recalculateGlobalPaths, showToast, spawnBurstParticles, spawnFloatingText]);

  // Upgrade Selected Tower
  const handleUpgradeTower = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !sim.selectedTower || sim.selectedTower.level >= 3) return;

    const tower = sim.selectedTower;
    const spec = TURRET_SPECS[tower.type];
    const curStats = spec.levels[tower.level - 1];
    const cost = curStats.upgradeCost;

    if (sim.credits < cost) {
      soundEngine.playError();
      showToast('INSUFFICIENT CREDITS FOR UPGRADE!');
      return;
    }

    sim.credits -= cost;
    tower.totalInvested += cost;
    tower.level += 1;
    setCredits(sim.credits);

    // Replace 3D turret mesh with upgraded multi-part geometry
    const oldRotY = tower.mesh.userData.head ? tower.mesh.userData.head.rotation.y : 0;
    sim.scene.remove(tower.mesh);
    tower.mesh = createTurretMesh(tower.type, tower.level, false);
    tower.mesh.position.set(tower.wx, 0, tower.wz);
    if (tower.mesh.userData.head) tower.mesh.userData.head.rotation.y = oldRotY;
    sim.scene.add(tower.mesh);

    soundEngine.playUpgrade();
    spawnBurstParticles(new THREE.Vector3(tower.wx, 1.1, tower.wz), spec.color, 24, 3.8);
    spawnFloatingText(new THREE.Vector3(tower.wx, 1.8, tower.wz), `LEVEL ${tower.level}!`, spec.hex);

    const newRange = spec.levels[tower.level - 1].range * TILE_SIZE;
    sim.rangeRing.scale.set(newRange, 1, newRange);

    setSelectedTower({ ...tower });
  }, [showToast, spawnBurstParticles, spawnFloatingText]);

  // Sell Selected Tower
  const handleSellTower = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !sim.selectedTower) return;

    const tower = sim.selectedTower;
    const refund = Math.floor(tower.totalInvested * 0.75);

    sim.credits += refund;
    setCredits(sim.credits);
    sim.blockedGrid[tower.gx][tower.gz] = false;

    sim.scene.remove(tower.mesh);
    sim.towers = sim.towers.filter((t) => t.id !== tower.id);

    soundEngine.playSell();
    spawnBurstParticles(new THREE.Vector3(tower.wx, 0.6, tower.wz), 0xfacc15, 18, 2.8);
    spawnFloatingText(new THREE.Vector3(tower.wx, 1.2, tower.wz), `+${refund} CR`, '#facc15');

    sim.selectedTower = null;
    setSelectedTower(null);
    sim.selectionRing.visible = false;
    sim.rangeRing.visible = false;

    recalculateGlobalPaths();
  }, [recalculateGlobalPaths, spawnBurstParticles, spawnFloatingText]);

  // Deselect All / ESC
  const handleDeselectAll = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;

    sim.buildType = null;
    setBuildType(null);

    sim.selectedTower = null;
    setSelectedTower(null);

    if (sim.selectionRing) sim.selectionRing.visible = false;
    if (sim.rangeRing) sim.rangeRing.visible = false;
    if (sim.hoverGroup) sim.hoverGroup.visible = false;
  }, []);

  // Trigger Wave
  const handleSendWave = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.isGameOver) return;
    if (sim.waveActive && sim.spawnQueue.length > 0) return;

    sim.wave += 1;
    sim.waveActive = true;
    setWave(sim.wave);
    setWaveActive(true);

    soundEngine.playWaveStart();

    const w = sim.wave;
    const hpMult = 1 + (w - 1) * 0.28;
    const queue: SpawnQueueItem[] = [];

    const countScouts = 5 + Math.floor(w * 1.6);
    for (let i = 0; i < countScouts; i++) {
      queue.push({ type: 'scout', hpMult, delay: 0.75 });
    }

    if (w >= 2) {
      const countSprinters = 2 + Math.floor(w * 1.2);
      for (let i = 0; i < countSprinters; i++) {
        queue.push({ type: 'sprinter', hpMult, delay: 0.55 });
      }
    }

    if (w >= 3) {
      const countTanks = 1 + Math.floor(w * 0.8);
      for (let i = 0; i < countTanks; i++) {
        queue.push({ type: 'tank', hpMult, delay: 1.25 });
      }
    }

    // Dynamic Boss Spawns: Tier I Boss at Wave 4, Tier II Colossus at Wave 6 & 10, Supreme Final Boss at Wave 8 & 12
    if (w === 8 || w === 12 || (w > 12 && w % 4 === 0)) {
      // Supreme Final Boss
      queue.push({ type: 'final_boss', hpMult: hpMult * 1.3, delay: 2.5 });
      soundEngine.playBossAlert();
      setActiveBossName('Nexus Overlord Primus');
      showToast('⚠️ SUPREME THREAT: NEXUS OVERLORD PRIMUS HAS ENTERED THE FIELD!');
    } else if (w === 6 || w === 10) {
      // Apex Colossus Boss
      queue.push({ type: 'colossus', hpMult: hpMult * 1.2, delay: 2.2 });
      soundEngine.playBossAlert();
      setActiveBossName('Apex Colossus');
      showToast('⚠️ WARNING: APEX COLOSSUS QUAD-MECH DETECTED!');
    } else if (w === 4) {
      // Dreadnought Core Boss
      queue.push({ type: 'boss', hpMult: hpMult * 1.1, delay: 2.0 });
      soundEngine.playBossAlert();
      setActiveBossName('Dreadnought Core');
      showToast('⚠️ WARNING: DREADNOUGHT CORE BOSS DETECTED IN WAVE 4!');
    } else {
      setActiveBossName(null);
    }

    sim.spawnQueue = queue;
    sim.spawnTimer = 0.2;
  }, [showToast]);

  // Reset Game
  const handleResetGame = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;

    // Clean up Three.js entities
    sim.towers.forEach((t) => sim.scene.remove(t.mesh));
    sim.enemies.forEach((e) => {
      sim.scene.remove(e.mesh);
      if (e.hpBar.parentNode) e.hpBar.parentNode.removeChild(e.hpBar);
    });
    sim.projectiles.forEach((p) => sim.scene.remove(p.mesh));
    sim.beams.forEach((b) => sim.scene.remove(b.mesh));
    sim.particles.forEach((pt) => sim.scene.remove(pt.mesh));
    sim.shockwaves.forEach((sw) => sim.scene.remove(sw.mesh));
    sim.hazards.forEach((h) => sim.hazardGroup.remove(h.mesh));

    sim.towers = [];
    sim.enemies = [];
    sim.hazards = [];
    sim.hazardSpawnTimer = 10.0;
    sim.projectiles = [];
    sim.beams = [];
    sim.particles = [];
    sim.shockwaves = [];
    sim.spawnQueue = [];
    sim.blockedGrid = Array.from({ length: GRID_W }, () => Array(GRID_H).fill(false));

    sim.credits = 450;
    sim.lives = 20;
    sim.wave = 0;
    sim.score = 0;
    sim.waveActive = false;
    sim.isGameOver = false;

    setCredits(450);
    setLives(20);
    setWave(0);
    setScore(0);
    setWaveActive(false);
    setIsGameOver(false);
    setActiveHazardCount(0);

    handleDeselectAll();
    recalculateGlobalPaths();
    handleSelectBuildType('pulse');
  }, [handleDeselectAll, handleSelectBuildType, recalculateGlobalPaths]);

  // Camera presets
  const handleCycleCamera = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;

    const presets = [
      { name: 'Tactical', radius: 29, theta: 0.0, phi: 0.72 },
      { name: 'Top-Down', radius: 32, theta: 0.0, phi: 0.22 },
      { name: 'Isometric', radius: 30, theta: -0.52, phi: 0.82 },
    ];

    sim.camPresetIndex = (sim.camPresetIndex + 1) % presets.length;
    const p = presets[sim.camPresetIndex];
    sim.camSpherical.radius = p.radius;
    sim.camSpherical.theta = p.theta;
    sim.camSpherical.phi = p.phi;
    setCamModeName(p.name);
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  }, []);

  // Toggle Speed
  const handleToggleSpeed = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const next = sim.gameSpeed === 1 ? 2 : 1;
    sim.gameSpeed = next;
    setGameSpeed(next);
  }, []);

  // Toggle Auto Wave
  const handleToggleAutoWave = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.autoWave = !sim.autoWave;
    setAutoWave(sim.autoWave);
  }, []);

  // Studio Mode Telemetry State
  const [studioMeshStats, setStudioMeshStats] = useState({ meshes: 14, verts: 1540, tris: 920 });
  const currentStudioModelRef = useRef<THREE.Group | null>(null);

  // Reset Camera Angle in Studio
  const handleResetCameraAngle = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.camSpherical.radius = 5.8;
    sim.camSpherical.theta = 0.52;
    sim.camSpherical.phi = 1.05;
    sim.camSpherical.target = new THREE.Vector3(0, 0.85, 0);
  }, []);

  // Switch between 18x10 Game Mode and 3D Asset Studio
  const handleSwitchMode = useCallback((mode: 'game' | 'studio') => {
    const sim = simRef.current;
    if (!sim) return;

    setAppMode(mode);
    sim.appMode = mode;

    const isStudio = mode === 'studio';
    sim.studioGroup.visible = isStudio;
    sim.arenaGroup.visible = !isStudio;
    sim.spawnPortalGroup.visible = !isStudio;
    sim.nexusGroup.visible = !isStudio;
    sim.pathVisualGroup.visible = !isStudio;
    sim.hazardGroup.visible = !isStudio;
    sim.towers.forEach((t) => (t.mesh.visible = !isStudio));
    sim.enemies.forEach((e) => (e.mesh.visible = !isStudio));

    if (isStudio) {
      sim.hoverGroup.visible = false;
      sim.rangeRing.visible = false;
      sim.selectionRing.visible = false;
      // Optimize DOM by hiding all active enemy health bar elements
      sim.enemies.forEach((e) => {
        if (e.hpBar) e.hpBar.style.display = 'none';
      });
      sim.camSpherical = {
        radius: 5.8,
        theta: 0.52,
        phi: 1.05,
        target: new THREE.Vector3(0, 0.85, 0),
      };
    } else {
      sim.camSpherical = {
        radius: 29,
        theta: 0.0,
        phi: 0.72,
        target: new THREE.Vector3(0, 0, 0.5),
      };
      handleSelectBuildType('pulse');
    }
  }, [handleSelectBuildType]);

  // Select 3D Asset in Studio
  const handleSelectStudioAsset = useCallback((item: { id: string; category: string; turretType?: TurretTypeId; enemyType?: EnemyTypeId }, level: number) => {
    const sim = simRef.current;
    if (!sim || !sim.showcaseHolder) return;

    // Dispose existing 3D geometries and materials to avoid WebGL memory leaks
    if (currentStudioModelRef.current) {
      currentStudioModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry?.dispose();
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
    }

    while (sim.showcaseHolder.children.length > 0) {
      sim.showcaseHolder.remove(sim.showcaseHolder.children[0]);
    }

    let model: THREE.Group;
    if (item.category === 'turret' && item.turretType) {
      model = createTurretMesh(item.turretType, level, false);
      sim.dummyGroup.visible = true;
    } else if (item.category === 'enemy' && item.enemyType) {
      model = createEnemyMesh(item.enemyType);
      sim.dummyGroup.visible = false;
    } else if (item.id === 'nexus') {
      model = new THREE.Group();
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.85, 0),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.1 })
      );
      crystal.position.y = 1.35;
      model.add(crystal);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      ring.position.y = 1.35;
      model.add(ring);
      model.userData.animCrystal = crystal;
      model.userData.animRing = ring;
      sim.dummyGroup.visible = false;
    } else {
      model = new THREE.Group();
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.15, 12, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.2 })
      );
      arch.position.y = 0.1;
      model.add(arch);
      const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0xe879f9 }));
      vortex.position.y = 0.8;
      model.add(vortex);
      model.userData.animVortex = vortex;
      sim.dummyGroup.visible = false;
    }

    currentStudioModelRef.current = model;
    sim.showcaseHolder.add(model);

    // Calculate technical stats
    let meshes = 0;
    let verts = 0;
    let tris = 0;
    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && (obj as THREE.Mesh).geometry) {
        meshes++;
        const g = (obj as THREE.Mesh).geometry;
        if (g.attributes.position) verts += g.attributes.position.count;
        if (g.index) tris += g.index.count / 3;
        else if (g.attributes.position) tris += g.attributes.position.count / 3;
      }
    });
    setStudioMeshStats({ meshes, verts, tris: Math.round(tris) });
  }, []);

  // Studio Weapon Fire Sandbox
  const handleStudioFireWeapon = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;

    const dummyPos = new THREE.Vector3(0, 0.85, 3.6);
    const muzzlePos = new THREE.Vector3(0, 1.1, 0.5);

    // Spawn kinetic laser beam
    const dist = muzzlePos.distanceTo(dummyPos);
    const geo = new THREE.CylinderGeometry(0.09, 0.09, dist, 8).translate(0, dist / 2, 0).rotateX(Math.PI / 2);
    const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95 }));
    beam.position.copy(muzzlePos);
    beam.lookAt(dummyPos);
    sim.scene.add(beam);
    sim.beams.push({ mesh: beam, life: 0.14, maxLife: 0.14 });

    soundEngine.playPulseFire();
    spawnBurstParticles(dummyPos, 0x38bdf8, 16, 2.5);
    spawnBurstParticles(dummyPos, 0xf97316, 12, 2.0);
    spawnShockwave(new THREE.Vector3(0, 0.05, 3.6), 0x22d3ee, 1.8);
  }, [spawnBurstParticles, spawnShockwave]);

  // Export .OBJ
  const handleExportOBJ = useCallback(() => {
    const model = currentStudioModelRef.current;
    if (!model) return;
    model.updateMatrixWorld(true);

    let objText = `# NEXUS GRID 3D - Procedural Asset Export\n`;
    let vertexOffset = 1;
    const vPos = new THREE.Vector3();

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
        const geo = (child as THREE.Mesh).geometry.clone();
        geo.applyMatrix4((child as THREE.Mesh).matrixWorld);
        const posAttr = geo.attributes.position;
        if (!posAttr) return;

        objText += `o ${child.name || 'mesh_part_' + vertexOffset}\n`;
        for (let i = 0; i < posAttr.count; i++) {
          vPos.fromBufferAttribute(posAttr, i);
          objText += `v ${vPos.x.toFixed(5)} ${vPos.y.toFixed(5)} ${vPos.z.toFixed(5)}\n`;
        }

        const indexAttr = geo.index;
        if (indexAttr) {
          for (let i = 0; i < indexAttr.count; i += 3) {
            const a = indexAttr.getX(i) + vertexOffset;
            const b = indexAttr.getX(i + 1) + vertexOffset;
            const c = indexAttr.getX(i + 2) + vertexOffset;
            objText += `f ${a} ${b} ${c}\n`;
          }
        } else {
          for (let i = 0; i < posAttr.count; i += 3) {
            const a = i + vertexOffset;
            const b = i + 1 + vertexOffset;
            const c = i + 2 + vertexOffset;
            objText += `f ${a} ${b} ${c}\n`;
          }
        }
        vertexOffset += posAttr.count;
      }
    });

    const blob = new Blob([objText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_3d_asset.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Export Three.js JSON
  const handleExportJSON = useCallback(() => {
    const model = currentStudioModelRef.current;
    if (!model) return;
    const jsonStr = JSON.stringify(model.toJSON(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_3d_asset.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Start game from Title Screen
  const handleStartGame = useCallback(() => {
    setInTitleScreen(false);
    if (simRef.current) {
      simRef.current.inTitleScreen = false;
    }
  }, []);

  /**
   * Main Initialization & Render Loop
   */
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.014);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      160
    );

    // Detect Mobile Devices (Android / iOS / Touch)
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024);

    // 3. Renderer with PBR color management & Mobile performance guard
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      precision: isMobile ? 'mediump' : 'highp',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting Rig
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf8fafc, 1.25);
    dirLight.position.set(16, 28, 18);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = isMobile ? 1024 : 2048;
    dirLight.shadow.mapSize.height = isMobile ? 1024 : 2048;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 70;
    const d = 24;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 5. Arena Ground & Grid
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // 5b. Environmental Hazards Group
    const hazardGroup = new THREE.Group();
    scene.add(hazardGroup);

    const boardW = GRID_W * TILE_SIZE;
    const boardH = GRID_H * TILE_SIZE;
    const platformGeo = new THREE.BoxGeometry(boardW + 1.2, 0.8, boardH + 1.2);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x090d1a,
      metalness: 0.7,
      roughness: 0.4,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.45;
    platform.receiveShadow = !isSoftwareGl;
    arenaGroup.add(platform);

    // Raycast Plane for mouse input
    const planeGeo = new THREE.PlaneGeometry(boardW, boardH);
    planeGeo.rotateX(-Math.PI / 2);
    const raycastPlane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(raycastPlane);

    // 18x10 Grid Tiles
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.14, TILE_SIZE * 0.94);
    for (let x = 0; x < GRID_W; x++) {
      for (let z = 0; z < GRID_H; z++) {
        const pos = gridToWorld(x, z);
        const isSpawn = isSpawnCell(x, z);
        const isGoal = isGoalCell(x, z);

        let tileColor = (x + z) % 2 === 0 ? 0x111a2e : 0x0e1526;
        let emissiveCol = 0x000000;
        let emissiveInt = 0;

        if (isSpawn) {
          tileColor = 0x3b0764;
          emissiveCol = 0xa855f7;
          emissiveInt = 0.45;
        } else if (isGoal) {
          tileColor = 0x083344;
          emissiveCol = 0x22d3ee;
          emissiveInt = 0.45;
        }

        const mat = new THREE.MeshStandardMaterial({
          color: tileColor,
          emissive: emissiveCol,
          emissiveIntensity: emissiveInt,
          metalness: 0.5,
          roughness: 0.5,
        });

        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(pos.x, -0.07, pos.z);
        tile.receiveShadow = !isSoftwareGl;
        arenaGroup.add(tile);
      }
    }

    // Spawn Portal Structure
    const spawnCenter = { x: (0 - GRID_W / 2 + 0.5) * TILE_SIZE, z: 0 };
    const spawnPortalGroup = new THREE.Group();
    spawnPortalGroup.position.set(spawnCenter.x, 0, spawnCenter.z);
    scene.add(spawnPortalGroup);

    const portalArchGeo = new THREE.TorusGeometry(1.75, 0.16, 12, 32, Math.PI);
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.85,
      metalness: 0.3,
      roughness: 0.2,
    });
    const portalArch = new THREE.Mesh(portalArchGeo, portalMat);
    portalArch.rotation.y = Math.PI / 2;
    spawnPortalGroup.add(portalArch);

    const portalInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xe879f9 })
    );
    portalInnerRing.rotation.y = Math.PI / 2;
    portalInnerRing.position.y = 0.9;
    spawnPortalGroup.add(portalInnerRing);

    // Nexus Core Structure
    const goalCenter = { x: (17 - GRID_W / 2 + 0.5) * TILE_SIZE, z: 0 };
    const nexusGroup = new THREE.Group();
    nexusGroup.position.set(goalCenter.x, 0, goalCenter.z);
    scene.add(nexusGroup);

    const nexusPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.6, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
    );
    nexusPedestal.position.y = 0.18;
    nexusGroup.add(nexusPedestal);

    const nexusCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.75,
        metalness: 0.2,
        roughness: 0.1,
      })
    );
    nexusCrystal.position.y = 1.6;
    nexusGroup.add(nexusCrystal);

    const nexusShieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    nexusShieldRing.position.y = 1.6;
    nexusGroup.add(nexusShieldRing);

    // Hover Cursor & Range Rings
    const hoverGroup = new THREE.Group();
    scene.add(hoverGroup);

    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.45,
    });
    const cursorBox = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.12, TILE_SIZE * 0.96), cursorMat);
    hoverGroup.add(cursorBox);

    const rangeRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 64).rotateX(-Math.PI / 2), rangeRingMat);
    rangeRing.position.y = 0.08;
    rangeRing.visible = false;
    scene.add(rangeRing);

    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 0.98, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    selectionRing.position.y = 0.06;
    selectionRing.visible = false;
    scene.add(selectionRing);

    const pathVisualGroup = new THREE.Group();
    scene.add(pathVisualGroup);

    // 6. 3D Asset Studio Inspection Turntable Stage
    const studioGroup = new THREE.Group();
    studioGroup.visible = false;
    scene.add(studioGroup);

    // Turntable inspection base
    const turntableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.7, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 })
    );
    turntableBase.position.y = -0.14;
    turntableBase.receiveShadow = !isSoftwareGl;
    studioGroup.add(turntableBase);

    const turntableRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.04, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    turntableRing1.rotation.x = Math.PI / 2;
    turntableRing1.position.y = 0.02;
    studioGroup.add(turntableRing1);

    const turntableRing2 = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.58, 6),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
    );
    turntableRing2.rotation.x = -Math.PI / 2;
    turntableRing2.position.y = 0.02;
    studioGroup.add(turntableRing2);

    const polarGrid = new THREE.PolarGridHelper(2.2, 12, 6, 64, 0x1e293b, 0x0ea5e9);
    polarGrid.position.y = 0.01;
    studioGroup.add(polarGrid);

    // Showcase Model Holder
    const showcaseHolder = new THREE.Group();
    studioGroup.add(showcaseHolder);

    // Dummy Target Drone for live weapon tests
    const dummyGroup = new THREE.Group();
    dummyGroup.position.set(0, 0, 3.6);
    studioGroup.add(dummyGroup);

    const dummyBase = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
    );
    dummyBase.rotation.x = -Math.PI / 2;
    dummyBase.position.y = 0.02;
    dummyGroup.add(dummyBase);

    const dummyTargetMesh = createEnemyMesh('scout');
    dummyTargetMesh.rotation.y = Math.PI;
    dummyGroup.add(dummyTargetMesh);

    // Initialize Simulation Reference
    simRef.current = {
      scene,
      camera,
      renderer,
      raycaster: new THREE.Raycaster(),
      mouseNDC: new THREE.Vector2(),
      raycastPlane,
      hoverGroup,
      cursorBox,
      cursorMat,
      rangeRing,
      rangeRingMat,
      selectionRing,
      pathVisualGroup,
      pathChevrons: [],
      nexusCrystal,
      nexusShieldRing,
      portalInnerRing,
      ghostMesh: null,
      arenaGroup,
      spawnPortalGroup,
      nexusGroup,
      studioGroup,
      hazardGroup,
      showcaseHolder,
      dummyGroup,

      credits: 450,
      lives: 20,
      maxLives: 20,
      wave: 0,
      score: 0,
      gameSpeed: 1,
      autoWave: false,
      isGameOver: false,
      inTitleScreen: true,
      appMode: 'game',
      studioSpin: true,
      studioWireframe: false,

      blockedGrid: Array.from({ length: GRID_W }, () => Array(GRID_H).fill(false)),
      towers: [],
      enemies: [],
      hazards: [],
      hazardSpawnTimer: 8.0,
      projectiles: [],
      beams: [],
      particles: [],
      shockwaves: [],
      spawnQueue: [],
      spawnTimer: 0,
      waveActive: false,

      isMobile,
      isPinching: false,
      touchStartDist: 0,
      touchStartRadius: 29,

      buildType: 'pulse',
      selectedTower: null,
      hoverCell: null,
      hoverValid: false,

      camPresetIndex: 0,
      camSpherical: {
        radius: 29,
        theta: 0.0,
        phi: 0.72,
        target: new THREE.Vector3(0, 0, 0.5),
      },
      isDraggingCam: false,
      prevPointer: { x: 0, y: 0 },
      pointerDownPos: { x: 0, y: 0 },
      screenShake: 0,
      lastTime: performance.now(),
    };

    // Calculate initial path and preview ghost
    recalculateGlobalPaths();
    refreshGhostPreview('pulse');

    // Camera transform updater
    const updateCamera = () => {
      const sim = simRef.current;
      const { radius, theta, phi, target } = sim.camSpherical;
      const shakeX = (Math.random() - 0.5) * sim.screenShake;
      const shakeY = (Math.random() - 0.5) * sim.screenShake;
      sim.camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta) + shakeX;
      sim.camera.position.y = target.y + radius * Math.cos(phi) + shakeY;
      sim.camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      sim.camera.lookAt(target);
    };
    updateCamera();

    // Hover Tile Raycaster
    const updateHoverTile = (clientX: number, clientY: number) => {
      const sim = simRef.current;
      sim.mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
      sim.mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
      sim.raycaster.setFromCamera(sim.mouseNDC, sim.camera);

      const hits = sim.raycaster.intersectObject(sim.raycastPlane);
      if (hits.length === 0) {
        sim.hoverCell = null;
        sim.hoverGroup.visible = false;
        if (!sim.selectedTower) sim.rangeRing.visible = false;
        return;
      }

      const pt = hits[0].point;
      const cell = worldToGrid(pt.x, pt.z);

      if (!isValidCell(cell.x, cell.z)) {
        sim.hoverCell = null;
        sim.hoverGroup.visible = false;
        if (!sim.selectedTower) sim.rangeRing.visible = false;
        return;
      }

      sim.hoverCell = cell;
      const wp = gridToWorld(cell.x, cell.z);

      if (sim.buildType && !sim.selectedTower) {
        sim.hoverGroup.position.set(wp.x, 0.06, wp.z);
        sim.hoverGroup.visible = true;

        const check = canPlaceTowerAt(cell.x, cell.z);
        const spec = TURRET_SPECS[sim.buildType];
        const canAfford = sim.credits >= spec.cost;

        sim.hoverValid = check.ok && canAfford;
        const statusColor = sim.hoverValid ? 0x22c55e : 0xf43f5e;
        sim.cursorMat.color.setHex(statusColor);

        if (sim.ghostMesh && sim.ghostMesh.userData.matAccent) {
          sim.ghostMesh.userData.matAccent.color.setHex(sim.hoverValid ? spec.color : 0xf43f5e);
          sim.ghostMesh.userData.matAccent.emissive.setHex(sim.hoverValid ? spec.color : 0xf43f5e);
        }

        const rWorld = spec.levels[0].range * TILE_SIZE;
        sim.rangeRing.position.set(wp.x, 0.08, wp.z);
        sim.rangeRing.scale.set(rWorld, 1, rWorld);
        sim.rangeRingMat.color.setHex(sim.hoverValid ? spec.color : 0xf43f5e);
        sim.rangeRing.visible = true;
      }
    };

    // DOM Interaction Handlers
    const dom = renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    const onPointerDown = (e: PointerEvent) => {
      const sim = simRef.current;
      sim.pointerDownPos = { x: e.clientX, y: e.clientY };

      if (sim.appMode === 'studio') {
        // In studio mode, left-click or right-click drag orbits the 3D model
        if (e.button === 0 || e.button === 2) {
          sim.isDraggingCam = true;
          sim.prevPointer = { x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        sim.isDraggingCam = true;
        sim.prevPointer = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const sim = simRef.current;
      if (sim.isDraggingCam) {
        const dx = e.clientX - sim.prevPointer.x;
        const dy = e.clientY - sim.prevPointer.y;
        sim.prevPointer = { x: e.clientX, y: e.clientY };

        const speed = sim.appMode === 'studio' ? 0.008 : 0.0065;
        sim.camSpherical.theta -= dx * speed;
        const minPhi = sim.appMode === 'studio' ? 0.15 : 0.2;
        const maxPhi = sim.appMode === 'studio' ? 1.42 : 1.28;
        sim.camSpherical.phi = Math.max(minPhi, Math.min(maxPhi, sim.camSpherical.phi - dy * speed));
        updateCamera();
        return;
      }

      if (!sim.inTitleScreen && sim.appMode !== 'studio') {
        updateHoverTile(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const sim = simRef.current;
      if (sim.isDraggingCam) {
        sim.isDraggingCam = false;
        return;
      }
      if (sim.inTitleScreen || sim.appMode === 'studio') return;

      const moveDist = Math.hypot(e.clientX - sim.pointerDownPos.x, e.clientY - sim.pointerDownPos.y);
      if (moveDist < 8 && e.button === 0 && e.target === dom) {
        updateHoverTile(e.clientX, e.clientY);
        if (!sim.hoverCell) return;

        const { x: gx, z: gz } = sim.hoverCell;
        const existing = sim.towers.find((t) => t.gx === gx && t.gz === gz);
        if (existing) {
          handleSelectTower(existing);
          return;
        }

        if (sim.buildType) {
          handlePlaceTower(gx, gz, sim.buildType);
        } else {
          handleDeselectAll();
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sim = simRef.current;
      if (sim.appMode === 'studio') {
        // Macro zoom in 3D studio
        sim.camSpherical.radius = Math.max(2.6, Math.min(13.5, sim.camSpherical.radius + e.deltaY * 0.008));
      } else {
        sim.camSpherical.radius = Math.max(14, Math.min(46, sim.camSpherical.radius + e.deltaY * 0.02));
      }
      updateCamera();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (sim.inTitleScreen) {
        if (e.key === ' ' || e.key === 'Enter') {
          handleStartGame();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (sim.appMode === 'studio') {
          handleSwitchMode('game');
        } else {
          handleDeselectAll();
        }
        return;
      }

      if (e.key === '1') handleSelectBuildType('pulse');
      else if (e.key === '2') handleSelectBuildType('cryo');
      else if (e.key === '3') handleSelectBuildType('mortar');
      else if (e.key === '4') handleSelectBuildType('tesla');
      else if (e.key === 'h' || e.key === 'H') setIsCollapsed((prev) => !prev);
      else if (e.key === 'm' || e.key === 'M') handleToggleMute();
      else if (e.key === ' ') {
        e.preventDefault();
        handleSendWave();
      }
    };

    // Android Mobile Touch Handlers (Pinch-to-zoom + Touch drag + Tap to place)
    const onTouchStart = (e: TouchEvent) => {
      const sim = simRef.current;
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        sim.pointerDownPos = { x: touch.clientX, y: touch.clientY };
        sim.prevPointer = { x: touch.clientX, y: touch.clientY };
        sim.isDraggingCam = true;
        sim.isPinching = false;
      } else if (e.touches.length === 2) {
        sim.isDraggingCam = false;
        sim.isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        sim.touchStartDist = Math.hypot(dx, dy);
        sim.touchStartRadius = sim.camSpherical.radius;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const sim = simRef.current;
      if (sim.isPinching && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (dist > 10 && sim.touchStartDist > 10) {
          const scale = dist / sim.touchStartDist;
          const minR = sim.appMode === 'studio' ? 2.6 : 14;
          const maxR = sim.appMode === 'studio' ? 13.5 : 46;
          sim.camSpherical.radius = Math.max(minR, Math.min(maxR, sim.touchStartRadius / scale));
          updateCamera();
        }
        return;
      }

      if (e.touches.length === 1 && !sim.isPinching && sim.isDraggingCam) {
        const touch = e.touches[0];
        const dx = touch.clientX - sim.prevPointer.x;
        const dy = touch.clientY - sim.prevPointer.y;
        sim.prevPointer = { x: touch.clientX, y: touch.clientY };

        const speed = sim.appMode === 'studio' ? 0.009 : 0.007;
        sim.camSpherical.theta -= dx * speed;
        const minPhi = sim.appMode === 'studio' ? 0.15 : 0.2;
        const maxPhi = sim.appMode === 'studio' ? 1.42 : 1.28;
        sim.camSpherical.phi = Math.max(minPhi, Math.min(maxPhi, sim.camSpherical.phi - dy * speed));
        updateCamera();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const sim = simRef.current;
      if (sim.isPinching) {
        if (e.touches.length < 2) sim.isPinching = false;
        return;
      }

      if (sim.isDraggingCam) {
        sim.isDraggingCam = false;
      }

      if (sim.inTitleScreen || sim.appMode === 'studio') return;

      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const moveDist = Math.hypot(touch.clientX - sim.pointerDownPos.x, touch.clientY - sim.pointerDownPos.y);
        if (moveDist < 14) {
          updateHoverTile(touch.clientX, touch.clientY);
          if (!sim.hoverCell) return;

          const { x: gx, z: gz } = sim.hoverCell;
          const existing = sim.towers.find((t) => t.gx === gx && t.gz === gz);
          if (existing) {
            handleSelectTower(existing);
            triggerHaptic(15);
            return;
          }

          if (sim.buildType) {
            handlePlaceTower(gx, gz, sim.buildType);
            triggerHaptic(20);
          } else {
            handleDeselectAll();
          }
        }
      }
    };

    const onTouchCancel = () => {
      const sim = simRef.current;
      if (sim) {
        sim.isDraggingCam = false;
        sim.isPinching = false;
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    dom.addEventListener('touchstart', onTouchStart, { passive: false });
    dom.addEventListener('touchmove', onTouchMove, { passive: false });
    dom.addEventListener('touchend', onTouchEnd, { passive: true });
    dom.addEventListener('touchcancel', onTouchCancel, { passive: true });

    // ==========================================
    // 60FPS Game Simulation Tick
    // ==========================================
    let animFrameId = 0;
    let isMounted = true;

    const tick = (now: number) => {
      if (!isMounted) return;

      const sim = simRef.current;
      const rawDt = (now - sim.lastTime) / 1000;
      sim.lastTime = now;
      const dt = Math.min(rawDt, 0.05) * sim.gameSpeed;
      const time = now * 0.001;

      // Camera shake decay
      if (sim.screenShake > 0) {
        sim.screenShake = Math.max(0, sim.screenShake - dt * 4.0);
        updateCamera();
      }

      // Title Screen slow cinematic orbit
      if (sim.inTitleScreen) {
        sim.camSpherical.theta += dt * 0.15;
        updateCamera();
      }

      // Animate Center Nexus & Portals
      sim.nexusCrystal.rotation.y = time * 1.5;
      sim.nexusCrystal.position.y = 1.55 + Math.sin(time * 3) * 0.12;
      sim.nexusShieldRing.rotation.x = Math.sin(time * 1.5) * 0.5;
      sim.nexusShieldRing.rotation.y = time * 2.2;
      sim.portalInnerRing.scale.setScalar(0.92 + Math.sin(time * 5) * 0.08);

      // ==========================================
      // Dedicated Studio Mode Loop Execution
      // (Completely bypasses wave spawning, enemy movement, turret AI, and DOM health bar projections)
      // ==========================================
      if (sim.appMode === 'studio') {
        if (sim.studioSpin && sim.showcaseHolder) {
          sim.showcaseHolder.rotation.y += dt * 0.75;
        }
        if (currentStudioModelRef.current) {
          const m = currentStudioModelRef.current;
          if (m.userData.rings) {
            m.userData.rings[0].rotation.z += dt * 2.2;
            if (m.userData.rings[1]) m.userData.rings[1].rotation.x += dt * 2.6;
            if (m.userData.rings[2]) m.userData.rings[2].rotation.y += dt * 1.5;
          }
          if (m.userData.animCrystal) {
            m.userData.animCrystal.rotation.y += dt * 1.6;
            m.userData.animRing.rotation.x += dt * 1.4;
          }
          if (m.userData.animVortex) {
            m.userData.animVortex.scale.setScalar(0.9 + Math.sin(time * 6) * 0.1);
          }
        }

        // Update studio beams from sandbox weapon fire
        for (let i = sim.beams.length - 1; i >= 0; i--) {
          const b = sim.beams[i];
          b.life -= dt;
          (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, b.life / b.maxLife);
          if (b.life <= 0) {
            sim.scene.remove(b.mesh);
            sim.beams.splice(i, 1);
          }
        }

        // Update studio particles from test blasts
        for (let i = sim.particles.length - 1; i >= 0; i--) {
          const pt = sim.particles[i];
          pt.life -= dt;
          pt.vel.y -= 9.8 * dt;
          pt.mesh.position.addScaledVector(pt.vel, dt);
          pt.mesh.rotation.x += dt * 6;
          pt.mesh.rotation.y += dt * 6;
          if (pt.mesh.position.y < 0.08) {
            pt.mesh.position.y = 0.08;
            pt.vel.y *= -0.45;
            pt.vel.x *= 0.7;
            pt.vel.z *= 0.7;
          }
          const scale = Math.max(0.01, pt.life / pt.maxLife);
          pt.mesh.scale.setScalar(scale);
          if (pt.life <= 0) {
            sim.scene.remove(pt.mesh);
            sim.particles.splice(i, 1);
          }
        }

        // Update studio shockwaves
        for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
          const sw = sim.shockwaves[i];
          sw.elapsed += dt;
          const t = sw.elapsed / sw.duration;
          const r = 0.2 + t * sw.maxRadius;
          sw.mesh.scale.set(r, 1, r);
          (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
          if (t >= 1) {
            sim.scene.remove(sw.mesh);
            sim.shockwaves.splice(i, 1);
          }
        }

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          window.setTimeout(() => {
            if (isMounted) animFrameId = requestAnimationFrame(tick);
          }, 80);
        } else {
          animFrameId = requestAnimationFrame(tick);
        }
        return; // Early return to completely bypass all game simulation!
      }

      // Pulse A* path chevrons
      for (const item of sim.pathChevrons) {
        const waveVal = 0.35 + 0.65 * Math.pow(Math.sin(time * 4 - item.index * 0.5) * 0.5 + 0.5, 2);
        (item.mesh.material as THREE.MeshBasicMaterial).opacity = waveVal;
      }

      // ==========================================
      // Environmental Hazard Spawner & Simulation Loop
      // ==========================================
      if (!sim.isGameOver && sim.waveActive && sim.appMode === 'game') {
        sim.hazardSpawnTimer -= dt;
        if (sim.hazardSpawnTimer <= 0) {
          sim.hazardSpawnTimer = 9.0 + Math.random() * 6.0;

          // Cap simultaneous hazards to avoid overwhelming
          if (sim.hazards.length < 3) {
            const candidates: { x: number; z: number }[] = [];
            for (let cx = 2; cx < GRID_W - 2; cx++) {
              for (let cz = 1; cz < GRID_H - 1; cz++) {
                if (isGoalCell(cx, cz) || isSpawnCell(cx, cz)) continue;
                if (sim.hazards.some((h) => h.gx === cx && h.gz === cz)) continue;
                candidates.push({ x: cx, z: cz });
              }
            }

            if (candidates.length > 0) {
              const chosen = candidates[Math.floor(Math.random() * candidates.length)];
              const hType: HazardType = Math.random() < 0.5 ? 'slime' : 'electric';
              const wp = gridToWorld(chosen.x, chosen.z);
              const hMesh = createHazardMesh(hType, 'warning');
              hMesh.position.set(wp.x, 0, wp.z);
              sim.hazardGroup.add(hMesh);

              soundEngine.playHazardWarning();
              showToast(
                hType === 'slime'
                  ? '⚠️ ANOMALY: Viscous Slime Eruption Imminent!'
                  : '⚠️ ANOMALY: High-Voltage Electrification Surge!'
              );
              triggerHaptic([40, 60, 40]);

              sim.hazards.push({
                id: `hazard-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: hType,
                gx: chosen.x,
                gz: chosen.z,
                wx: wp.x,
                wz: wp.z,
                mesh: hMesh,
                phase: 'warning',
                timer: 2.8,
                maxTimer: 11.0,
                tickTimer: 0,
                animTime: 0,
              });
              setActiveHazardCount(sim.hazards.length);
            }
          }
        }
      }

      // Update Hazards (Phase transitions, particle fx, debuffs on enemies and player towers)
      for (let hIdx = sim.hazards.length - 1; hIdx >= 0; hIdx--) {
        const haz = sim.hazards[hIdx];
        haz.animTime += dt;

        if (haz.phase === 'warning') {
          haz.timer -= dt;
          const warnRing = haz.mesh.userData.warnRing as THREE.Mesh | undefined;
          if (warnRing) {
            const pulse = 0.5 + 0.5 * Math.sin(haz.animTime * 14);
            (warnRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * pulse;
            warnRing.scale.setScalar(0.9 + 0.2 * pulse);
          }

          if (haz.timer <= 0) {
            haz.phase = 'active';
            haz.timer = haz.maxTimer;
            if (warnRing) warnRing.visible = false;

            if (haz.type === 'slime') {
              soundEngine.playSlimeSplash();
              spawnBurstParticles(new THREE.Vector3(haz.wx, 0.2, haz.wz), 0x22c55e, 18, 3.2);
              spawnShockwave(new THREE.Vector3(haz.wx, 0.08, haz.wz), 0x22c55e, 1.8);
              if (haz.mesh.userData.puddleMat) {
                haz.mesh.userData.puddleMat.opacity = 0.92;
              }
            } else {
              soundEngine.playElectricSurge();
              spawnBurstParticles(new THREE.Vector3(haz.wx, 0.2, haz.wz), 0x38bdf8, 22, 3.5);
              spawnShockwave(new THREE.Vector3(haz.wx, 0.08, haz.wz), 0x38bdf8, 1.9);
              if (haz.mesh.userData.plateMat) {
                haz.mesh.userData.plateMat.opacity = 0.95;
              }
            }
            triggerHaptic(50);
          }
        } else {
          // Active phase
          haz.timer -= dt;
          haz.tickTimer += dt;

          if (haz.type === 'slime') {
            const bubbles = haz.mesh.userData.bubbles as THREE.Mesh[] | undefined;
            if (bubbles) {
              bubbles.forEach((b, bIdx) => {
                b.scale.setScalar(0.75 + 0.35 * Math.sin(haz.animTime * 4 + bIdx * 1.5));
                b.position.y = 0.08 + 0.04 * Math.sin(haz.animTime * 3 + bIdx);
              });
            }
          } else {
            const arc1 = haz.mesh.userData.arc1 as THREE.Mesh | undefined;
            const arc2 = haz.mesh.userData.arc2 as THREE.Mesh | undefined;
            if (arc1 && arc2) {
              const flicker = Math.random() > 0.12 ? 0.95 : 0.25;
              (arc1.material as THREE.MeshBasicMaterial).opacity = flicker;
              (arc2.material as THREE.MeshBasicMaterial).opacity = flicker;
              arc1.scale.x = 0.85 + Math.random() * 0.3;
              arc2.scale.x = 0.85 + Math.random() * 0.3;
            }
          }

          // Periodic Combat Tick (Every 0.32s)
          if (haz.tickTimer >= 0.32) {
            haz.tickTimer = 0;
            const radius = 1.35;

            // 1. Affect Enemies within hazard radius
            for (const enemy of [...sim.enemies]) {
              const edist = Math.hypot(enemy.mesh.position.x - haz.wx, enemy.mesh.position.z - haz.wz);
              if (edist <= radius) {
                if (haz.type === 'slime') {
                  // Slime slows movement by 55% and applies corrosive damage
                  enemy.slowFactor = Math.min(enemy.slowFactor, 0.45);
                  enemy.slowTimer = Math.max(enemy.slowTimer, 1.2);
                  enemy.hp -= 12;
                  if (Math.random() < 0.45) {
                    spawnBurstParticles(enemy.mesh.position, 0x22c55e, 2, 1.0);
                  }
                } else {
                  // Electrified grid shocks (continuous electrocution) + micro-stun (0.25 speed)
                  enemy.slowFactor = Math.min(enemy.slowFactor, 0.25);
                  enemy.slowTimer = Math.max(enemy.slowTimer, 0.6);
                  enemy.hp -= 28;
                  if (Math.random() < 0.5) {
                    spawnBurstParticles(enemy.mesh.position, 0x38bdf8, 3, 1.2);
                  }
                }

                // Update health bar fill
                const ratio = Math.max(0, enemy.hp / enemy.maxHp);
                enemy.hpFill.style.width = `${ratio * 100}%`;
                if (ratio < 0.3) enemy.hpFill.style.background = '#f43f5e';
                else if (ratio < 0.6) enemy.hpFill.style.background = '#facc15';

                // Check kill by hazard
                if (enemy.hp <= 0) {
                  const eIdx = sim.enemies.indexOf(enemy);
                  if (eIdx !== -1) sim.enemies.splice(eIdx, 1);
                  sim.credits += enemy.reward;
                  sim.score += enemy.reward * 10;
                  setCredits(sim.credits);
                  setScore(sim.score);

                  soundEngine.playEnemyKill(enemy.spec.isBoss);
                  spawnBurstParticles(enemy.mesh.position, haz.type === 'slime' ? 0x22c55e : 0x38bdf8, 20, 3.2);
                  spawnFloatingText(enemy.mesh.position, `HAZARD! +${enemy.reward}`, haz.type === 'slime' ? '#4ade80' : '#38bdf8');

                  sim.scene.remove(enemy.mesh);
                  if (enemy.hpBar.parentNode) enemy.hpBar.parentNode.removeChild(enemy.hpBar);
                }
              }
            }

            // 2. Affect Player Towers on hazard tile
            for (const tower of sim.towers) {
              const tdist = Math.hypot(tower.wx - haz.wx, tower.wz - haz.wz);
              if (tdist <= radius) {
                if (haz.type === 'slime') {
                  // Slime gums up turret: slows fire rate / adds cooldown penalty
                  tower.hazardEffect = 'slime';
                  tower.hazardTimer = 0.8;
                  tower.cooldown = Math.max(tower.cooldown, 0.5);
                  if (Math.random() < 0.3) {
                    spawnBurstParticles(new THREE.Vector3(tower.wx, 0.8, tower.wz), 0x22c55e, 2, 0.8);
                  }
                } else {
                  // High-voltage grid triggers temporary circuit EMP trip & volatile discharge
                  tower.hazardEffect = 'electric';
                  tower.hazardTimer = 0.8;
                  tower.cooldown = Math.max(tower.cooldown, 0.7);

                  if (Math.random() < 0.35) {
                    soundEngine.playTurretOverload();
                    spawnBurstParticles(new THREE.Vector3(tower.wx, 1.1, tower.wz), 0x38bdf8, 6, 1.8);
                    triggerHaptic(20);

                    // Volatile EMP discharge zaps nearby enemies
                    for (const nearEnemy of sim.enemies) {
                      const nearD = Math.hypot(nearEnemy.mesh.position.x - tower.wx, nearEnemy.mesh.position.z - tower.wz);
                      if (nearD <= 3.5) {
                        nearEnemy.hp -= 20;
                        spawnBurstParticles(nearEnemy.mesh.position, 0x38bdf8, 3, 1.2);
                        break;
                      }
                    }
                  }
                }
              }
            }
          }

          // Clean up expired hazard
          if (haz.timer <= 0) {
            sim.hazardGroup.remove(haz.mesh);
            haz.mesh.traverse((child) => {
              if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
              if ((child as THREE.Mesh).material) {
                const mat = (child as THREE.Mesh).material;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else (mat as THREE.Material).dispose();
              }
            });
            sim.hazards.splice(hIdx, 1);
            setActiveHazardCount(sim.hazards.length);
          }
        }
      }

      // Enemy Wave Spawner
      if (!sim.isGameOver && sim.waveActive) {
        if (sim.spawnQueue.length > 0) {
          sim.spawnTimer -= dt;
          if (sim.spawnTimer <= 0) {
            const nextEntry = sim.spawnQueue.shift()!;
            const spec = ENEMY_TYPES[nextEntry.type];
            const spawnCell = SPAWN_CELLS[Math.floor(Math.random() * SPAWN_CELLS.length)];
            const path = findAStarPath(spawnCell.x, spawnCell.z, sim.blockedGrid);

            if (path && labelsMountRef.current) {
              const startPos = gridToWorld(spawnCell.x, spawnCell.z);
              const mesh = createEnemyMesh(nextEntry.type);
              mesh.position.set(startPos.x, 0, startPos.z);
              sim.scene.add(mesh);

              const hpBar = document.createElement('div');
              let bossClass = '';
              if (nextEntry.type === 'final_boss') bossClass = 'boss final-boss-bar';
              else if (nextEntry.type === 'colossus') bossClass = 'boss colossus-bar';
              else if (spec.isBoss) bossClass = 'boss';
              hpBar.className = `hp-bar-wrap ${bossClass}`;

              const hpFill = document.createElement('div');
              hpFill.className = 'hp-bar-fill';
              if (nextEntry.type === 'final_boss') {
                hpFill.style.background = 'linear-gradient(90deg, #ef4444, #f97316)';
              } else if (nextEntry.type === 'colossus') {
                hpFill.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
              }
              hpBar.appendChild(hpFill);
              labelsMountRef.current.appendChild(hpBar);

              const maxHp = Math.round(spec.hp * nextEntry.hpMult);

              sim.enemies.push({
                id: `enemy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: nextEntry.type,
                spec,
                hp: maxHp,
                maxHp,
                speed: spec.speed,
                reward: spec.reward,
                damage: spec.damage,
                mesh,
                hpBar,
                hpFill,
                path,
                pathIndex: path.length > 1 ? 1 : 0,
                slowTimer: 0,
                slowFactor: 1.0,
              });
            }
            sim.spawnTimer = nextEntry.delay;
          }
        } else if (sim.enemies.length === 0) {
          // Wave Cleared!
          sim.waveActive = false;
          setWaveActive(false);

          const waveBonus = 40 + sim.wave * 12;
          sim.credits += waveBonus;
          sim.score += sim.wave * 100;
          setCredits(sim.credits);
          setScore(sim.score);

          soundEngine.playVictory();
          spawnFloatingText(new THREE.Vector3(0, 2, 0), `WAVE CLEARED! +${waveBonus} CR`, '#34d399');

          // Confetti celebration on boss waves
          if (sim.wave % 4 === 0) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
          }

          if (sim.autoWave && !sim.isGameOver) {
            window.setTimeout(() => {
              if (simRef.current && simRef.current.autoWave && !simRef.current.waveActive && !simRef.current.isGameOver) {
                handleSendWave();
              }
            }, 900);
          }
        }
      }

      // Update Enemies
      for (let i = sim.enemies.length - 1; i >= 0; i--) {
        const enemy = sim.enemies[i];

        if (enemy.slowTimer > 0) {
          enemy.slowTimer -= dt;
          enemy.mesh.userData.matPrimary.emissive.setHex(0x38bdf8);
          if (enemy.slowTimer <= 0) {
            enemy.slowFactor = 1.0;
            enemy.mesh.userData.matPrimary.emissive.setHex(enemy.spec.color);
          }
        }

        if (enemy.mesh.userData.rings) {
          enemy.mesh.userData.rings[0].rotation.z += dt * 2.2;
          enemy.mesh.userData.rings[1].rotation.x += dt * 2.6;
        } else if (enemy.mesh.userData.coreMesh && enemy.type === 'scout') {
          enemy.mesh.userData.coreMesh.rotation.y += dt * 4.2;
        }

        const targetCell = enemy.path[enemy.pathIndex];
        if (!targetCell) continue;

        const targetWP = gridToWorld(targetCell.x, targetCell.z);
        const dx = targetWP.x - enemy.mesh.position.x;
        const dz = targetWP.z - enemy.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const moveStep = enemy.speed * enemy.slowFactor * dt * TILE_SIZE * 0.65;

        if (dist <= moveStep) {
          enemy.mesh.position.x = targetWP.x;
          enemy.mesh.position.z = targetWP.z;

          if (isGoalCell(targetCell.x, targetCell.z)) {
            // Breached Core!
            sim.lives = Math.max(0, sim.lives - enemy.damage);
            setLives(sim.lives);

            sim.screenShake = 0.55;
            soundEngine.playCoreDamage();

            spawnBurstParticles(new THREE.Vector3(targetWP.x, 1.2, targetWP.z), 0xf43f5e, 26, 4.0);
            spawnShockwave(new THREE.Vector3(targetWP.x, 0.2, targetWP.z), 0xf43f5e, 2.5);

            sim.scene.remove(enemy.mesh);
            if (enemy.hpBar.parentNode) enemy.hpBar.parentNode.removeChild(enemy.hpBar);
            sim.enemies.splice(i, 1);

            if (sim.lives <= 0) {
              sim.isGameOver = true;
              setIsGameOver(true);
              soundEngine.playDefeat();
              return;
            }
            continue;
          } else if (enemy.pathIndex < enemy.path.length - 1) {
            enemy.pathIndex++;
          }
        } else {
          enemy.mesh.position.x += (dx / dist) * moveStep;
          enemy.mesh.position.z += (dz / dist) * moveStep;
          enemy.mesh.rotation.y = Math.atan2(dx, dz);
        }

        // Project Health Bar to 2D
        const barWorld = enemy.mesh.position.clone();
        barWorld.y += enemy.spec.isBoss ? 2.1 : 1.35;
        const v = barWorld.project(sim.camera);
        if (v.z < 1) {
          const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-(v.y * 0.5) + 0.5) * window.innerHeight;
          enemy.hpBar.style.display = 'block';
          enemy.hpBar.style.left = `${sx}px`;
          enemy.hpBar.style.top = `${sy}px`;
        } else {
          enemy.hpBar.style.display = 'none';
        }
      }

      // Update Turrets & Firing
      for (const tower of sim.towers) {
        const spec = TURRET_SPECS[tower.type];
        const lvl = spec.levels[tower.level - 1];
        const rangeWorld = lvl.range * TILE_SIZE;

        if (tower.cooldown > 0) tower.cooldown -= dt;

        if (tower.mesh.userData.animPart) {
          tower.mesh.userData.animPart.rotation.y += dt * 2.2;
          tower.mesh.userData.animPart.rotation.x += dt * 1.1;
        }

        if (tower.recoil > 0) {
          tower.recoil = Math.max(0, tower.recoil - dt * 5);
          tower.mesh.userData.head.position.y = 0.34 - tower.recoil * 0.06;
        }

        // Target enemy closest to nexus core
        let target: EnemyEntity | null = null;
        let bestProgress = -Infinity;

        for (const enemy of sim.enemies) {
          const dx = enemy.mesh.position.x - tower.wx;
          const dz = enemy.mesh.position.z - tower.wz;
          const dist = Math.hypot(dx, dz);
          if (dist <= rangeWorld) {
            const progress = enemy.mesh.position.x;
            if (progress > bestProgress) {
              bestProgress = progress;
              target = enemy;
            }
          }
        }

        if (target) {
          const dx = target.mesh.position.x - tower.wx;
          const dz = target.mesh.position.z - tower.wz;
          const desiredYaw = Math.atan2(dx, dz);

          const head = tower.mesh.userData.head;
          let diff = desiredYaw - head.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          head.rotation.y += diff * Math.min(1, dt * 14);

          if (tower.cooldown <= 0 && Math.abs(diff) < 0.35) {
            tower.cooldown = 1 / lvl.rate;
            tower.recoil = 1.0;

            const muzzles = tower.mesh.userData.muzzles;
            const muzzleWorld = new THREE.Vector3();
            if (muzzles && muzzles.length > 0) {
              const m = muzzles[Math.floor(Math.random() * muzzles.length)];
              m.getWorldPosition(muzzleWorld);
            } else {
              muzzleWorld.set(tower.wx, 1.0, tower.wz);
            }

            const targetPos = target.mesh.position.clone();
            targetPos.y += 0.6;

            const applyDamage = (victim: EnemyEntity, dmg: number) => {
              if (victim.hp <= 0) return;
              victim.hp -= dmg;
              tower.damageDealt += dmg;

              const ratio = Math.max(0, victim.hp / victim.maxHp);
              victim.hpFill.style.width = `${ratio * 100}%`;
              if (ratio < 0.3) victim.hpFill.style.background = '#f43f5e';
              else if (ratio < 0.6) victim.hpFill.style.background = '#facc15';

              if (victim.hp <= 0) {
                tower.kills += 1;
                const eIdx = sim.enemies.indexOf(victim);
                if (eIdx !== -1) sim.enemies.splice(eIdx, 1);

                sim.credits += victim.reward;
                sim.score += victim.reward * 10;
                setCredits(sim.credits);
                setScore(sim.score);

                soundEngine.playEnemyKill(victim.spec.isBoss);

                const c = victim.spec.isBoss ? 48 : 22;
                spawnBurstParticles(victim.mesh.position, victim.spec.color, c, victim.spec.isBoss ? 5.5 : 3.6);
                spawnBurstParticles(victim.mesh.position, 0xf97316, Math.floor(c * 0.6), 3.0);
                spawnShockwave(new THREE.Vector3(victim.mesh.position.x, 0.1, victim.mesh.position.z), victim.spec.color, victim.spec.isBoss ? 3.2 : 1.6);
                spawnFloatingText(victim.mesh.position, `+${victim.reward}`, '#fde047');

                sim.scene.remove(victim.mesh);
                if (victim.hpBar.parentNode) victim.hpBar.parentNode.removeChild(victim.hpBar);
              }
            };

            // Turret Type Behaviors
            if (tower.type === 'pulse') {
              soundEngine.playPulseFire();
              // Spawn laser beam
              const dist = muzzleWorld.distanceTo(targetPos);
              const geo = new THREE.CylinderGeometry(0.08, 0.08, dist, 8).translate(0, dist / 2, 0).rotateX(Math.PI / 2);
              const mat = new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.95 });
              const beamMesh = new THREE.Mesh(geo, mat);
              beamMesh.position.copy(muzzleWorld);
              beamMesh.lookAt(targetPos);
              sim.scene.add(beamMesh);
              sim.beams.push({ mesh: beamMesh, life: 0.12, maxLife: 0.12 });

              spawnBurstParticles(muzzleWorld, spec.color, 4, 1.6);
              spawnBurstParticles(targetPos, spec.color, 6, 2.0);
              applyDamage(target, lvl.damage);

            } else if (tower.type === 'cryo') {
              soundEngine.playCryoFire();
              const dist = muzzleWorld.distanceTo(targetPos);
              const geo = new THREE.CylinderGeometry(0.12, 0.12, dist, 8).translate(0, dist / 2, 0).rotateX(Math.PI / 2);
              const mat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.9 });
              const beamMesh = new THREE.Mesh(geo, mat);
              beamMesh.position.copy(muzzleWorld);
              beamMesh.lookAt(targetPos);
              sim.scene.add(beamMesh);
              sim.beams.push({ mesh: beamMesh, life: 0.18, maxLife: 0.18 });

              spawnShockwave(new THREE.Vector3(targetPos.x, 0.12, targetPos.z), 0x60a5fa, (lvl.splash || 1.5) * TILE_SIZE * 0.5);
              spawnBurstParticles(targetPos, 0xbfdbfe, 10, 2.0);

              const splashR = (lvl.splash || 1.5) * TILE_SIZE * 0.5;
              for (const e of [...sim.enemies]) {
                if (e.mesh.position.distanceTo(target.mesh.position) <= splashR) {
                  e.slowFactor = Math.min(e.slowFactor, lvl.slowFactor || 0.5);
                  e.slowTimer = Math.max(e.slowTimer, lvl.slowDuration || 2.5);
                  applyDamage(e, lvl.damage);
                }
              }

            } else if (tower.type === 'mortar') {
              soundEngine.playMortarLaunch();
              spawnBurstParticles(muzzleWorld, 0xfb923c, 10, 2.4);

              const shellGeo = new THREE.SphereGeometry(0.22, 10, 10);
              const shellMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
              const shellMesh = new THREE.Mesh(shellGeo, shellMat);
              shellMesh.position.copy(muzzleWorld);
              sim.scene.add(shellMesh);

              const dist = muzzleWorld.distanceTo(targetPos);
              const flightDuration = Math.max(0.45, Math.min(0.95, dist / 18));

              sim.projectiles.push({
                mesh: shellMesh,
                startPos: muzzleWorld.clone(),
                targetPos: targetPos.clone(),
                elapsed: 0,
                duration: flightDuration,
                arcHeight: 2.8 + dist * 0.16,
                damage: lvl.damage,
                splashRadius: (lvl.splash || 2.4) * TILE_SIZE * 0.5,
                color: spec.color,
              });

            } else if (tower.type === 'tesla') {
              soundEngine.playTeslaZap();
              const hitSet = new Set<EnemyEntity>();
              let currSource = muzzleWorld.clone();
              let currTarget: EnemyEntity | null = target;

              const maxChains = lvl.chains || 3;
              for (let c = 0; c < maxChains && currTarget; c++) {
                hitSet.add(currTarget);
                const nextPos = currTarget.mesh.position.clone();
                nextPos.y += 0.65;

                // Spawn zigzag arc
                const pts = [];
                for (let k = 0; k <= 5; k++) {
                  const pt = new THREE.Vector3().lerpVectors(currSource, nextPos, k / 5);
                  if (k > 0 && k < 5) {
                    pt.x += (Math.random() - 0.5) * 0.5;
                    pt.y += (Math.random() - 0.5) * 0.5;
                    pt.z += (Math.random() - 0.5) * 0.5;
                  }
                  pts.push(pt);
                }
                const arcGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.06, 5, false);
                const arcMesh = new THREE.Mesh(arcGeo, new THREE.MeshBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 1.0 }));
                sim.scene.add(arcMesh);
                sim.beams.push({ mesh: arcMesh, life: 0.16, maxLife: 0.16 });

                spawnBurstParticles(nextPos, 0xc084fc, 6, 2.2);
                applyDamage(currTarget, Math.round(lvl.damage * Math.pow(0.85, c)));

                currSource = nextPos;
                let nearest: EnemyEntity | null = null;
                let bestDist = (lvl.chainRange || 3.2) * TILE_SIZE;
                for (const candidate of sim.enemies) {
                  if (hitSet.has(candidate)) continue;
                  const d = candidate.mesh.position.distanceTo(currSource);
                  if (d <= bestDist) {
                    bestDist = d;
                    nearest = candidate;
                  }
                }
                currTarget = nearest;
              }
            }
          }
        }
      }

      // Update Projectiles
      for (let i = sim.projectiles.length - 1; i >= 0; i--) {
        const p = sim.projectiles[i];
        p.elapsed += dt;
        const t = Math.min(1, p.elapsed / p.duration);

        p.mesh.position.lerpVectors(p.startPos, p.targetPos, t);
        p.mesh.position.y += Math.sin(t * Math.PI) * p.arcHeight;

        if (Math.random() < 0.65) {
          spawnBurstParticles(p.mesh.position, 0xfb923c, 1, 0.5);
        }

        if (t >= 1) {
          soundEngine.playExplosion(false);
          spawnBurstParticles(p.targetPos, 0xf97316, 26, 4.2);
          spawnShockwave(new THREE.Vector3(p.targetPos.x, 0.12, p.targetPos.z), 0xf97316, p.splashRadius);

          for (const e of [...sim.enemies]) {
            const d = Math.hypot(e.mesh.position.x - p.targetPos.x, e.mesh.position.z - p.targetPos.z);
            if (d <= p.splashRadius) {
              const falloff = 1 - (d / p.splashRadius) * 0.4;
              const dmg = Math.round(p.damage * falloff);
              e.hp -= dmg;
              const ratio = Math.max(0, e.hp / e.maxHp);
              e.hpFill.style.width = `${ratio * 100}%`;
              if (ratio < 0.3) e.hpFill.style.background = '#f43f5e';
              else if (ratio < 0.6) e.hpFill.style.background = '#facc15';

              if (e.hp <= 0) {
                const eIdx = sim.enemies.indexOf(e);
                if (eIdx !== -1) sim.enemies.splice(eIdx, 1);
                sim.credits += e.reward;
                sim.score += e.reward * 10;
                setCredits(sim.credits);
                setScore(sim.score);

                soundEngine.playEnemyKill(e.spec.isBoss);
                spawnBurstParticles(e.mesh.position, e.spec.color, 24, 3.5);
                spawnFloatingText(e.mesh.position, `+${e.reward}`, '#fde047');

                sim.scene.remove(e.mesh);
                if (e.hpBar.parentNode) e.hpBar.parentNode.removeChild(e.hpBar);
              }
            }
          }

          sim.scene.remove(p.mesh);
          sim.projectiles.splice(i, 1);
        }
      }

      // Update Beams
      for (let i = sim.beams.length - 1; i >= 0; i--) {
        const b = sim.beams[i];
        b.life -= dt;
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, b.life / b.maxLife);
        if (b.life <= 0) {
          sim.scene.remove(b.mesh);
          sim.beams.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.life -= dt;
        pt.vel.y -= 9.8 * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.rotation.x += dt * 6;
        pt.mesh.rotation.y += dt * 6;

        if (pt.mesh.position.y < 0.08) {
          pt.mesh.position.y = 0.08;
          pt.vel.y *= -0.45;
          pt.vel.x *= 0.7;
          pt.vel.z *= 0.7;
        }

        const scale = Math.max(0.01, pt.life / pt.maxLife);
        pt.mesh.scale.setScalar(scale);

        if (pt.life <= 0) {
          sim.scene.remove(pt.mesh);
          sim.particles.splice(i, 1);
        }
      }

      // Update Shockwaves
      for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
        const sw = sim.shockwaves[i];
        sw.elapsed += dt;
        const t = sw.elapsed / sw.duration;
        const r = 0.2 + t * sw.maxRadius;
        sw.mesh.scale.set(r, 1, r);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
        if (t >= 1) {
          sim.scene.remove(sw.mesh);
          sim.shockwaves.splice(i, 1);
        }
      }

      // Render Scene
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Pace loop on software WebGL
        window.setTimeout(() => {
          if (isMounted) animFrameId = requestAnimationFrame(tick);
        }, 80);
      } else {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      dom.removeEventListener('touchcancel', onTouchCancel);
      if (dom.parentNode) dom.parentNode.removeChild(dom);
      renderer.dispose();
    };
  }, [
    canPlaceTowerAt,
    handleDeselectAll,
    handlePlaceTower,
    handleSelectTower,
    handleSelectBuildType,
    handleSendWave,
    handleStartGame,
    handleToggleMute,
    recalculateGlobalPaths,
    refreshGhostPreview,
    spawnBurstParticles,
    spawnFloatingText,
    spawnShockwave,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060913] select-none">
      {/* 1. Isolated 3D Canvas Mount (Zero React HUD re-renders) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* 2. Projected 2D HTML Health Bars & Floating Combat Text */}
      <div ref={labelsMountRef} className="absolute inset-0 z-10 pointer-events-none overflow-hidden" />

      {/* 3. Path Blocking / Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="hud-glass px-5 py-2.5 rounded-2xl bg-rose-950/95 border-rose-500/80 text-rose-200 font-cyber text-xs tracking-wider shadow-2xl flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 4. Title Screen / Mission Briefing */}
      {inTitleScreen ? (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenStudio={() => {
            setInTitleScreen(false);
            if (simRef.current) simRef.current.inTitleScreen = false;
            handleSwitchMode('studio');
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : appMode === 'studio' ? (
        /* Dedicated Standalone 3D Asset Studio Viewport (Zero Game HUD Overlap) */
        <AssetStudio
          onSwitchToGame={() => handleSwitchMode('game')}
          onSelectStudioAsset={handleSelectStudioAsset}
          onFireWeaponTest={handleStudioFireWeapon}
          onTriggerExplosionDemo={() => {
            spawnBurstParticles(new THREE.Vector3(0, 1.0, 0), 0xef4444, 32, 4.0);
            spawnBurstParticles(new THREE.Vector3(0, 1.0, 0), 0xf97316, 24, 3.2);
            spawnShockwave(new THREE.Vector3(0, 0.05, 0), 0xef4444, 2.8);
          }}
          onToggleTurntableSpin={() => {
            const sim = simRef.current;
            if (!sim) return false;
            sim.studioSpin = !sim.studioSpin;
            return sim.studioSpin;
          }}
          onToggleWireframe={() => {
            const sim = simRef.current;
            if (!sim || !currentStudioModelRef.current) return false;
            sim.studioWireframe = !sim.studioWireframe;
            currentStudioModelRef.current.traverse((child) => {
              if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).wireframe = sim.studioWireframe;
              }
            });
            return sim.studioWireframe;
          }}
          onSetLighting={(mode) => {
            const sim = simRef.current;
            if (!sim) return;
            if (mode === 'day') {
              sim.scene.background = new THREE.Color(0x1e293b);
              sim.scene.fog = new THREE.FogExp2(0x1e293b, 0.014);
            } else {
              sim.scene.background = new THREE.Color(0x060913);
              sim.scene.fog = new THREE.FogExp2(0x060913, 0.014);
            }
          }}
          onResetCameraAngle={handleResetCameraAngle}
          onExportOBJ={handleExportOBJ}
          onExportJSON={handleExportJSON}
          meshCount={studioMeshStats.meshes}
          vertexCount={studioMeshStats.verts}
          triangleCount={studioMeshStats.tris}
        />
      ) : (
        <>
          {/* Top Bar HUD */}
          <TopBar
            appMode={appMode}
            credits={credits}
            lives={lives}
            maxLives={20}
            wave={wave}
            waveActive={waveActive}
            score={score}
            gameSpeed={gameSpeed}
            autoWave={autoWave}
            camModeName={camModeName}
            isMuted={isMuted}
            activeBossName={activeBossName}
            activeHazardCount={activeHazardCount}
            onSwitchMode={handleSwitchMode}
            onSendWave={handleSendWave}
            onToggleAutoWave={handleToggleAutoWave}
            onToggleSpeed={handleToggleSpeed}
            onCycleCamera={handleCycleCamera}
            onToggleMute={handleToggleMute}
            onResetGame={handleResetGame}
          />

          {/* Bottom Dock & Inspector */}
          <BottomDock
            buildType={buildType}
            credits={credits}
            selectedTower={selectedTower}
            pathLength={pathLength}
            isCollapsed={isCollapsed}
            onSelectBuildType={handleSelectBuildType}
            onUpgradeTower={handleUpgradeTower}
            onSellTower={handleSellTower}
            onDeselect={handleDeselectAll}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
        </>
      )}

      {/* 5. Game Over / Victory Modal */}
      <GameOverModal
        isOpen={isGameOver}
        wavesSurvived={Math.max(0, wave - 1)}
        score={score}
        onRestart={handleResetGame}
      />
    </div>
  );
}
