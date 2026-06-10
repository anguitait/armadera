// js/hero-pieces.js — piezas decorativas arrastrables que se ensamblan en una figura.
// Las piezas flotan por el hero; al arrastrar una cerca de su contorno objetivo,
// encaja con un "clic" visual. Al completar todas, se puede volver a revolver.

const COLORS = {
  wood: '#c89a5b', woodDeep: '#a9763a', teal: '#57bccb', tealDeep: '#3a9aa9', yellow: '#f5c518',
};

// Figura objetivo: una torre. dx/dy son offsets (en px base) respecto del ancla.
const PIECES = [
  { id: 'base',  shape: 'square', color: 'wood',     size: 66, dx: 0,   dy: 40 },
  { id: 'mid',   shape: 'square', color: 'teal',     size: 56, dx: 0,   dy: -14 },
  { id: 'roof',  shape: 'tri',    color: 'yellow',   size: 62, dx: 0,   dy: -66 },
  { id: 'dot',   shape: 'circle', color: 'woodDeep', size: 26, dx: 0,   dy: -104 },
  { id: 'left',  shape: 'tri',    color: 'tealDeep', size: 44, dx: -56, dy: 46 },
  { id: 'right', shape: 'tri',    color: 'yellow',   size: 44, dx: 56,  dy: 46 },
];

function shapeSVG(shape, size, { fill = null, outline = false } = {}) {
  const s = size;
  const paint = outline
    ? `fill="none" stroke="${fill}" stroke-width="2.5" stroke-dasharray="5 4"`
    : `fill="${fill}"`;
  let inner = '';
  if (shape === 'square') inner = `<rect x="2" y="2" width="${s - 4}" height="${s - 4}" rx="${s * 0.18}" ${paint}/>`;
  else if (shape === 'tri') inner = `<polygon points="${s / 2},3 ${s - 3},${s - 3} 3,${s - 3}" ${paint}/>`;
  else if (shape === 'circle') inner = `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 3}" ${paint}/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${inner}</svg>`;
}

export function mountHeroPieces() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const layer = document.createElement('div');
  layer.className = 'pieces-layer';
  hero.appendChild(layer);

  const badge = document.createElement('button');
  badge.className = 'pieces-reset';
  badge.type = 'button';
  badge.textContent = '↻ Revolver';
  badge.addEventListener('click', scatter);
  hero.appendChild(badge);

  // Estado por pieza
  const items = PIECES.map(p => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = shapeSVG(p.shape, p.size, { fill: COLORS[p.color], outline: true });
    layer.appendChild(slot);

    const el = document.createElement('div');
    el.className = 'piece';
    el.innerHTML = shapeSVG(p.shape, p.size, { fill: COLORS[p.color] });
    layer.appendChild(el);

    return { ...p, el, slot, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, placed: false, dragging: false };
  });

  let W = 0, H = 0, scale = 1;

  function bounds() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    scale = Math.max(0.6, Math.min(1, W / 760));
  }

  function targets() {
    const ax = W * 0.5;
    const ay = H - 120 * scale;            // ancla en la franja inferior, bajo el texto
    for (const it of items) {
      it.tx = ax + it.dx * scale;
      it.ty = ay + it.dy * scale;
    }
  }

  function place(it, x, y) {
    it.x = x; it.y = y;
    const s = it.size * scale;
    it.el.style.width = it.slot.style.width = `${s}px`;
    it.el.firstChild.setAttribute('width', s);
    it.el.firstChild.setAttribute('height', s);
    it.slot.firstChild.setAttribute('width', s);
    it.slot.firstChild.setAttribute('height', s);
    it.el.style.left = `${x - s / 2}px`;
    it.el.style.top = `${y - s / 2}px`;
    it.slot.style.left = `${it.tx - s / 2}px`;
    it.slot.style.top = `${it.ty - s / 2}px`;
  }

  function scatter() {
    bounds(); targets();
    for (const it of items) {
      it.placed = false;
      it.el.classList.remove('placed');
      it.slot.classList.remove('filled');
      const m = it.size * scale;
      it.x = m + Math.random() * (W - 2 * m);
      it.y = m + Math.random() * (H - 2 * m);
      const sp = (0.35 + Math.random() * 0.35) * (reduced ? 0 : 1);
      const a = Math.random() * Math.PI * 2;
      it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
      place(it, it.x, it.y);
    }
    hero.classList.remove('armado');
  }

  function checkDone() {
    if (items.every(it => it.placed)) hero.classList.add('armado');
  }

  // Animación de deriva
  function tick() {
    for (const it of items) {
      if (it.placed || it.dragging) continue;
      const m = it.size * scale / 2;
      it.x += it.vx; it.y += it.vy;
      if (it.x < m || it.x > W - m) { it.vx *= -1; it.x = Math.max(m, Math.min(W - m, it.x)); }
      if (it.y < m || it.y > H - m) { it.vy *= -1; it.y = Math.max(m, Math.min(H - m, it.y)); }
      place(it, it.x, it.y);
    }
    requestAnimationFrame(tick);
  }

  // Arrastre
  for (const it of items) {
    let off = { x: 0, y: 0 };
    it.el.addEventListener('pointerdown', e => {
      if (it.placed) return;
      it.dragging = true;
      it.el.setPointerCapture(e.pointerId);
      it.el.classList.add('dragging');
      const r = hero.getBoundingClientRect();
      off.x = (e.clientX - r.left) - it.x;
      off.y = (e.clientY - r.top) - it.y;
    });
    it.el.addEventListener('pointermove', e => {
      if (!it.dragging) return;
      const r = hero.getBoundingClientRect();
      place(it, (e.clientX - r.left) - off.x, (e.clientY - r.top) - off.y);
    });
    const drop = () => {
      if (!it.dragging) return;
      it.dragging = false;
      it.el.classList.remove('dragging');
      const dist = Math.hypot(it.x - it.tx, it.y - it.ty);
      if (dist < 46 * scale) {
        it.placed = true;
        it.el.classList.add('placed');
        it.slot.classList.add('filled');
        place(it, it.tx, it.ty);
        checkDone();
      }
    };
    it.el.addEventListener('pointerup', drop);
    it.el.addEventListener('pointercancel', drop);
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      bounds(); targets();
      for (const it of items) place(it, it.placed ? it.tx : Math.min(it.x, W), it.placed ? it.ty : Math.min(it.y, H));
    }, 150);
  });

  scatter();
  if (!reduced) requestAnimationFrame(tick);
}
