/**
 * A* Pathfinding Engine for Nexus Grid 3D
 */
import { GRID_W, GRID_H, GOAL_CELLS, GridCell, isValidCell } from './constants';

export function findAStarPath(
  sx: number,
  sz: number,
  blockedGrid: boolean[][],
  tempBlock: GridCell | null = null
): GridCell[] | null {
  if (!isValidCell(sx, sz)) return null;

  const isGoal = (x: number, z: number) => GOAL_CELLS.some((g) => g.x === x && g.z === z);
  if (isGoal(sx, sz)) return [{ x: sx, z: sz }];

  const key = (x: number, z: number) => `${x},${z}`;
  const heuristic = (x: number, z: number) => {
    let best = Infinity;
    for (const g of GOAL_CELLS) {
      const d = Math.abs(x - g.x) + Math.abs(z - g.z);
      if (d < best) best = d;
    }
    return best;
  };

  const openSet: Array<{ x: number; z: number; f: number; g: number }> = [
    { x: sx, z: sz, f: heuristic(sx, sz), g: 0 },
  ];
  const cameFrom = new Map<string, GridCell>();
  const gScore = new Map<string, number>();
  const closedSet = new Set<string>();

  gScore.set(key(sx, sz), 0);

  // 4-directional moves (prefer forward rightwards)
  const dirs = [
    { dx: 1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
    { dx: -1, dz: 0 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const cKey = key(current.x, current.z);

    if (isGoal(current.x, current.z)) {
      const path: GridCell[] = [{ x: current.x, z: current.z }];
      let currK = cKey;
      while (cameFrom.has(currK)) {
        const prev = cameFrom.get(currK)!;
        path.unshift(prev);
        currK = key(prev.x, prev.z);
      }
      return path;
    }

    closedSet.add(cKey);

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const nz = current.z + d.dz;
      if (!isValidCell(nx, nz)) continue;

      const nKey = key(nx, nz);
      if (closedSet.has(nKey)) continue;

      // Check if blocked by placed tower or candidate tower
      const isBlocked = blockedGrid[nx][nz] || (tempBlock && tempBlock.x === nx && tempBlock.z === nz);
      if (isBlocked) continue;

      // Slight tie-breaker preference to keep path centered
      const centerBias = Math.abs(nz - 4.5) * 0.002;
      const tentativeG = current.g + 1 + centerBias;

      const prevG = gScore.has(nKey) ? gScore.get(nKey)! : Infinity;
      if (tentativeG < prevG) {
        cameFrom.set(nKey, { x: current.x, z: current.z });
        gScore.set(nKey, tentativeG);
        const f = tentativeG + heuristic(nx, nz);
        const existing = openSet.find((n) => n.x === nx && n.z === nz);
        if (existing) {
          existing.g = tentativeG;
          existing.f = f;
        } else {
          openSet.push({ x: nx, z: nz, g: tentativeG, f });
        }
      }
    }
  }

  return null; // No path exists
}
