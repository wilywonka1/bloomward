// main.js — BLOOMWARD's brain: game state, the frame loop, tower combat,
// projectiles, the wave spawner, the gold economy, win/lose flow, input
// wiring, and the screenshot staging hooks (window.__bloomward).

import { TILE, FIELD_W, FIELD_H, PATH_LENGTH, BLOOM_POS, tileAtPixel, tileCenter, tileKey, isPathTile, isPondTile, BLOOM_TILE } from './garden.js';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, statsAt, upgradeCost, sellValue, investedAt } from './towers.js';
import { KINDS, createEnemy, updateEnemies } from './enemies.js';
import { WAVES, TOTAL_WAVES, clearBonus, interestFor } from './waves.js';
import { drawGame } from './render.js';
import { audio } from './audio.js';
import { input, initInput } from './input.js';
import { createHud } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------------ state
const S = {
  mode: 'title', // title | build | wave | victory | gameover
  paused: false,
  speed: 1,
  time: 0,
  gold: 220,
  lives: 20,
  score: 0,
  goldEarned: 0,
  wave: 0,
  waveHpMul: 1,
  towers: [],
  enemies: [],
  projectiles: [],
  effects: [],
  popups: [],
  placing: null,
  placingStats: null,
  selected: null,
  hoverTile: null,
  spawnQueue: [],
  spawnClock: 0,
  spawnLeft: 0,
  kills: 0,
  leaks: 0,
  bloomFlashT: 0,
  bestWave: 0,
  bestScore: 0,
  started: false,
};

function loadBest() {
  try {
    S.bestWave = Number(localStorage.getItem('bloomward_best_wave') || 0) || 0;
    S.bestScore = Number(localStorage.getItem('bloomward_best_score') || 0) || 0;
  } catch (err) { /* storage unavailable — play on without it */ }
}
function saveBest() {
  S.bestWave = Math.max(S.bestWave, S.wave);
  S.bestScore = Math.max(S.bestScore, S.score);
  try {
    localStorage.setItem('bloomward_best_wave', String(S.bestWave));
    localStorage.setItem('bloomward_best_score', String(S.bestScore));
  } catch (err) { /* ignore */ }
}
loadBest();

// ------------------------------------------------------------------ hud
const hud = createHud({
  onSelectShop(type) {
    audio.init();
    if (S.gold < TOWERS[type].cost) {
      hud.showMessage('Not enough gold for ' + TOWERS[type].name + ' — it costs ◆ ' + TOWERS[type].cost + '.');
      audio.denied();
      return;
    }
    S.placing = type;
    S.placingStats = statsAt(type, 1);
    S.selected = null;
    hud.refreshPanel(S);
  },
  onStartWave() {
    audio.init();
    startWave();
  },
  onToggleSpeed() {
    S.speed = S.speed === 1 ? 2 : 1;
  },
  onTogglePause() {
    if (S.mode === 'build' || S.mode === 'wave') S.paused = !S.paused;
  },
  onToggleMute() {
    audio.init();
    const muted = audio.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  },
  onUpgrade() {
    upgradeSelected();
  },
  onSell() {
    sellSelected();
  },
  onStartGame() {
    audio.init();
    hud.showScreen(null);
    S.mode = 'build';
    S.started = true;
    hud.showBanner('PLANT YOUR TOWERS', 'Click a card, then a grass tile. Space starts the wave.', 3000);
  },
  onRestart() {
    audio.init();
    freshRun();
    hud.showScreen(null);
    S.mode = 'build';
    S.started = true;
    hud.showBanner('A NEW GARDEN', 'Plant your towers, then start wave 1.', 2600);
  },
});

// ------------------------------------------------------------------ towers
function makeTower(type, c, r, level) {
  const pos = tileCenter(c, r);
  return {
    type, level, c, r,
    x: pos.x, y: pos.y,
    stats: statsAt(type, level),
    invested: investedAt(type, level),
    cooldown: 0,
    angle: 0,
    recoilT: 0,
  };
}

function towerAt(c, r) {
  return S.towers.find((t) => t.c === c && t.r === r) || null;
}

function canBuild(c, r) {
  if (isPathTile(c, r) || isPondTile(c, r)) return false;
  if (tileKey(c, r) === BLOOM_TILE) return false;
  return !towerAt(c, r);
}

function tryPlace(c, r) {
  const type = S.placing;
  if (!type) return;
  if (!canBuild(c, r)) {
    hud.showMessage('Towers need open grass — not the path, ponds, or the Bloom.');
    audio.denied();
    return;
  }
  const cost = TOWERS[type].cost;
  if (S.gold < cost) {
    hud.showMessage('Not enough gold — ' + TOWERS[type].name + ' costs ◆ ' + cost + '.');
    audio.denied();
    return;
  }
  S.gold -= cost;
  const tower = makeTower(type, c, r, 1);
  S.towers.push(tower);
  S.placing = null;
  S.placingStats = null;
  S.selected = tower;
  burst(tower.x, tower.y, '#ffffff', 8, 90);
  audio.place();
  hud.refreshPanel(S);
}

function upgradeSelected() {
  const t = S.selected;
  if (!t || t.level >= MAX_LEVEL) return;
  const cost = upgradeCost(t.type, t.level);
  if (S.gold < cost) {
    hud.showMessage('Upgrade costs ◆ ' + cost + ' — not enough gold yet.');
    audio.denied();
    return;
  }
  S.gold -= cost;
  t.level += 1;
  t.stats = statsAt(t.type, t.level);
  t.invested += cost;
  burst(t.x, t.y - 6, '#ffd76f', 12, 120);
  audio.upgrade();
  hud.refreshPanel(S);
}

function sellSelected() {
  const t = S.selected;
  if (!t) return;
  const value = sellValue(t.type, t.level);
  S.gold += value;
  S.towers = S.towers.filter((x) => x !== t);
  S.selected = null;
  popup(t.x, t.y - 10, '+◆ ' + value, '#d98a06');
  audio.sell();
  hud.refreshPanel(S);
}

// ------------------------------------------------------------------ fx
function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.75);
    S.effects.push({
      kind: 'spark', x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 26,
      r: 2 + Math.random() * 2.6, color, t: 0, ttl: 0.42 + Math.random() * 0.25,
    });
  }
}
function ring(x, y, maxR, color, ttl = 0.35) {
  S.effects.push({ kind: 'ring', x, y, maxR, color, t: 0, ttl });
}
function popup(x, y, text, color) {
  S.popups.push({ x, y, text, color, t: 0, ttl: 0.95 });
}

// ------------------------------------------------------------------ combat
function damageEnemy(e, amount, bypassArmour = false) {
  if (!e.alive) return;
  const dealt = bypassArmour ? amount : Math.max(1, amount - e.armour);
  e.hp -= dealt;
  e.flashT = 0.09;
  if (e.hp <= 0) e.alive = false;
}

function fireChain(tower, first) {
  const s = tower.stats;
  const hit = [];
  let current = first;
  let from = { x: tower.x, y: tower.y - 26 };
  let dmg = s.damage;
  while (current && hit.length < s.chain) {
    hit.push(current);
    // Jagged arc from the previous point to this pest.
    const points = [from];
    const segs = 3;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      points.push({
        x: from.x + (current.x - from.x) * t + (Math.random() - 0.5) * 22,
        y: from.y + (current.y - from.y) * t + (Math.random() - 0.5) * 22,
      });
    }
    points.push({ x: current.x, y: current.y });
    S.effects.push({ kind: 'arc', points, t: 0, ttl: 0.18 });
    burst(current.x, current.y, '#d3b8ff', 3, 80);
    damageEnemy(current, dmg);
    from = { x: current.x, y: current.y };
    dmg = Math.max(1, Math.round(dmg * s.chainFalloff));
    // Next victim: nearest unhit pest to the one just struck.
    let next = null;
    let best = s.chainRange;
    for (const e of S.enemies) {
      if (!e.alive || hit.includes(e)) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < best) { best = d; next = e; }
    }
    current = next;
  }
}

function fireProjectile(tower, target) {
  const s = tower.stats;
  S.projectiles.push({
    type: tower.type,
    x: tower.x, y: tower.y - 12,
    vx: 0, vy: 0,
    target,
    tx: target.x, ty: target.y,
    speed: s.projSpeed,
    damage: s.damage,
    splash: s.splash,
    slowFactor: s.slowFactor, slowDuration: s.slowDuration,
    poisonDps: s.poisonDps, poisonDuration: s.poisonDuration,
  });
}

function updateTowers(dt) {
  for (const t of S.towers) {
    if (t.recoilT > 0) t.recoilT -= dt;
    t.cooldown -= dt;
    // Target: the living pest in range that is furthest along the path.
    let target = null;
    let bestDist = -1;
    for (const e of S.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= t.stats.range && e.dist > bestDist) {
        bestDist = e.dist;
        target = e;
      }
    }
    if (target) {
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cooldown <= 0) {
        t.cooldown = 1 / t.stats.rate;
        t.recoilT = 0.16;
        if (t.type === 'stormspire') fireChain(t, target);
        else fireProjectile(t, target);
        audio.shoot(t.type);
      }
    }
  }
}

function applyHit(p, x, y) {
  if (p.type === 'bombard') {
    ring(x, y, p.splash, '#ff9e57', 0.32);
    S.effects.push({ kind: 'flash', x, y, maxR: p.splash, color: '#ffb59d', t: 0, ttl: 0.22 });
    burst(x, y, '#ff7847', 10, 150);
    audio.explosion();
    for (const e of S.enemies) {
      if (e.alive && Math.hypot(e.x - x, e.y - y) <= p.splash + e.radius * 0.4) {
        damageEnemy(e, p.damage);
      }
    }
    return;
  }
  const e = p.target;
  if (!e || !e.alive) return;
  damageEnemy(e, p.damage);
  burst(x, y, '#ffffff', 3, 70);
  if (p.type === 'frostbell') {
    e.slowT = Math.max(e.slowT, p.slowDuration);
    e.slowFactor = p.slowFactor;
    ring(e.x, e.y, 38, '#7fd8ff', 0.3);
  } else if (p.type === 'thornvine') {
    e.poisonT = p.poisonDuration;
    e.poisonDps = Math.max(e.poisonDps, p.poisonDps);
  }
}

function updateProjectiles(dt) {
  const keep = [];
  for (const p of S.projectiles) {
    if (p.target && p.target.alive) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    const hitRadius = p.target && p.target.alive ? p.target.radius * 0.6 + 5 : 4;
    if (dist <= step + hitRadius) {
      applyHit(p, p.tx, p.ty);
      continue;
    }
    p.vx = (dx / dist) * p.speed;
    p.vy = (dy / dist) * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    keep.push(p);
  }
  S.projectiles = keep;
}

// ------------------------------------------------------------------ waves
function startWave() {
  if (S.mode !== 'build') return;
  S.wave += 1;
  const def = WAVES[S.wave - 1];
  S.waveHpMul = def.hpMul;
  // Flatten the wave's groups into a timed spawn queue.
  const queue = [];
  let clock = 0;
  for (const g of def.groups) {
    clock += g.delay;
    for (let i = 0; i < g.count; i++) {
      queue.push({ kind: g.kind, at: clock });
      clock += g.gap;
    }
  }
  queue.sort((a, b) => a.at - b.at);
  S.spawnQueue = queue;
  S.spawnClock = 0;
  S.spawnLeft = queue.length;
  S.mode = 'wave';
  hud.showBanner('WAVE ' + S.wave + ' — ' + def.name.toUpperCase(), def.boss ? 'Something enormous is coming. Hold the Bloom!' : 'They are coming for the Bloom!', def.boss ? 3200 : 2300);
  if (def.boss) audio.boss();
}

function updateSpawning(dt) {
  S.spawnClock += dt;
  while (S.spawnQueue.length && S.spawnQueue[0].at <= S.spawnClock) {
    const item = S.spawnQueue.shift();
    S.enemies.push(createEnemy(item.kind, S.waveHpMul));
    S.spawnLeft = S.spawnQueue.length;
  }
}

function sweepDead() {
  const keep = [];
  for (const e of S.enemies) {
    if (e.alive) {
      keep.push(e);
      continue;
    }
    if (e.leaked) {
      S.leaks += 1;
      S.lives -= e.leak;
      S.bloomFlashT = 0.7;
      popup(BLOOM_POS.x - 8, BLOOM_POS.y - 44, '-' + e.leak + ' ♥', '#e63946');
      burst(BLOOM_POS.x, BLOOM_POS.y - 6, '#ff6b81', 12, 130);
      audio.leak();
      if (S.lives <= 0) {
        S.lives = 0;
        gameOver();
        return;
      }
      continue;
    }
    // A kill: credit gold and score exactly once.
    S.kills += 1;
    S.gold += e.gold;
    S.goldEarned += e.gold;
    S.score += e.score;
    popup(e.x, e.y - e.radius - 4, '+◆ ' + e.gold, '#d98a06');
    burst(e.x, e.y, KINDS[e.kind].color, e.boss ? 26 : 8, e.boss ? 190 : 120);
    if (e.boss) ring(e.x, e.y, 70, '#ffd60a', 0.5);
  }
  S.enemies = keep;
}

function checkWaveClear() {
  if (S.mode !== 'wave') return;
  if (S.spawnQueue.length > 0) return;
  if (S.enemies.some((e) => e.alive)) return;
  const bonus = clearBonus(S.wave);
  const interest = interestFor(S.gold);
  S.gold += bonus + interest;
  S.score += S.wave * 25;
  saveBest();
  audio.waveClear();
  if (S.wave >= TOTAL_WAVES) {
    victory();
    return;
  }
  S.mode = 'build';
  hud.showBanner('WAVE ' + S.wave + ' CLEARED!', 'Bonus ◆ ' + bonus + ' · Interest ◆ ' + interest + ' — plant, upgrade, then start wave ' + (S.wave + 1) + '.', 2800);
}

// ------------------------------------------------------------------ endings
function gradeFor() {
  if (S.lives >= 17) return 'S';
  if (S.lives >= 12) return 'A';
  if (S.lives >= 6) return 'B';
  return 'C';
}

function victory() {
  S.mode = 'victory';
  S.score += S.lives * 100;
  saveBest();
  hud.fillVictory(S, gradeFor());
  hud.showScreen('victory');
  audio.victory();
}

function gameOver() {
  if (S.mode === 'gameover') return;
  S.mode = 'gameover';
  saveBest();
  hud.fillGameOver(S);
  hud.showScreen('gameover');
  audio.defeat();
}

function freshRun() {
  S.mode = 'title';
  S.paused = false;
  S.speed = 1;
  S.gold = 220;
  S.lives = 20;
  S.score = 0;
  S.goldEarned = 0;
  S.wave = 0;
  S.waveHpMul = 1;
  S.towers = [];
  S.enemies = [];
  S.projectiles = [];
  S.effects = [];
  S.popups = [];
  S.placing = null;
  S.placingStats = null;
  S.selected = null;
  S.spawnQueue = [];
  S.spawnLeft = 0;
  S.kills = 0;
  S.leaks = 0;
  S.bloomFlashT = 0;
}

// ------------------------------------------------------------------ update
function update(dt) {
  if (S.bloomFlashT > 0) S.bloomFlashT -= dt;
  // Hover tile for placement ghost.
  if (input.inside && (S.mode === 'build' || S.mode === 'wave')) {
    const tile = tileAtPixel(input.x, input.y);
    if (tile) {
      const valid = S.placing ? canBuild(tile.c, tile.r) && S.gold >= TOWERS[S.placing].cost : false;
      S.hoverTile = { c: tile.c, r: tile.r, valid };
    } else S.hoverTile = null;
  } else S.hoverTile = null;

  const playing = (S.mode === 'build' || S.mode === 'wave') && !S.paused;
  if (playing) {
    // Substep the simulation so game time tracks real time even when the
    // frame rate dips: no single step ever exceeds 0.05s of game time.
    let remaining = dt * S.speed;
    let guard = 0;
    while (remaining > 0 && guard < 14) {
      const sdt = Math.min(0.05, remaining);
      remaining -= sdt;
      guard++;
      if (S.mode === 'wave') updateSpawning(sdt);
      updateEnemies(S, sdt);
      sweepDead();
      if (S.mode !== 'wave' && S.mode !== 'build') break;
      updateTowers(sdt);
      updateProjectiles(sdt);
      sweepDead(); // credit this step's kills before any clear is declared
      checkWaveClear();
      if (S.mode !== 'wave' && S.mode !== 'build') break;
    }
  }
  // Effects and popups always drift, even while paused screens settle.
  for (const fx of S.effects) {
    fx.t += dt;
    if (fx.kind === 'spark') {
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      fx.vy += 260 * dt;
    }
  }
  S.effects = S.effects.filter((fx) => fx.t < fx.ttl);
  for (const pop of S.popups) pop.t += dt;
  S.popups = S.popups.filter((pop) => pop.t < pop.ttl);
}

// ------------------------------------------------------------------ input
initInput(canvas);
input.onClick = (x, y) => {
  audio.init();
  if (S.mode !== 'build' && S.mode !== 'wave') return;
  const tile = tileAtPixel(x, y);
  if (!tile) return;
  if (S.placing) {
    tryPlace(tile.c, tile.r);
    return;
  }
  const t = towerAt(tile.c, tile.r);
  S.selected = t;
  hud.refreshPanel(S);
};
input.onRightClick = () => {
  if (S.placing) {
    S.placing = null;
    S.placingStats = null;
  } else if (S.selected) {
    S.selected = null;
    hud.refreshPanel(S);
  }
};
input.onKey = (code) => {
  audio.init();
  if (code === 'Space') {
    if (S.mode === 'build') startWave();
  } else if (code === 'KeyP') {
    if (S.mode === 'build' || S.mode === 'wave') S.paused = !S.paused;
  } else if (code === 'KeyF') {
    S.speed = S.speed === 1 ? 2 : 1;
  } else if (code === 'KeyM') {
    const muted = audio.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  } else if (code === 'Escape') {
    if (S.placing) {
      S.placing = null;
      S.placingStats = null;
    } else if (S.mode === 'build' || S.mode === 'wave') {
      S.paused = !S.paused;
    }
  } else if (code.startsWith('Digit')) {
    const idx = Number(code.slice(5)) - 1;
    if (idx >= 0 && idx < TOWER_ORDER.length && (S.mode === 'build' || S.mode === 'wave')) {
      const type = TOWER_ORDER[idx];
      if (S.gold >= TOWERS[type].cost) {
        S.placing = type;
        S.placingStats = statsAt(type, 1);
        S.selected = null;
        hud.refreshPanel(S);
      } else {
        hud.showMessage('Not enough gold for ' + TOWERS[type].name + ' (◆ ' + TOWERS[type].cost + ').');
        audio.denied();
      }
    }
  }
};

// ------------------------------------------------------------------ staging
function placeStaged(type, c, r, level) {
  const tower = makeTower(type, c, r, level);
  S.towers.push(tower);
  return tower;
}

function stageDefense() {
  freshRun();
  hud.showScreen(null);
  S.mode = 'build';
  S.started = true;
  placeStaged('sunbloom', 4, 1, 2);
  placeStaged('thornvine', 7, 1, 1);
  placeStaged('bombard', 11, 3, 2);
  placeStaged('frostbell', 5, 4, 1);
  placeStaged('stormspire', 8, 6, 2);
  placeStaged('sunbloom', 4, 7, 3);
  placeStaged('thornvine', 10, 7, 1);
  placeStaged('bombard', 13, 6, 1);
  S.wave = 5;
  S.gold = 165;
  S.score = 1240;
  S.goldEarned = 890;
  S.lives = 20;
}

function stageAssault() {
  stageDefense();
  startWave(); // wave 6: Wings over the Wall
  // Pre-march a crowd of pests along the path.
  const crowd = [
    ['glider', 260], ['glider', 430], ['glider', 610], ['glider', 880],
    ['darter', 760], ['darter', 1010], ['darter', 1180],
    ['crawler', 1330], ['crawler', 1520], ['crawler', 1700], ['crawler', 2050],
    ['glider', 1900], ['darter', 2230],
  ];
  for (const [kind, dist] of crowd) {
    const e = createEnemy(kind, S.waveHpMul, dist);
    const p = { x: 0, y: 0 };
    S.enemies.push(e);
    void p;
  }
  // Let positions settle from path distance.
  updateEnemies(S, 0.001);
  for (const e of S.enemies) e.hp = Math.round(e.maxHp * (0.55 + Math.random() * 0.4));
  // Select the Stormspire so its range ring shows.
  S.selected = S.towers.find((t) => t.type === 'stormspire') || null;
  // A few shots already in the air.
  for (const t of S.towers) {
    let target = null;
    let best = -1;
    for (const e of S.enemies) {
      if (Math.hypot(e.x - t.x, e.y - t.y) <= t.stats.range && e.dist > best) {
        best = e.dist;
        target = e;
      }
    }
    if (target && t.type !== 'stormspire') {
      fireProjectile(t, target);
      const p = S.projectiles[S.projectiles.length - 1];
      if (p) { p.x = (t.x + target.x) / 2; p.y = (t.y + target.y) / 2 - 8; }
    }
  }
  S.spawnLeft = S.spawnQueue.length;
  hud.refreshPanel(S);
}

function stageBoss() {
  freshRun();
  hud.showScreen(null);
  S.mode = 'build';
  S.started = true;
  placeStaged('sunbloom', 4, 1, 3);
  placeStaged('stormspire', 7, 1, 3);
  placeStaged('bombard', 11, 3, 3);
  placeStaged('frostbell', 5, 4, 2);
  placeStaged('thornvine', 10, 4, 2);
  placeStaged('stormspire', 8, 6, 3);
  placeStaged('sunbloom', 4, 7, 3);
  placeStaged('bombard', 13, 6, 2);
  placeStaged('frostbell', 11, 7, 2);
  placeStaged('thornvine', 6, 8, 2);
  S.wave = 13;
  S.gold = 240;
  S.lives = 14;
  S.score = 8600;
  S.goldEarned = 5200;
  startWave(); // wave 14: THE QUEEN HORNET
  S.spawnQueue = [];
  S.spawnLeft = 0;
  const mid = PATH_LENGTH * 0.52;
  const queen = createEnemy('queen', S.waveHpMul, mid);
  queen.hp = Math.round(queen.maxHp * 0.55);
  S.enemies.push(queen);
  const escorts = [
    ['glider', mid + 130], ['glider', mid - 150],
    ['darter', mid - 260], ['darter', mid - 340], ['darter', mid + 230],
    ['shellback', mid - 470], ['crawler', mid + 330], ['crawler', mid - 560],
  ];
  for (const [kind, dist] of escorts) S.enemies.push(createEnemy(kind, S.waveHpMul, dist));
  updateEnemies(S, 0.001);
  S.selected = S.towers.find((t) => t.type === 'stormspire' && t.level === 3) || null;
  hud.refreshPanel(S);
}

function stageVictory() {
  stageDefense();
  S.wave = 14;
  S.lives = 13;
  S.score = 14750;
  S.goldEarned = 6930;
  victory();
}

function stageGameOver() {
  stageDefense();
  S.wave = 11;
  S.lives = 0;
  S.score = 5230;
  gameOver();
}

function showTitle() {
  freshRun();
  S.mode = 'title';
  hud.showScreen('title');
  hud.setBestLine(S);
}

const staging = {
  showTitle,
  stageDefense,
  stageAssault,
  stageBoss,
  stageVictory,
  stageGameOver,
  snapshot() {
    return {
      mode: S.mode,
      wave: S.wave,
      gold: S.gold,
      lives: S.lives,
      score: S.score,
      towers: S.towers.length,
      enemies: S.enemies.filter((e) => e.alive).length,
      kills: S.kills,
      leaks: S.leaks,
    };
  },
};
window.__bloomward = staging;

// ------------------------------------------------------------------ boot
hud.showScreen('title');
hud.setBestLine(S);
hud.refreshPanel(S);

const shotName = new URLSearchParams(window.location.search).get('shot');
const SHOT_MAP = {
  title: 'showTitle',
  assault: 'stageAssault',
  boss: 'stageBoss',
  victory: 'stageVictory',
  defense: 'stageDefense',
  gameover: 'stageGameOver',
};
if (shotName && Object.prototype.hasOwnProperty.call(SHOT_MAP, shotName)) {
  staging[SHOT_MAP[shotName]]();
}

let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.25, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  S.time += dt;
  update(dt);
  drawGame(ctx, S);
  hud.update(S);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
