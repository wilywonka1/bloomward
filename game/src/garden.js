// garden.js — the Crystal Garden: grid geometry, the winding stone path,
// ponds, and seeded decoration. Everything positional lives here so the
// rest of the game can think in tiles and path-distances.

export const COLS = 16;
export const ROWS = 10;
export const TILE = 64;
export const FIELD_W = COLS * TILE; // 1024
export const FIELD_H = ROWS * TILE; // 640

// Path waypoints in pixel space. The path enters at the left edge on
// row 2, runs right, drops to row 5, runs back left, drops to row 8 and
// finishes at the Great Bloom.
export const WAYPOINTS = [
  { x: -40, y: 160 },
  { x: 800, y: 160 },
  { x: 800, y: 352 },
  { x: 224, y: 352 },
  { x: 224, y: 544 },
  { x: 968, y: 544 },
];

export const BLOOM_POS = { x: 992, y: 544 };

// Cumulative segment lengths, precomputed for pointAlongPath().
const SEGMENTS = [];
let PATH_LENGTH = 0;
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEGMENTS.push({ a, b, len, start: PATH_LENGTH });
  PATH_LENGTH += len;
}
export { PATH_LENGTH };

// Position (and travel direction) at a given distance along the path.
export function pointAlongPath(dist) {
  const d = Math.max(0, Math.min(PATH_LENGTH, dist));
  for (const seg of SEGMENTS) {
    if (d <= seg.start + seg.len || seg === SEGMENTS[SEGMENTS.length - 1]) {
      const t = seg.len === 0 ? 0 : (d - seg.start) / seg.len;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
        dx: (seg.b.x - seg.a.x) / (seg.len || 1),
        dy: (seg.b.y - seg.a.y) / (seg.len || 1),
      };
    }
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return { x: last.x, y: last.y, dx: 1, dy: 0 };
}

// Which tiles the path covers (derived from the waypoint segments so the
// two can never disagree).
export const PATH_TILES = new Set();
function markPathTiles() {
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
    for (let s = 0; s <= steps; s++) {
      const x = a.x + ((b.x - a.x) * s) / steps;
      const y = a.y + ((b.y - a.y) * s) / steps;
      const c = Math.floor(x / TILE);
      const r = Math.floor(y / TILE);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) PATH_TILES.add(c + ',' + r);
    }
  }
}
markPathTiles();

// Ponds: pretty, and they block building just like the path does.
export const POND_TILES = new Set(['5,0', '6,0', '13,3', '1,7', '9,9']);

// The Great Bloom's own tile is reserved too.
export const BLOOM_TILE = '15,8';

export function tileKey(c, r) {
  return c + ',' + r;
}
export function tileCenter(c, r) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}
export function tileAtPixel(x, y) {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return { c, r };
}
export function isPathTile(c, r) {
  return PATH_TILES.has(tileKey(c, r));
}
export function isPondTile(c, r) {
  return POND_TILES.has(tileKey(c, r));
}

// Deterministic decoration so every load paints the same garden: each
// grass tile gets a fixed scatter of flowers and grass tufts.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLOWER_COLORS = ['#ff5d8f', '#ffb340', '#c084fc', '#ff7847', '#4cc9f0', '#ffe066'];
export const DECOR = new Map();
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const key = tileKey(c, r);
    if (PATH_TILES.has(key) || POND_TILES.has(key) || key === BLOOM_TILE) continue;
    const rand = mulberry32(c * 131 + r * 977 + 7);
    const flowers = [];
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      flowers.push({
        x: 10 + rand() * 44,
        y: 10 + rand() * 44,
        color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
        size: 3 + rand() * 3,
      });
    }
    const tufts = [];
    for (let i = 0; i < 3; i++) tufts.push({ x: 8 + rand() * 48, y: 12 + rand() * 44 });
    DECOR.set(key, { flowers, tufts });
  }
}
