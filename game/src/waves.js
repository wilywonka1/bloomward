// waves.js — the fourteen waves of the Bloomward siege, as data.
// Each wave is a list of spawn groups: { kind, count, gap (seconds
// between spawns inside the group), delay (seconds after the previous
// group finishes before this one starts) }. hpMul scales pest health as
// the siege deepens; clearBonus is the base gold paid for clearing.

export const WAVES = [
  {
    name: 'First Nibbles',
    hpMul: 1.0,
    groups: [{ kind: 'crawler', count: 10, gap: 0.9, delay: 0 }],
  },
  {
    name: 'Beetle Drift',
    hpMul: 1.08,
    groups: [
      { kind: 'crawler', count: 12, gap: 0.8, delay: 0 },
      { kind: 'mite', count: 6, gap: 0.35, delay: 1.2 },
    ],
  },
  {
    name: 'Quick Feet',
    hpMul: 1.16,
    groups: [
      { kind: 'crawler', count: 8, gap: 0.8, delay: 0 },
      { kind: 'darter', count: 8, gap: 0.55, delay: 1.0 },
      { kind: 'crawler', count: 6, gap: 0.7, delay: 1.0 },
    ],
  },
  {
    name: 'The Swarm Remembers',
    hpMul: 1.26,
    groups: [
      { kind: 'mite', count: 18, gap: 0.28, delay: 0 },
      { kind: 'crawler', count: 8, gap: 0.8, delay: 1.4 },
      { kind: 'mite', count: 12, gap: 0.28, delay: 1.0 },
    ],
  },
  {
    name: 'Shells on Parade',
    hpMul: 1.38,
    groups: [
      { kind: 'shellback', count: 4, gap: 1.6, delay: 0 },
      { kind: 'crawler', count: 10, gap: 0.7, delay: 0.8 },
      { kind: 'shellback', count: 3, gap: 1.6, delay: 1.2 },
    ],
  },
  {
    name: 'Wings over the Wall',
    hpMul: 1.5,
    groups: [
      { kind: 'glider', count: 10, gap: 0.6, delay: 0 },
      { kind: 'darter', count: 8, gap: 0.5, delay: 1.2 },
      { kind: 'crawler', count: 10, gap: 0.7, delay: 1.0 },
    ],
  },
  {
    name: 'THE BRAMBLE BOAR',
    hpMul: 1.62,
    boss: true,
    groups: [
      { kind: 'crawler', count: 8, gap: 0.7, delay: 0 },
      { kind: 'boar', count: 1, gap: 1, delay: 1.6 },
      { kind: 'mite', count: 10, gap: 0.3, delay: 4.0 },
    ],
  },
  {
    name: 'Two Fronts',
    hpMul: 1.78,
    groups: [
      { kind: 'darter', count: 12, gap: 0.45, delay: 0 },
      { kind: 'shellback', count: 5, gap: 1.5, delay: 1.0 },
      { kind: 'glider', count: 8, gap: 0.6, delay: 1.2 },
    ],
  },
  {
    name: 'Mitefall',
    hpMul: 1.95,
    groups: [
      { kind: 'mite', count: 26, gap: 0.22, delay: 0 },
      { kind: 'shellback', count: 4, gap: 1.5, delay: 1.2 },
      { kind: 'mite', count: 18, gap: 0.22, delay: 1.0 },
    ],
  },
  {
    name: 'Armoured Column',
    hpMul: 2.15,
    groups: [
      { kind: 'shellback', count: 8, gap: 1.4, delay: 0 },
      { kind: 'glider', count: 10, gap: 0.55, delay: 1.4 },
      { kind: 'darter', count: 10, gap: 0.45, delay: 1.0 },
    ],
  },
  {
    name: 'The Red Rush',
    hpMul: 2.4,
    groups: [
      { kind: 'darter', count: 20, gap: 0.38, delay: 0 },
      { kind: 'crawler', count: 14, gap: 0.6, delay: 1.2 },
      { kind: 'glider', count: 10, gap: 0.5, delay: 1.0 },
    ],
  },
  {
    name: 'Garden of Shells',
    hpMul: 2.7,
    groups: [
      { kind: 'shellback', count: 10, gap: 1.3, delay: 0 },
      { kind: 'mite', count: 20, gap: 0.24, delay: 1.4 },
      { kind: 'shellback', count: 6, gap: 1.3, delay: 1.2 },
    ],
  },
  {
    name: 'Last Wings',
    hpMul: 3.0,
    groups: [
      { kind: 'glider', count: 16, gap: 0.45, delay: 0 },
      { kind: 'darter', count: 16, gap: 0.4, delay: 1.2 },
      { kind: 'shellback', count: 6, gap: 1.4, delay: 1.2 },
    ],
  },
  {
    name: 'THE QUEEN HORNET',
    hpMul: 3.3,
    boss: true,
    groups: [
      { kind: 'glider', count: 8, gap: 0.5, delay: 0 },
      { kind: 'queen', count: 1, gap: 1, delay: 1.6 },
      { kind: 'shellback', count: 4, gap: 1.6, delay: 5.0 },
      { kind: 'darter', count: 12, gap: 0.4, delay: 3.0 },
    ],
  },
];

export const TOTAL_WAVES = WAVES.length;

// Gold paid when a wave is fully cleared, before interest.
export function clearBonus(waveNumber) {
  return 18 + waveNumber * 2;
}

// Interest on banked gold at wave clear: 8%, capped.
export function interestFor(gold) {
  return Math.min(40, Math.floor(gold * 0.08));
}
