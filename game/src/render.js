// render.js — every brushstroke of BLOOMWARD. Bright flat shapes with
// bold outlines: the garden, its stone path and ponds, the Great Bloom,
// the five living towers, the pest menagerie, projectiles, and the
// particle/popup effects layer. Draws only from game state; decides
// nothing.

import {
  COLS, ROWS, TILE, FIELD_W, FIELD_H,
  PATH_TILES, POND_TILES, DECOR, BLOOM_POS, BLOOM_TILE, tileKey,
} from './garden.js';
import { TOWERS } from './towers.js';
import { KINDS } from './enemies.js';

const INK = '#26401c';

function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

// ---------------------------------------------------------------- garden
function drawGround(ctx, state) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = (c + r) % 2 === 0 ? '#8fd45e' : '#84cc54';
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
  // Decorative flowers and grass tufts on plain grass tiles.
  for (const [key, decor] of DECOR) {
    const [c, r] = key.split(',').map(Number);
    const ox = c * TILE;
    const oy = r * TILE;
    ctx.strokeStyle = 'rgba(38,80,28,0.5)';
    ctx.lineWidth = 2;
    for (const t of decor.tufts) {
      ctx.beginPath();
      ctx.moveTo(ox + t.x, oy + t.y + 6);
      ctx.lineTo(ox + t.x - 3, oy + t.y - 4);
      ctx.moveTo(ox + t.x + 3, oy + t.y + 6);
      ctx.lineTo(ox + t.x + 4, oy + t.y - 5);
      ctx.stroke();
    }
    for (const f of decor.flowers) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 + state.time * 0.3;
        circle(ctx, ox + f.x + Math.cos(a) * f.size, oy + f.y + Math.sin(a) * f.size, f.size * 0.62, f.color);
      }
      circle(ctx, ox + f.x, oy + f.y, f.size * 0.55, '#fff7ae');
    }
  }
}

function drawPath(ctx) {
  for (const key of PATH_TILES) {
    const [c, r] = key.split(',').map(Number);
    const x = c * TILE;
    const y = r * TILE;
    ctx.fillStyle = '#ecd29a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#e2c384';
    // Cobble speckles, positioned deterministically per tile.
    const seed = (c * 31 + r * 57) % 5;
    ctx.fillRect(x + 8 + seed * 7, y + 12, 12, 7);
    ctx.fillRect(x + 34, y + 30 + seed * 3, 14, 8);
    ctx.fillRect(x + 12, y + 46, 11, 7);
    ctx.strokeStyle = 'rgba(146,110,52,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  }
  // The burrow the pests pour from.
  const by = 160;
  ctx.fillStyle = '#4a3220';
  ctx.beginPath();
  ctx.ellipse(6, by, 16, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a0e';
  ctx.beginPath();
  ctx.ellipse(2, by, 9, 20, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPonds(ctx, state) {
  for (const key of POND_TILES) {
    const [c, r] = key.split(',').map(Number);
    const x = c * TILE + TILE / 2;
    const y = r * TILE + TILE / 2;
    ctx.fillStyle = '#57c7e8';
    ctx.beginPath();
    ctx.ellipse(x, y, 27, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fe0f5';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 5, 15, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    const w = Math.sin(state.time * 2 + c) * 3;
    ctx.beginPath();
    ctx.arc(x + w, y + 6, 8, 0.3, Math.PI - 0.6);
    ctx.stroke();
    // Lily pad.
    circle(ctx, x + 12, y + 8, 6, '#3fae5a');
    circle(ctx, x + 12, y + 2, 3.4, '#ff8fb5');
  }
}

function drawBloom(ctx, state) {
  const { x, y } = BLOOM_POS;
  const pulse = 1 + Math.sin(state.time * 2.2) * 0.05;
  const flash = state.bloomFlashT > 0;
  // Glow.
  const glow = ctx.createRadialGradient(x, y, 6, x, y, 52 * pulse);
  glow.addColorStop(0, flash ? 'rgba(255,90,90,0.55)' : 'rgba(255,160,220,0.5)');
  glow.addColorStop(1, 'rgba(255,160,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 52 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Stem.
  ctx.strokeStyle = '#2f9e44';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + 30);
  ctx.quadraticCurveTo(x - 4, y + 12, x, y + 2);
  ctx.stroke();
  // Crystal petals.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + state.time * 0.25;
    const px = x + Math.cos(a) * 17 * pulse;
    const py = y - 6 + Math.sin(a) * 17 * pulse;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i % 2 === 0 ? '#ff6fb5' : '#c084fc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,90,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  // Crystal heart.
  circle(ctx, x, y - 6, 10 * pulse, flash ? '#ff5252' : '#ffe066');
  circle(ctx, x - 3, y - 10, 3.4, '#fffbe8');
}

// ---------------------------------------------------------------- towers
export function drawTowerShape(ctx, type, level, x, y, angle, time) {
  const t = TOWERS[type];
  const scale = 0.92 + level * 0.11;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Mound base.
  ctx.fillStyle = '#6db84a';
  ctx.beginPath();
  ctx.ellipse(0, 16, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7cc75c';
  ctx.beginPath();
  ctx.ellipse(0, 13, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'sunbloom') {
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -2);
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(Math.sin(time * 1.4 + x) * 0.12);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = t.petal;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 7.5, 4.6, a, 0, Math.PI * 2);
      ctx.fill();
    }
    circle(ctx, 0, 0, 8.5, t.dark);
    circle(ctx, -2.5, -2.5, 2, '#5b3a17');
    circle(ctx, 3, 1.5, 1.8, '#5b3a17');
    ctx.restore();
  } else if (type === 'frostbell') {
    ctx.strokeStyle = '#2478c8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.quadraticCurveTo(-3, 2, 0, -4);
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(Math.sin(time * 2 + y) * 0.16);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.quadraticCurveTo(-10, -10, 0, -12);
    ctx.quadraticCurveTo(10, -10, 11, 4);
    ctx.quadraticCurveTo(0, 9, -11, 4);
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    circle(ctx, 0, 7, 3.4, '#fff');
    ctx.restore();
  } else if (type === 'thornvine') {
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.quadraticCurveTo(-10, -2, -2, -8);
    ctx.moveTo(6, 14);
    ctx.quadraticCurveTo(10, 0, 2, -10);
    ctx.stroke();
    for (const [sx, sy] of [[-8, 2], [8, 0], [0, -12]]) {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx + 6, sy + 5);
      ctx.lineTo(sx - 6, sy + 5);
      ctx.closePath();
      ctx.fill();
      circle(ctx, sx, sy - 2, 2.2, '#eaffea');
    }
  } else if (type === 'bombard') {
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath();
    ctx.ellipse(0, 8, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.rotate(Math.sin(angle) * 0.14 - 0.1);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.ellipse(0, -6, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-15, -6);
    ctx.quadraticCurveTo(0, 2, 15, -6);
    ctx.stroke();
    circle(ctx, -5, -11, 3, '#7a2d12');
    ctx.restore();
  } else if (type === 'stormspire') {
    ctx.fillStyle = t.dark;
    ctx.beginPath();
    ctx.moveTo(-11, 14);
    ctx.lineTo(-4, -14);
    ctx.lineTo(0, -24);
    ctx.lineTo(4, -14);
    ctx.lineTo(11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(-2, -12);
    ctx.lineTo(0, -19);
    ctx.lineTo(2, -12);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();
    const orbPulse = 3.6 + Math.sin(time * 5 + x) * 0.8;
    circle(ctx, 0, -27, orbPulse + 2.4, '#efe6ff');
    circle(ctx, 0, -27, orbPulse, t.color);
  }

  // Level pips.
  for (let i = 0; i < level; i++) {
    circle(ctx, -10 + i * 10, 24, 3.2, '#ffe066');
    ctx.strokeStyle = '#a87e14';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-10 + i * 10, 24, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- enemies
function drawEnemyShape(ctx, e, time) {
  const k = KINDS[e.kind];
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flashT > 0;
  const body = flash ? '#ffffff' : k.color;
  const belly = flash ? '#ffffff' : k.belly;

  if (e.kind === 'crawler') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const wig = Math.sin(time * 14 + e.id * 3 + i * 2) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 7, 4);
      ctx.lineTo(i * 7 - 5, 11 + wig);
      ctx.moveTo(i * 7, 4);
      ctx.lineTo(i * 7 + 5, 11 - wig);
      ctx.stroke();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(3, -2, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, 9, -3, 2, '#14100c');
    circle(ctx, 9, 3, 2, '#14100c');
  } else if (e.kind === 'darter') {
    const a = Math.atan2(e.dirY || 0, e.dirX || 1);
    ctx.rotate(a);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.quadraticCurveTo(2, -9, -11, -6);
    ctx.quadraticCurveTo(-6, 0, -11, 6);
    ctx.quadraticCurveTo(2, 9, 14, 0);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.fillRect(-4, -6, 4, 12);
    ctx.fillRect(3, -5, 3, 10);
    circle(ctx, 7, -2.5, 1.8, '#14100c');
    circle(ctx, 7, 2.5, 1.8, '#14100c');
  } else if (e.kind === 'mite') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + Math.sin(time * 16 + e.id) * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.stroke();
    }
    circle(ctx, 0, 0, 8, body);
    circle(ctx, 2.5, -2.5, 1.6, '#14100c');
    circle(ctx, 2.5, 2.5, 1.6, '#14100c');
  } else if (e.kind === 'shellback') {
    ctx.fillStyle = '#5b8c5a';
    ctx.beginPath();
    ctx.ellipse(-2, 2, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, 13, Math.PI, 0);
    ctx.quadraticCurveTo(13, 6, 0, 7);
    ctx.quadraticCurveTo(-13, 6, -13, 0);
    ctx.fill();
    ctx.strokeStyle = '#1d6f65';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, 8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -4, 4, Math.PI, 0);
    ctx.stroke();
    circle(ctx, 14, 3, 5.5, belly);
    circle(ctx, 15.5, 1.5, 1.5, '#14100c');
  } else if (e.kind === 'glider') {
    const flap = Math.sin(time * 26 + e.id * 2) * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * (0.7 + flap * 0.4));
      ctx.beginPath();
      ctx.ellipse(s * 11, -6, 11, 4.5, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14100c';
    ctx.fillRect(-8, -3, 16, 3.4);
    ctx.fillRect(-7, 4, 14, 3);
    circle(ctx, 0, -10, 5, body);
    circle(ctx, -2, -11, 1.6, '#14100c');
    circle(ctx, 2, -11, 1.6, '#14100c');
  } else if (e.kind === 'boar') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bramble spikes.
    ctx.strokeStyle = '#3c5a1e';
    ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -18);
      ctx.lineTo(i * 10 + 3, -30 - Math.abs(2 - Math.abs(i)) * 2);
      ctx.stroke();
    }
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(22, 2, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, 25, 2, 4.5, '#8a5a33');
    circle(ctx, 18, -6, 2.6, '#ff3b30');
    // Tusks.
    ctx.strokeStyle = '#fff7e0';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(28, 8);
    ctx.quadraticCurveTo(36, 6, 37, -2);
    ctx.moveTo(28, -6);
    ctx.quadraticCurveTo(36, -8, 36, -14);
    ctx.stroke();
  } else if (e.kind === 'queen') {
    const flap = Math.sin(time * 30) * 0.55;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * (0.8 + flap * 0.35));
      ctx.beginPath();
      ctx.ellipse(s * 20, -12, 19, 7, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.fillRect(-15, -6, 30, 6);
    ctx.fillRect(-13, 6, 26, 6);
    // Crown.
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.lineTo(-9, -31);
    ctx.lineTo(-4, -25);
    ctx.lineTo(0, -33);
    ctx.lineTo(4, -25);
    ctx.lineTo(9, -31);
    ctx.lineTo(9, -22);
    ctx.closePath();
    ctx.fill();
    circle(ctx, -5, -18, 3, '#ff3b30');
    circle(ctx, 5, -18, 3, '#ff3b30');
    // Stinger.
    ctx.fillStyle = '#14100c';
    ctx.beginPath();
    ctx.moveTo(-5, 22);
    ctx.lineTo(5, 22);
    ctx.lineTo(0, 33);
    ctx.closePath();
    ctx.fill();
  }

  // Status tints.
  if (e.slowT > 0) {
    ctx.fillStyle = 'rgba(120,210,255,0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.poisonT > 0) {
    circle(ctx, -e.radius * 0.4, -e.radius - 4 + Math.sin(time * 7 + e.id) * 2, 3, 'rgba(90,220,90,0.8)');
    circle(ctx, e.radius * 0.3, -e.radius - 7 + Math.cos(time * 6 + e.id) * 2, 2.4, 'rgba(90,220,90,0.7)');
  }
  ctx.restore();

  // HP bar.
  if (e.hp < e.maxHp) {
    const w = e.boss ? 92 : e.radius * 2 + 8;
    const h = e.boss ? 9 : 5;
    const x = e.x - w / 2;
    const y = e.y - e.radius - (e.boss ? 22 : 13);
    ctx.fillStyle = 'rgba(20,20,20,0.65)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = e.boss ? '#ffd60a' : '#51cf66';
    ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), h);
  }
}

// ---------------------------------------------------------------- effects
function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    const t = TOWERS[p.type];
    // Trail.
    ctx.strokeStyle = t.petal;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (p.type === 'bombard') {
      circle(ctx, p.x, p.y, 8, t.color);
      circle(ctx, p.x - 2.5, p.y - 2.5, 3, t.petal);
    } else if (p.type === 'frostbell') {
      circle(ctx, p.x, p.y, 5.5, t.color);
      circle(ctx, p.x, p.y, 2.4, '#ffffff');
    } else if (p.type === 'thornvine') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = t.dark;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -3.4);
      ctx.lineTo(-5, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      circle(ctx, p.x, p.y, 5, t.color);
      circle(ctx, p.x, p.y, 2.4, '#fff7ae');
    }
  }
}

function drawEffects(ctx, state) {
  for (const fx of state.effects) {
    const life = 1 - fx.t / fx.ttl;
    if (fx.kind === 'spark') {
      ctx.globalAlpha = Math.max(0, life);
      circle(ctx, fx.x, fx.y, fx.r * life + 0.6, fx.color);
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'ring') {
      ctx.globalAlpha = Math.max(0, life) * 0.8;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.maxR * (1 - life * life), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'arc') {
      ctx.globalAlpha = Math.max(0, life);
      ctx.strokeStyle = '#e9dcff';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      fx.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.strokeStyle = '#9b5de5';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'flash') {
      ctx.globalAlpha = Math.max(0, life) * 0.5;
      circle(ctx, fx.x, fx.y, fx.maxR * (1 - life * 0.4), fx.color);
      ctx.globalAlpha = 1;
    }
  }
  // Floating popups ("+6" gold and friends).
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const pop of state.popups) {
    const life = 1 - pop.t / pop.ttl;
    ctx.globalAlpha = Math.min(1, life * 1.6);
    ctx.fillStyle = pop.color;
    ctx.strokeStyle = 'rgba(30,40,10,0.7)';
    ctx.lineWidth = 3;
    const y = pop.y - pop.t * 34;
    ctx.strokeText(pop.text, pop.x, y);
    ctx.fillText(pop.text, pop.x, y);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- overlays
function drawRangeRing(ctx, x, y, range, ok) {
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.20)' : 'rgba(255,60,60,0.18)';
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.85)' : 'rgba(255,60,60,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlacement(ctx, state) {
  const hover = state.hoverTile;
  if (state.placing && hover) {
    const { c, r } = hover;
    const x = c * TILE;
    const y = r * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    const stats = state.placingStats;
    drawRangeRing(ctx, cx, cy, stats.range, hover.valid);
    ctx.fillStyle = hover.valid ? 'rgba(255,255,255,0.35)' : 'rgba(255,60,60,0.4)';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = 0.75;
    drawTowerShape(ctx, state.placing, 1, cx, cy, 0, state.time);
    ctx.globalAlpha = 1;
  }
  if (state.selected) {
    const t = state.selected;
    drawRangeRing(ctx, t.x, t.y, t.stats.range, true);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(t.c * TILE + 3, t.r * TILE + 3, TILE - 6, TILE - 6);
  }
}

// ---------------------------------------------------------------- main draw
export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  drawGround(ctx, state);
  drawPath(ctx);
  drawPonds(ctx, state);
  drawBloom(ctx, state);
  for (const t of state.towers) {
    drawTowerShape(ctx, t.type, t.level, t.x, t.y, t.angle || 0, state.time);
    if (t.recoilT > 0) {
      ctx.globalAlpha = t.recoilT * 2.2;
      circle(ctx, t.x + Math.cos(t.angle || 0) * 20, t.y - 8 + Math.sin(t.angle || 0) * 20, 6, '#fff3b0');
      ctx.globalAlpha = 1;
    }
  }
  // Enemies sorted so lower-on-screen pests overlap the ones behind.
  const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
  for (const e of sorted) if (e.alive) drawEnemyShape(ctx, e, state.time);
  drawProjectiles(ctx, state);
  drawEffects(ctx, state);
  drawPlacement(ctx, state);
}
