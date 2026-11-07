/**
 * Procedural 3D Mesh Generators conforming to Three.js Craft Guidelines
 * Multi-part composite models (3-12 parts) with distinct materials & roughness.
 */
import * as THREE from 'three';
import { TURRET_SPECS, TurretTypeId, ENEMY_TYPES, EnemyTypeId } from './constants';

export function createTurretMesh(type: TurretTypeId, level = 1, isGhost = false): THREE.Group {
  const spec = TURRET_SPECS[type];
  const root = new THREE.Group();

  const matBase = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.3,
    transparent: isGhost,
    opacity: isGhost ? 0.55 : 1.0,
  });

  const matDark = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25,
    transparent: isGhost,
    opacity: isGhost ? 0.55 : 1.0,
  });

  const matAccent = new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: isGhost ? 0.4 : 0.4 + level * 0.15,
    metalness: 0.4,
    roughness: 0.2,
    transparent: isGhost,
    opacity: isGhost ? 0.65 : 1.0,
  });

  // 1. Octagonal Foundation Pedestal
  const baseGeo = new THREE.CylinderGeometry(0.76, 0.88, 0.28, 8);
  const baseMesh = new THREE.Mesh(baseGeo, matBase);
  baseMesh.position.y = 0.14;
  baseMesh.castShadow = !isGhost;
  baseMesh.receiveShadow = !isGhost;
  root.add(baseMesh);

  // Glowing Pedestal Collar Ring
  const collarGeo = new THREE.CylinderGeometry(0.66, 0.7, 0.08, 12);
  const collarMesh = new THREE.Mesh(collarGeo, matAccent);
  collarMesh.position.y = 0.3;
  root.add(collarMesh);

  // Level Indicator Rings around Pedestal (Level 2 & 3 visual upgrades)
  const levelGroup = new THREE.Group();
  root.add(levelGroup);
  for (let l = 2; l <= level; l++) {
    const ringGeo = new THREE.TorusGeometry(0.78 + (l - 2) * 0.08, 0.035, 8, 24);
    const ringMesh = new THREE.Mesh(ringGeo, matAccent);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.1 + (l - 2) * 0.12;
    levelGroup.add(ringMesh);
  }

  // 2. Rotating Turret Head Group
  const head = new THREE.Group();
  head.position.y = 0.34;
  root.add(head);

  const muzzles: THREE.Object3D[] = [];
  let animPart: THREE.Group | null = null;

  if (type === 'pulse') {
    // Sleek Armored Core Housing
    const bodyGeo = new THREE.BoxGeometry(0.75, 0.44, 0.85);
    const body = new THREE.Mesh(bodyGeo, matBase);
    body.position.y = 0.26;
    body.castShadow = !isGhost;
    head.add(body);

    // Glowing Visor Core
    const visorGeo = new THREE.BoxGeometry(0.62, 0.16, 0.88);
    const visor = new THREE.Mesh(visorGeo, matAccent);
    visor.position.y = 0.3;
    head.add(visor);

    // Barrels (2 barrels at Lvl 1/2, +Top Overcharge Barrel at Lvl 3)
    const barrelPositions: Array<{ x: number; y: number }> = [
      { x: -0.24, y: 0.26 },
      { x: 0.24, y: 0.26 },
    ];
    if (level >= 2) {
      // Side stabilizer fins
      const finGeo = new THREE.BoxGeometry(1.05, 0.1, 0.45);
      const fin = new THREE.Mesh(finGeo, matDark);
      fin.position.set(0, 0.26, -0.1);
      head.add(fin);
    }
    if (level >= 3) {
      barrelPositions.push({ x: 0, y: 0.48 });
    }

    barrelPositions.forEach((pos) => {
      const bGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.95, 10);
      bGeo.rotateX(Math.PI / 2);
      const bMesh = new THREE.Mesh(bGeo, matDark);
      bMesh.position.set(pos.x, pos.y, 0.52);
      head.add(bMesh);

      const tipGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.16, 10);
      tipGeo.rotateX(Math.PI / 2);
      const tipMesh = new THREE.Mesh(tipGeo, matAccent);
      tipMesh.position.set(pos.x, pos.y, 0.98);
      head.add(tipMesh);

      const muzzleObj = new THREE.Object3D();
      muzzleObj.position.set(pos.x, pos.y, 1.08);
      head.add(muzzleObj);
      muzzles.push(muzzleObj);
    });
  } else if (type === 'cryo') {
    // Cryo Chamber Core
    const tankGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.65, 10);
    const tank = new THREE.Mesh(tankGeo, matBase);
    tank.position.y = 0.32;
    head.add(tank);

    // Forward Emitter Dish
    const nozzleGeo = new THREE.ConeGeometry(0.28, 0.55, 10);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, matAccent);
    nozzle.position.set(0, 0.35, 0.55);
    head.add(nozzle);

    const muzzleObj = new THREE.Object3D();
    muzzleObj.position.set(0, 0.35, 0.85);
    head.add(muzzleObj);
    muzzles.push(muzzleObj);

    // Levitating Frost Crystal Assembly
    animPart = new THREE.Group();
    animPart.position.set(0, 0.95, 0);
    head.add(animPart);

    const crystalGeo = new THREE.OctahedronGeometry(0.28 + level * 0.04, 0);
    const crystal = new THREE.Mesh(crystalGeo, matAccent);
    animPart.add(crystal);

    if (level >= 2) {
      const orbitRingGeo = new THREE.TorusGeometry(0.46, 0.03, 6, 20);
      const orbitRing = new THREE.Mesh(orbitRingGeo, matAccent);
      orbitRing.rotation.x = Math.PI / 3;
      animPart.add(orbitRing);
    }
    if (level >= 3) {
      const orbitRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.54, 0.03, 6, 20),
        matAccent
      );
      orbitRing2.rotation.y = Math.PI / 3;
      animPart.add(orbitRing2);
    }
  } else if (type === 'mortar') {
    // Heavy Side Trunnion Mounts
    [-0.42, 0.42].forEach((xOff) => {
      const cheekGeo = new THREE.BoxGeometry(0.18, 0.65, 0.65);
      const cheek = new THREE.Mesh(cheekGeo, matBase);
      cheek.position.set(xOff, 0.32, 0);
      head.add(cheek);
    });

    // Angled Artillery Howitzer Tube
    const cannonGroup = new THREE.Group();
    cannonGroup.position.set(0, 0.38, -0.08);
    cannonGroup.rotation.x = -Math.PI / 5.5; // Pitched up
    head.add(cannonGroup);

    const tubeGeo = new THREE.CylinderGeometry(0.26 + level * 0.03, 0.34, 1.15, 14);
    tubeGeo.rotateX(Math.PI / 2);
    const tube = new THREE.Mesh(tubeGeo, matDark);
    tube.position.z = 0.42;
    cannonGroup.add(tube);

    // Glowing Plasma Breech Bands
    for (let b = 0; b < level; b++) {
      const bandGeo = new THREE.CylinderGeometry(0.32 + level * 0.02, 0.32 + level * 0.02, 0.1, 14);
      bandGeo.rotateX(Math.PI / 2);
      const band = new THREE.Mesh(bandGeo, matAccent);
      band.position.z = 0.2 + b * 0.25;
      cannonGroup.add(band);
    }

    const muzzleObj = new THREE.Object3D();
    muzzleObj.position.set(0, 0, 1.05);
    cannonGroup.add(muzzleObj);
    muzzles.push(muzzleObj);
  } else if (type === 'tesla') {
    // High-Voltage Insulated Spire
    const spireGeo = new THREE.CylinderGeometry(0.18, 0.44, 1.15, 10);
    const spire = new THREE.Mesh(spireGeo, matBase);
    spire.position.y = 0.58;
    head.add(spire);

    // Neon Induction Torus Rings
    const ringCount = 1 + level;
    for (let r = 0; r < ringCount; r++) {
      const tGeo = new THREE.TorusGeometry(0.44 - r * 0.06, 0.045, 8, 20);
      const tMesh = new THREE.Mesh(tGeo, matAccent);
      tMesh.rotation.x = Math.PI / 2;
      tMesh.position.y = 0.38 + r * 0.26;
      head.add(tMesh);
    }

    // Top Plasma Orb
    animPart = new THREE.Group();
    animPart.position.set(0, 1.32, 0);
    head.add(animPart);

    const orbGeo = new THREE.IcosahedronGeometry(0.26 + level * 0.03, 1);
    const orb = new THREE.Mesh(orbGeo, matAccent);
    animPart.add(orb);

    const muzzleObj = new THREE.Object3D();
    muzzleObj.position.set(0, 1.32, 0);
    head.add(muzzleObj);
    muzzles.push(muzzleObj);
  }

  root.userData = {
    head,
    muzzles,
    animPart,
    matAccent,
  };

  return root;
}

export function createEnemyMesh(typeKey: EnemyTypeId): THREE.Group {
  const spec = ENEMY_TYPES[typeKey];
  const group = new THREE.Group();

  const matPrimary = new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 0.4,
    metalness: 0.5,
    roughness: 0.25,
  });

  const matArmor = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });

  let coreMesh: THREE.Mesh | undefined;

  if (typeKey === 'scout') {
    // Fast Diamond Drone
    const geo = new THREE.OctahedronGeometry(0.52, 0);
    coreMesh = new THREE.Mesh(geo, matPrimary);
    coreMesh.position.y = 0.65;
    group.add(coreMesh);

    const wingGeo = new THREE.BoxGeometry(0.95, 0.08, 0.32);
    const wing = new THREE.Mesh(wingGeo, matArmor);
    wing.position.y = 0.65;
    group.add(wing);
  } else if (typeKey === 'sprinter') {
    // Sleek Dart Interceptor
    const geo = new THREE.ConeGeometry(0.42, 1.15, 6);
    geo.rotateX(Math.PI / 2);
    coreMesh = new THREE.Mesh(geo, matPrimary);
    coreMesh.position.y = 0.58;
    group.add(coreMesh);

    const finGeo = new THREE.BoxGeometry(0.9, 0.06, 0.45);
    const fin = new THREE.Mesh(finGeo, matArmor);
    fin.position.set(0, 0.58, -0.2);
    group.add(fin);
  } else if (typeKey === 'tank') {
    // Heavy Armored Goliath Crawler
    const bodyGeo = new THREE.BoxGeometry(0.95, 0.65, 1.1);
    const body = new THREE.Mesh(bodyGeo, matArmor);
    body.position.y = 0.45;
    group.add(body);

    const coreGeo = new THREE.BoxGeometry(0.65, 0.35, 0.72);
    coreMesh = new THREE.Mesh(coreGeo, matPrimary);
    coreMesh.position.y = 0.72;
    group.add(coreMesh);

    // Side Treads
    [-0.52, 0.52].forEach((xOff) => {
      const treadGeo = new THREE.BoxGeometry(0.18, 0.36, 1.2);
      const tread = new THREE.Mesh(treadGeo, matPrimary);
      tread.position.set(xOff, 0.25, 0);
      group.add(tread);
    });
  } else if (typeKey === 'boss') {
    // Dreadnought Core with Orbiting Shield Rings
    const icoGeo = new THREE.IcosahedronGeometry(0.72, 1);
    coreMesh = new THREE.Mesh(icoGeo, matPrimary);
    coreMesh.position.y = 1.05;
    group.add(coreMesh);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.07, 8, 24),
      matArmor
    );
    ring1.position.y = 1.05;
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.05, 8, 24),
      matPrimary
    );
    ring2.position.y = 1.05;
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);

    group.userData.rings = [ring1, ring2];
  } else if (typeKey === 'colossus') {
    // Apex Colossus: Quad-legged Walker Chassis + Rotating Twin Cannon Turret
    const chassisGeo = new THREE.BoxGeometry(1.2, 0.55, 1.4);
    const chassis = new THREE.Mesh(chassisGeo, matArmor);
    chassis.position.y = 0.8;
    group.add(chassis);

    // Quad heavy hydraulic legs
    const legOffsets = [
      { x: -0.65, z: -0.65 },
      { x: 0.65, z: -0.65 },
      { x: -0.65, z: 0.65 },
      { x: 0.65, z: 0.65 },
    ];
    legOffsets.forEach((pos) => {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.85, 8);
      const leg = new THREE.Mesh(legGeo, matArmor);
      leg.position.set(pos.x, 0.42, pos.z);
      leg.rotation.z = pos.x > 0 ? -0.2 : 0.2;
      group.add(leg);
    });

    // Glowing Overdrive Core
    coreMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), matPrimary);
    coreMesh.position.y = 1.15;
    group.add(coreMesh);

    // Armored shoulder missile pods
    [-0.7, 0.7].forEach((xOff) => {
      const podGeo = new THREE.BoxGeometry(0.3, 0.4, 0.7);
      const pod = new THREE.Mesh(podGeo, matArmor);
      pod.position.set(xOff, 1.1, 0);
      group.add(pod);

      const podCap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.15), matPrimary);
      podCap.position.set(xOff, 1.1, 0.38);
      group.add(podCap);
    });

    const colossusRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.06, 8, 32),
      matPrimary
    );
    colossusRing.rotation.x = Math.PI / 2;
    colossusRing.position.y = 1.15;
    group.add(colossusRing);

    group.userData.rings = [colossusRing];
  } else if (typeKey === 'final_boss') {
    // NEXUS OVERLORD PRIMUS: 10-part Supreme Fortress Boss
    // Base Floating Heavy Propulsion Ring
    const driveRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.12, 12, 36),
      matArmor
    );
    driveRing.rotation.x = Math.PI / 2;
    driveRing.position.y = 0.55;
    group.add(driveRing);

    // Dark Monolith Hull Armor Plates (Tiered)
    const hullLower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.55, 0.55, 8), matArmor);
    hullLower.position.y = 0.85;
    group.add(hullLower);

    const hullUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 0.45, 8), matArmor);
    hullUpper.position.y = 1.35;
    group.add(hullUpper);

    // Pulsing Crimson Heart Core
    const heartGeo = new THREE.IcosahedronGeometry(0.68, 1);
    coreMesh = new THREE.Mesh(heartGeo, matPrimary);
    coreMesh.position.y = 1.45;
    group.add(coreMesh);

    // Dual Contra-Rotating Orbiting Energy Shields
    const shield1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.07, 8, 36),
      matPrimary
    );
    shield1.position.y = 1.45;
    shield1.rotation.x = Math.PI / 3;
    group.add(shield1);

    const shield2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.05, 8, 36),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xfacc15,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.2,
      })
    );
    shield2.position.y = 1.45;
    shield2.rotation.y = Math.PI / 3;
    group.add(shield2);

    // 4 Corner Plasma Spikes / Wing Fin Array
    const finAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    finAngles.forEach((angle) => {
      const finGroup = new THREE.Group();
      finGroup.rotation.y = angle;
      group.add(finGroup);

      const finGeo = new THREE.BoxGeometry(0.12, 0.7, 0.85);
      const fin = new THREE.Mesh(finGeo, matArmor);
      fin.position.set(1.4, 1.4, 0);
      fin.rotation.z = -0.3;
      finGroup.add(fin);

      const tipGeo = new THREE.ConeGeometry(0.12, 0.4, 6);
      tipGeo.rotateZ(-Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, matPrimary);
      tip.position.set(1.85, 1.55, 0);
      finGroup.add(tip);
    });

    // Crown Spire Antenna
    const spireGeo = new THREE.ConeGeometry(0.2, 0.9, 8);
    const spire = new THREE.Mesh(spireGeo, matArmor);
    spire.position.y = 1.95;
    group.add(spire);

    const spireBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matPrimary);
    spireBeacon.position.y = 2.42;
    group.add(spireBeacon);

    group.userData.rings = [shield1, shield2, driveRing];
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  group.userData.coreMesh = coreMesh;
  group.userData.matPrimary = matPrimary;
  return group;
}

/**
 * Procedural Environmental Hazard Mesh Generator
 * Creates animated 3D slime pools and high-voltage electrified floor tiles with telegraph warning phases.
 */
export function createHazardMesh(type: 'slime' | 'electric', phase: 'warning' | 'active' = 'warning'): THREE.Group {
  const root = new THREE.Group();

  if (type === 'slime') {
    // 1. Viscous Acid / Slime Pool
    const puddleGeo = new THREE.CylinderGeometry(0.88, 0.94, 0.05, 12);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      emissive: 0x4d7c0f,
      emissiveIntensity: 0.65,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: phase === 'warning' ? 0.35 : 0.88,
    });
    puddleMat.polygonOffset = true;
    puddleMat.polygonOffsetFactor = -1;
    puddleMat.polygonOffsetUnits = -1;

    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.position.y = 0.08;
    root.add(puddle);

    // Glowing Toxic Rim
    const rimGeo = new THREE.TorusGeometry(0.92, 0.035, 6, 24);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      transparent: true,
      opacity: phase === 'warning' ? 0.4 : 0.9,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.09;
    root.add(rim);

    // Bubbles on the surface
    const bubbles: THREE.Mesh[] = [];
    const bubbleOffsets = [
      { x: 0.3, z: 0.3, r: 0.14 },
      { x: -0.35, z: 0.2, r: 0.1 },
      { x: 0.15, z: -0.35, r: 0.12 },
      { x: -0.25, z: -0.28, r: 0.09 },
      { x: 0.0, z: 0.05, r: 0.16 },
    ];
    bubbleOffsets.forEach((b) => {
      const bGeo = new THREE.SphereGeometry(b.r, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const bMesh = new THREE.Mesh(bGeo, puddleMat);
      bMesh.position.set(b.x, 0.08, b.z);
      root.add(bMesh);
      bubbles.push(bMesh);
    });
    root.userData.bubbles = bubbles;

    // Warning boundary indicator
    const warnRingGeo = new THREE.TorusGeometry(0.98, 0.03, 4, 16);
    const warnRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
    });
    const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
    warnRing.rotation.x = Math.PI / 2;
    warnRing.position.y = 0.1;
    warnRing.visible = phase === 'warning';
    root.add(warnRing);

    root.userData.warnRing = warnRing;
    root.userData.puddleMat = puddleMat;
    root.userData.rimMat = rimMat;

  } else {
    // 2. High-Voltage Electrified Grid Plate
    const plateGeo = new THREE.BoxGeometry(1.88, 0.04, 1.88);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: phase === 'warning' ? 0.4 : 0.9,
    });
    plateMat.polygonOffset = true;
    plateMat.polygonOffsetFactor = -1;
    plateMat.polygonOffsetUnits = -1;

    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.08;
    root.add(plate);

    // 4 Corner Electrodes
    const cornerOffsets = [
      { x: -0.85, z: -0.85 },
      { x: 0.85, z: -0.85 },
      { x: 0.85, z: 0.85 },
      { x: -0.85, z: 0.85 },
    ];
    cornerOffsets.forEach((c) => {
      const nodeGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.2, 8);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8,
        metalness: 0.7,
        roughness: 0.2,
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(c.x, 0.18, c.z);
      root.add(node);
    });

    // Lightning Arc Cross
    const arcCrossGeo = new THREE.BoxGeometry(1.6, 0.02, 0.06);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: phase === 'warning' ? 0.3 : 0.95,
    });
    const arc1 = new THREE.Mesh(arcCrossGeo, arcMat);
    arc1.position.y = 0.11;
    root.add(arc1);
    const arc2 = new THREE.Mesh(arcCrossGeo, arcMat);
    arc2.rotation.y = Math.PI / 2;
    arc2.position.y = 0.11;
    root.add(arc2);

    root.userData.arc1 = arc1;
    root.userData.arc2 = arc2;
    root.userData.plateMat = plateMat;

    // Warning perimeter ring
    const warnRingGeo = new THREE.TorusGeometry(0.98, 0.03, 4, 16);
    const warnRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
    });
    const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
    warnRing.rotation.x = Math.PI / 2;
    warnRing.position.y = 0.1;
    warnRing.visible = phase === 'warning';
    root.add(warnRing);

    root.userData.warnRing = warnRing;
  }

  return root;
}

