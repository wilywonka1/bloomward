// towers.js — the five living towers of the Crystal Garden: their base
// stats, costs, and how upgrades scale them. Pure data + pure functions;
// the game logic that fires them lives in main.js.

export const MAX_LEVEL = 3;

export const TOWERS = {
  sunbloom: {
    name: 'Sunbloom',
    cost: 50,
    range: 132,
    damage: 9,
    rate: 2.2, // shots per second
    projSpeed: 460,
    color: '#ffb340',
    dark: '#e07b1f',
    petal: '#ffd76f',
    desc: 'Cheerful and cheap. Pops pests with seeds of sunlight.',
  },
  frostbell: {
    name: 'Frostbell',
    cost: 70,
    range: 118,
    damage: 3,
    rate: 1.7,
    projSpeed: 380,
    slowFactor: 0.5, // enemies move at 50% speed
    slowDuration: 1.7,
    color: '#4cc9f0',
    dark: '#2478c8',
    petal: '#bdeffc',
    desc: 'Chimes cold air. Slows everything it sprinkles.',
  },
  thornvine: {
    name: 'Thornvine',
    cost: 80,
    range: 126,
    damage: 5,
    rate: 3.6,
    projSpeed: 520,
    poisonDps: 5,
    poisonDuration: 3,
    color: '#3ecf5a',
    dark: '#1d8a3a',
    petal: '#8cf59b',
    desc: 'Spits barbed thorns, fast. Its venom keeps biting.',
  },
  bombard: {
    name: 'Bombard Melon',
    cost: 110,
    range: 152,
    damage: 24,
    rate: 0.55,
    projSpeed: 330,
    splash: 64,
    color: '#ff7847',
    dark: '#c2431d',
    petal: '#ffb59d',
    desc: 'Lobs bursting melons. Slow, huge splash damage.',
  },
  stormspire: {
    name: 'Stormspire',
    cost: 160,
    range: 168,
    damage: 15,
    rate: 1.0,
    projSpeed: 0, // instant lightning, no projectile
    chain: 3,
    chainRange: 96,
    chainFalloff: 0.7,
    color: '#9b5de5',
    dark: '#5e2ea6',
    petal: '#d3b8ff',
    desc: 'A crystal spire that forks lightning across 3 pests.',
  },
};

export const TOWER_ORDER = ['sunbloom', 'frostbell', 'thornvine', 'bombard', 'stormspire'];

// Cost to raise a tower from `level` to `level + 1` (level is 1-based).
export function upgradeCost(type, level) {
  const base = TOWERS[type].cost;
  if (level === 1) return Math.round(base * 0.9);
  if (level === 2) return Math.round(base * 1.4);
  return Infinity;
}

// Effective stats for a tower type at a given level. Each level makes the
// tower hit harder, reach a little further, and fire a little faster.
export function statsAt(type, level) {
  const t = TOWERS[type];
  const dmgMul = level === 1 ? 1 : level === 2 ? 1.55 : 2.45;
  const rateMul = level === 1 ? 1 : level === 2 ? 1.15 : 1.32;
  return {
    range: t.range + (level - 1) * 12,
    damage: Math.round(t.damage * dmgMul),
    rate: t.rate * rateMul,
    projSpeed: t.projSpeed,
    splash: t.splash ? t.splash + (level - 1) * 8 : 0,
    slowFactor: t.slowFactor ? Math.max(0.35, t.slowFactor - (level - 1) * 0.06) : 0,
    slowDuration: t.slowDuration || 0,
    poisonDps: t.poisonDps ? t.poisonDps * dmgMul : 0,
    poisonDuration: t.poisonDuration || 0,
    chain: t.chain ? t.chain + (level === 3 ? 1 : 0) : 0,
    chainRange: t.chainRange || 0,
    chainFalloff: t.chainFalloff || 0,
  };
}

// Total gold sunk into a tower standing at `level` (base + upgrades paid).
export function investedAt(type, level) {
  let total = TOWERS[type].cost;
  for (let l = 1; l < level; l++) total += upgradeCost(type, l);
  return total;
}

export function sellValue(type, level) {
  return Math.floor(investedAt(type, level) * 0.7);
}
