// hud.js — the DOM half of BLOOMWARD: top-bar readouts, the tower shop,
// the selected-tower panel, banners, feedback messages, and the three
// full-screen overlays (title / victory / game over). It renders state
// and forwards clicks; all rules live in main.js.

import { TOWERS, TOWER_ORDER, MAX_LEVEL, upgradeCost, sellValue } from './towers.js';

function el(id) {
  return document.getElementById(id);
}

export function createHud(actions) {
  const hud = {
    gold: el('hud-gold'),
    lives: el('hud-lives'),
    wave: el('hud-wave'),
    score: el('hud-score'),
    left: el('hud-left'),
    btnWave: el('btn-wave'),
    btnSpeed: el('btn-speed'),
    btnPause: el('btn-pause'),
    btnMute: el('btn-mute'),
    shop: el('shop'),
    panelEmpty: el('panel-empty'),
    panelBody: el('panel-body'),
    panelName: el('panel-name'),
    panelStats: el('panel-stats'),
    btnUpgrade: el('btn-upgrade'),
    btnSell: el('btn-sell'),
    banner: el('banner'),
    bannerTitle: el('banner-title'),
    bannerSub: el('banner-sub'),
    msg: el('msg'),
    screens: {
      title: el('screen-title'),
      victory: el('screen-victory'),
      gameover: el('screen-gameover'),
    },
    bannerTimer: null,
    msgTimer: null,
    shopCards: {},
  };

  // ---- shop cards ------------------------------------------------------
  TOWER_ORDER.forEach((type, i) => {
    const t = TOWERS[type];
    const card = document.createElement('button');
    card.className = 'shop-card';
    card.innerHTML =
      '<span class="shop-key">' + (i + 1) + '</span>' +
      '<span class="shop-dot" style="background:' + t.color + '"></span>' +
      '<span class="shop-name">' + t.name + '</span>' +
      '<span class="shop-cost">◆ ' + t.cost + '</span>' +
      '<span class="shop-desc">' + t.desc + '</span>';
    card.addEventListener('click', () => actions.onSelectShop(type));
    hud.shop.appendChild(card);
    hud.shopCards[type] = card;
  });

  // ---- title roster ----------------------------------------------------
  const roster = el('title-roster');
  if (roster) {
    roster.innerHTML = TOWER_ORDER.map((type) => {
      const t = TOWERS[type];
      return (
        '<div class="roster-row"><span class="shop-dot" style="background:' + t.color + '"></span>' +
        '<b>' + t.name + '</b><span>◆ ' + t.cost + '</span><em>' + t.desc + '</em></div>'
      );
    }).join('');
  }

  // ---- buttons ---------------------------------------------------------
  hud.btnWave.addEventListener('click', () => actions.onStartWave());
  hud.btnSpeed.addEventListener('click', () => actions.onToggleSpeed());
  hud.btnPause.addEventListener('click', () => actions.onTogglePause());
  hud.btnMute.addEventListener('click', () => actions.onToggleMute());
  hud.btnUpgrade.addEventListener('click', () => actions.onUpgrade());
  hud.btnSell.addEventListener('click', () => actions.onSell());
  el('btn-start').addEventListener('click', () => actions.onStartGame());
  el('btn-again').addEventListener('click', () => actions.onRestart());
  el('btn-retry').addEventListener('click', () => actions.onRestart());

  // ---- per-frame readout ------------------------------------------------
  hud.update = function (state) {
    hud.gold.textContent = state.gold;
    hud.lives.textContent = state.lives;
    hud.wave.textContent = Math.min(state.wave, 14) + ' / 14';
    hud.score.textContent = state.score;
    const remaining = state.enemies.filter((e) => e.alive).length + state.spawnLeft;
    hud.left.textContent = remaining;
    hud.btnWave.disabled = state.mode !== 'build';
    hud.btnWave.textContent =
      state.mode === 'wave' ? 'WAVE ' + state.wave + '…' : '▶ START WAVE ' + (state.wave + 1);
    hud.btnSpeed.textContent = state.speed === 2 ? '⏩ 2×' : '▶ 1×';
    hud.btnPause.textContent = state.paused ? '▶ RESUME' : '⏸ PAUSE';
    for (const type of TOWER_ORDER) {
      const card = hud.shopCards[type];
      card.classList.toggle('cant-afford', state.gold < TOWERS[type].cost);
      card.classList.toggle('placing', state.placing === type);
    }
  };

  // ---- selected-tower panel ---------------------------------------------
  hud.refreshPanel = function (state) {
    const t = state.selected;
    if (!t) {
      hud.panelEmpty.style.display = 'block';
      hud.panelBody.style.display = 'none';
      return;
    }
    hud.panelEmpty.style.display = 'none';
    hud.panelBody.style.display = 'block';
    const base = TOWERS[t.type];
    const s = t.stats;
    hud.panelName.textContent = base.name + ' · Lv ' + t.level;
    let lines =
      'Damage ' + s.damage + ' · Rate ' + s.rate.toFixed(1) + '/s · Range ' + Math.round(s.range);
    if (s.splash) lines += '<br>Splash radius ' + s.splash;
    if (s.slowDuration) lines += '<br>Slows to ' + Math.round(s.slowFactor * 100) + '% for ' + s.slowDuration.toFixed(1) + 's';
    if (s.poisonDps) lines += '<br>Poison ' + Math.round(s.poisonDps) + '/s for ' + s.poisonDuration + 's';
    if (s.chain) lines += '<br>Chains to ' + s.chain + ' pests';
    hud.panelStats.innerHTML = lines;
    if (t.level >= MAX_LEVEL) {
      hud.btnUpgrade.textContent = '★ MAX LEVEL';
      hud.btnUpgrade.disabled = true;
    } else {
      const cost = upgradeCost(t.type, t.level);
      hud.btnUpgrade.textContent = '⬆ UPGRADE · ◆ ' + cost;
      hud.btnUpgrade.disabled = state.gold < cost;
    }
    hud.btnSell.textContent = 'SELL · ◆ ' + sellValue(t.type, t.level);
  };

  // ---- banner + message ---------------------------------------------------
  hud.showBanner = function (title, sub, ms = 2400) {
    hud.bannerTitle.textContent = title;
    hud.bannerSub.textContent = sub || '';
    hud.banner.classList.add('visible');
    if (hud.bannerTimer) clearTimeout(hud.bannerTimer);
    hud.bannerTimer = setTimeout(() => hud.banner.classList.remove('visible'), ms);
  };

  hud.showMessage = function (text, ms = 1800) {
    hud.msg.textContent = text;
    hud.msg.classList.add('visible');
    if (hud.msgTimer) clearTimeout(hud.msgTimer);
    hud.msgTimer = setTimeout(() => hud.msg.classList.remove('visible'), ms);
  };

  // ---- screens --------------------------------------------------------------
  hud.showScreen = function (name) {
    for (const key of Object.keys(hud.screens)) {
      hud.screens[key].classList.toggle('visible', key === name);
    }
  };

  hud.fillVictory = function (state, grade) {
    el('vic-stats').innerHTML =
      'Waves cleared <b>14 / 14</b> · Score <b>' + state.score + '</b><br>' +
      'Gold earned <b>◆ ' + state.goldEarned + '</b> · Lives left <b>' + state.lives + '</b>' +
      ' · Towers standing <b>' + state.towers.length + '</b>';
    el('vic-grade').textContent = grade;
  };

  hud.fillGameOver = function (state) {
    el('over-stats').innerHTML =
      'You fell on <b>wave ' + state.wave + ' / 14</b> · Score <b>' + state.score + '</b><br>' +
      'Best wave <b>' + state.bestWave + '</b> · Best score <b>' + state.bestScore + '</b>';
  };

  hud.setBestLine = function (state) {
    const line = el('title-best');
    if (line) {
      line.textContent = state.bestWave > 0
        ? 'Best so far: wave ' + state.bestWave + ' · score ' + state.bestScore
        : 'No garden has been defended yet. Yours could be the first.';
    }
  };

  return hud;
}
