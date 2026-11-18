// input.js — pointer and keyboard state for the garden canvas. Owns the
// DOM listeners and exposes a plain state object plus callback slots that
// main.js fills in. Canvas coordinates are reported in canvas pixels,
// already corrected for CSS scaling.

export const input = {
  x: 0,
  y: 0,
  inside: false,
  onClick: null, // (x, y) => void
  onRightClick: null, // () => void
  onKey: null, // (code) => void
};

export function initInput(canvas) {
  function toCanvas(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (evt.clientX - rect.x) * sx, y: (evt.clientY - rect.y) * sy };
  }

  canvas.addEventListener('mousemove', (evt) => {
    const p = toCanvas(evt);
    input.x = p.x;
    input.y = p.y;
    input.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    input.inside = false;
  });
  canvas.addEventListener('click', (evt) => {
    const p = toCanvas(evt);
    if (input.onClick) input.onClick(p.x, p.y);
  });
  canvas.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    if (input.onRightClick) input.onRightClick();
  });
  window.addEventListener('keydown', (evt) => {
    if (input.onKey) input.onKey(evt.code);
  });
}
