// enemies.js — the pests invading the Crystal Garden: kind table, factory,
// movement along the garden path, status effects (slow / poison), and the
// two bosses' habit of spawning escorts as they advance.

import { pointAlongPath, PATH_LENGTH } from './garden.js';

export const KINDS = {
  crawler: {
    name: 'Crawler Beetle',
    hp: 26, speed: 34, gold: 6, score: 10, radius: 13,
    armour: 0, leak: 1, color: '#7c4a21', belly: '#c98d4b',
  },
  darter: {
    name: 'Darter',
    hp: 16, speed: 64, gold: 7, score: 15, radius: 11,
    armour: 0, leak: 1, color: '#e63946', belly: '#ffb3ba',
  },
  mite: {
    name: 'Swarm Mite',
    hp: 8, speed: 46, gold: 3, score: 5, radius: 8,
    armour: 0, leak: 1, color: '#6a4c93', belly: '#b8a9d9',
  },
  shellback: {
    name: 'Shellback Tortoise',
    hp: 130, speed: 22, gold: 14, score: 30, radius: 16,
    armour: 3, leak: 1, color: '#2a9d8f', belly: '#a7d8cd',
  },
  glider: {
    name: 'Glider Wasp',
    hp: 30, speed: 56, gold: 9, score: 20, radius: 12,
    armour: 0, leak: 1, color: '#f4d35e', belly: '#fff3b0',
  },
  boar: {
    name: 'Bramble Boar',
    hp: 2400, speed: 16, gold: 300, score: 1000, radius: 30,
    armour: 2, leak: 5, boss: true, spawnKind: 'mite', spawnEvery: 3.0,
    color: '#5f370e', belly: '#a9713a',
  },
  queen: {
    name: 'Queen Hornet',
    hp: 5200, speed: 20, gold: 600, score: 2500, radius: 30,
    armour: 2, leak: 5, boss: true, spawnKind: 'darter', spawnEvery: 2.5,
    color: '#8d0801', belly: '#f4d35e',
  },
};

let nextId = 1;

export function createEnemy(kind, hpMul = 1, dist = 0) {
  const k = KINDS[kind];
  const hp = Math.round(k.hp * hpMul);
  return {
    id: nextId++,
    kind,
    dist,
    x: -40,
    y: 160,
    hp,
    maxHp: hp,
    speed: k.speed,
    gold: k.gold,
    score: k.score,
    radius: k.radius,
    armour: k.armour,
    leak: k.leak,
    boss: !!k.boss,
    slowT: 0,
    slowFactor: 1,
    poisonT: 0,
    poisonDps: 0,
    spawnT: k.spawnEvery || 0,
    wob: Math.random() * Math.PI * 2,
    alive: true,
    leaked: false,
    flashT: 0,
  };
}

// Advance every enemy. Poison damage is reported through `onPoisonKill`
// (handled by main's damage routine via the returned poison deaths list is
// overkill — instead poison simply reduces hp here and main sweeps the
// dead afterwards, crediting the kill). Bosses append fresh escorts to
// state.enemies. Enemies that reach the Bloom are flagged `leaked`.
export function updateEnemies(state, dt) {
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.alive) continue;

    if (e.flashT > 0) e.flashT -= dt;

    // Poison ticks.
    if (e.poisonT > 0) {
      e.poisonT -= dt;
      e.hp -= e.poisonDps * dt;
      if (e.hp <= 0) {
        e.alive = false;
        e.killedByPoison = true;
        continue;
      }
    }

    // Slow timer.
    let speedMul = 1;
    if (e.slowT > 0) {
      e.slowT -= dt;
      speedMul = e.slowFactor;
    }

    // Boss enrage: the Queen speeds up when badly hurt.
    if (e.kind === 'queen' && e.hp < e.maxHp * 0.3) speedMul *= 1.6;

    e.dist += e.speed * speedMul * dt;
    e.wob += dt * 6;

    const p = pointAlongPath(e.dist);
    e.x = p.x;
    e.y = p.y;
    if (e.kind === 'glider') {
      // Wasps weave side to side as they fly the path.
      const off = Math.sin(e.wob) * 14;
      e.x += -p.dy * off;
      e.y += p.dx * off;
    }
    e.dirX = p.dx;
    e.dirY = p.dy;

    // Bosses trail escorts behind them.
    if (e.boss && KINDS[e.kind].spawnKind) {
      e.spawnT -= dt;
      if (e.spawnT <= 0) {
        e.spawnT = KINDS[e.kind].spawnEvery;
        const baby = createEnemy(KINDS[e.kind].spawnKind, state.waveHpMul, Math.max(0, e.dist - 46));
        list.push(baby);
      }
    }

    if (e.dist >= PATH_LENGTH) {
      e.alive = false;
      e.leaked = true;
    }
  }
}
