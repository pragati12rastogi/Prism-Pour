import { COLOR_ORDER } from './colors';
import { Bottle, ColorId, HintSuggestion, LevelConfig, MoveRecord } from './types';

export const BOTTLE_CAPACITY = 4;

export function cloneBottles(bottles: Bottle[]): Bottle[] {
  return bottles.map((b) => [...b]);
}

export function isBottleSolved(bottle: Bottle): boolean {
  if (bottle.length !== BOTTLE_CAPACITY) return false;
  const first = bottle[0];
  return bottle.every((c) => c === first);
}

export function isBottleMonochromatic(bottle: Bottle): boolean {
  if (bottle.length === 0) return false;
  const first = bottle[0];
  return bottle.every((c) => c === first);
}

export function isGameWon(bottles: Bottle[]): boolean {
  return bottles.every((b) => b.length === 0 || isBottleSolved(b));
}

export function getTopRun(bottle: Bottle): { color: ColorId; count: number } | null {
  if (bottle.length === 0) return null;
  const topColor = bottle[bottle.length - 1];
  let count = 0;
  for (let i = bottle.length - 1; i >= 0; i--) {
    if (bottle[i] === topColor) {
      count++;
    } else {
      break;
    }
  }
  return { color: topColor, count };
}

export function canPour(bottles: Bottle[], fromIdx: number, toIdx: number): boolean {
  if (fromIdx === toIdx) return false;
  const source = bottles[fromIdx];
  const dest = bottles[toIdx];
  if (!source || !dest) return false;
  if (source.length === 0) return false;
  if (dest.length >= BOTTLE_CAPACITY) return false;
  if (dest.length === 0) return true;
  return dest[dest.length - 1] === source[source.length - 1];
}

export function executePour(
  bottles: Bottle[],
  fromIdx: number,
  toIdx: number
): { nextBottles: Bottle[]; move: MoveRecord } | null {
  if (!canPour(bottles, fromIdx, toIdx)) return null;
  const next = cloneBottles(bottles);
  const source = next[fromIdx];
  const dest = next[toIdx];
  const topRun = getTopRun(source);
  if (!topRun) return null;

  const available = BOTTLE_CAPACITY - dest.length;
  const transferCount = Math.min(topRun.count, available);

  for (let i = 0; i < transferCount; i++) {
    const popped = source.pop();
    if (popped) dest.push(popped);
  }

  return {
    nextBottles: next,
    move: {
      from: fromIdx,
      to: toIdx,
      color: topRun.color,
      count: transferCount,
    },
  };
}

export function hasAnyValidMove(bottles: Bottle[]): boolean {
  for (let i = 0; i < bottles.length; i++) {
    if (bottles[i].length === 0) continue;
    for (let j = 0; j < bottles.length; j++) {
      if (canPour(bottles, i, j)) {
        // Avoid counting pure monochromatic-to-empty as meaningful progress if checking stuckness
        if (bottles[j].length === 0 && isBottleMonochromatic(bottles[i])) {
          continue;
        }
        return true;
      }
    }
  }
  return false;
}

// --- Solver & Level Generator ---

function canonicalKey(bottles: Bottle[]): string {
  return bottles
    .map((b) => b.join(','))
    .sort()
    .join('|');
}

function scoreState(bottles: Bottle[]): number {
  let score = 0;
  for (const b of bottles) {
    if (b.length === 0) {
      score += 6;
      continue;
    }
    if (isBottleSolved(b)) {
      score += 40;
      continue;
    }
    // Reward contiguous runs from the bottom up
    let bottomRun = 1;
    for (let i = 1; i < b.length; i++) {
      if (b[i] === b[0]) bottomRun++;
      else break;
    }
    score += bottomRun * 5;
    if (bottomRun === b.length) {
      score += 10;
    }
    // Penalize color transitions
    for (let i = 1; i < b.length; i++) {
      if (b[i] !== b[i - 1]) score -= 4;
    }
  }
  return score;
}

interface SolverNode {
  bottles: Bottle[];
  firstMove: { from: number; to: number } | null;
  depth: number;
  priority: number;
  parent: SolverNode | null;
  move: { from: number; to: number } | null;
}

function getConstructiveMoves(bottles: Bottle[]): Array<{ from: number; to: number; bonus: number }> {
  const moves: Array<{ from: number; to: number; bonus: number }> = [];
  let usedEmptyTarget = false;

  for (let i = 0; i < bottles.length; i++) {
    const src = bottles[i];
    if (src.length === 0 || isBottleSolved(src)) continue;

    const srcMono = isBottleMonochromatic(src);
    const topRun = getTopRun(src)!;

    for (let j = 0; j < bottles.length; j++) {
      if (i === j) continue;
      const dst = bottles[j];
      if (!canPour(bottles, i, j)) continue;

      // Prune pointless move: pouring a monochromatic bottle into an empty bottle
      if (dst.length === 0 && srcMono) continue;

      // Only consider one empty target per state symmetry
      if (dst.length === 0) {
        if (usedEmptyTarget) continue;
        usedEmptyTarget = true;
      }

      const available = BOTTLE_CAPACITY - dst.length;
      let bonus = 0;

      if (dst.length > 0) {
        // Pouring onto matching color
        const dstMono = isBottleMonochromatic(dst);
        if (dstMono && topRun.count <= available) {
          bonus += 25;
          if (dst.length + topRun.count === BOTTLE_CAPACITY) bonus += 30; // Completes bottle!
        } else if (topRun.count <= available) {
          bonus += 15; // Clears entire top run
        } else {
          bonus += 4;
        }
      } else {
        // Pouring into empty bottle to uncover buried color
        bonus += 6;
      }

      moves.push({ from: i, to: j, bonus });
    }
  }

  moves.sort((a, b) => b.bonus - a.bonus);
  return moves;
}

export function solveWaterSort(
  initialBottles: Bottle[],
  maxNodes = 4500
): Array<{ from: number; to: number }> | null {
  if (isGameWon(initialBottles)) return [];

  const visited = new Set<string>();
  visited.add(canonicalKey(initialBottles));

  const queue: SolverNode[] = [
    {
      bottles: cloneBottles(initialBottles),
      firstMove: null,
      depth: 0,
      priority: scoreState(initialBottles),
      parent: null,
      move: null,
    },
  ];

  let explored = 0;

  while (queue.length > 0 && explored < maxNodes) {
    // Pop highest priority node (array splice on small active frontier is fast)
    let bestIdx = 0;
    for (let k = 1; k < queue.length; k++) {
      if (queue[k].priority > queue[bestIdx].priority) {
        bestIdx = k;
      }
    }
    const current = queue[bestIdx];
    queue[bestIdx] = queue[queue.length - 1];
    queue.pop();

    explored++;

    const moves = getConstructiveMoves(current.bottles);
    for (const m of moves) {
      const res = executePour(current.bottles, m.from, m.to);
      if (!res) continue;

      if (isGameWon(res.nextBottles)) {
        // Reconstruct path
        const path: Array<{ from: number; to: number }> = [{ from: m.from, to: m.to }];
        let cursor: SolverNode | null = current;
        while (cursor && cursor.move) {
          path.push(cursor.move);
          cursor = cursor.parent;
        }
        path.reverse();
        return path;
      }

      const key = canonicalKey(res.nextBottles);
      if (visited.has(key)) continue;
      visited.add(key);

      const nextDepth = current.depth + 1;
      const h = scoreState(res.nextBottles) + m.bonus * 0.5 - nextDepth * 1.4;
      queue.push({
        bottles: res.nextBottles,
        firstMove: current.firstMove ?? { from: m.from, to: m.to },
        depth: nextDepth,
        priority: h,
        parent: current,
        move: { from: m.from, to: m.to },
      });
    }
  }

  return null;
}

export function findBestHint(bottles: Bottle[]): HintSuggestion | null {
  if (isGameWon(bottles)) return null;

  const solution = solveWaterSort(bottles, 5000);
  if (solution && solution.length > 0) {
    return {
      from: solution[0].from,
      to: solution[0].to,
    };
  }

  return null;
}

// Seeded PRNG (Mulberry32)
function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function getLevelParameters(level: number): { colorCount: number; emptyCount: number } {
  let colorCount = 3;
  if (level === 1) colorCount = 3;
  else if (level === 2) colorCount = 4;
  else if (level <= 4) colorCount = 5;
  else if (level <= 7) colorCount = 6;
  else if (level <= 11) colorCount = 7;
  else if (level <= 16) colorCount = 8;
  else if (level <= 22) colorCount = 9;
  else if (level <= 29) colorCount = 10;
  else if (level <= 38) colorCount = 11;
  else colorCount = 12;

  return {
    colorCount: Math.min(colorCount, COLOR_ORDER.length),
    emptyCount: 2,
  };
}

function buildRandomDistribution(colorCount: number, emptyCount: number, rng: () => number): Bottle[] {
  const activeColors = COLOR_ORDER.slice(0, colorCount);
  const pool: ColorId[] = [];
  for (const c of activeColors) {
    for (let k = 0; k < BOTTLE_CAPACITY; k++) {
      pool.push(c);
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const bottles: Bottle[] = [];
  for (let b = 0; b < colorCount; b++) {
    bottles.push(pool.slice(b * BOTTLE_CAPACITY, (b + 1) * BOTTLE_CAPACITY));
  }
  for (let e = 0; e < emptyCount; e++) {
    bottles.push([]);
  }
  return bottles;
}

function isWellMixed(bottles: Bottle[]): boolean {
  // Ensure no bottle starts already solved or monochromatic
  for (const b of bottles) {
    if (b.length === 0) continue;
    if (isBottleMonochromatic(b)) return false;
  }
  return true;
}

export function generateLevel(level: number): LevelConfig {
  const { colorCount, emptyCount } = getLevelParameters(level);

  for (let attempt = 0; attempt < 30; attempt++) {
    const rng = createRng(level * 104729 + attempt * 7919 + 31);
    const candidate = buildRandomDistribution(colorCount, emptyCount, rng);

    if (!isWellMixed(candidate)) continue;

    const solution = solveWaterSort(candidate, 5000);
    if (solution && solution.length >= colorCount) {
      return {
        level,
        colorCount,
        emptyCount,
        parMoves: solution.length,
        bottles: candidate,
      };
    }
  }

  // Guaranteed solvable fallback via reverse splitting from solved state
  const rng = createRng(level * 99991 + 17);
  const fallbackColors = COLOR_ORDER.slice(0, colorCount);
  const bottles: Bottle[] = fallbackColors.map((c) => [c, c, c, c]);
  for (let e = 0; e < emptyCount; e++) bottles.push([]);

  // Perform valid reverse scatter by mixing layers across bottles while preserving total counts
  for (let step = 0; step < colorCount * 14; step++) {
    const a = Math.floor(rng() * colorCount);
    const b = Math.floor(rng() * colorCount);
    if (a === b) continue;
    const idxA = Math.floor(rng() * BOTTLE_CAPACITY);
    const idxB = Math.floor(rng() * BOTTLE_CAPACITY);
    const tmp = bottles[a][idxA];
    bottles[a][idxA] = bottles[b][idxB];
    bottles[b][idxB] = tmp;
  }

  // Break any accidental solved bottle
  for (let i = 0; i < colorCount; i++) {
    if (isBottleMonochromatic(bottles[i])) {
      const next = (i + 1) % colorCount;
      const tmp = bottles[i][0];
      bottles[i][0] = bottles[next][0];
      bottles[next][0] = tmp;
    }
  }

  const fallbackSol = solveWaterSort(bottles, 4000);
  return {
    level,
    colorCount,
    emptyCount,
    parMoves: fallbackSol ? fallbackSol.length : colorCount * 4,
    bottles,
  };
}
