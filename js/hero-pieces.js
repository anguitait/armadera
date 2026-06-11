// js/hero-pieces.js · piezas decorativas arrastrables que se ensamblan en un animal.
// En cada carga se elige un animal al azar; sus piezas flotan por el hero y al
// arrastrarlas cerca de su contorno objetivo encajan. Al completarlo se puede
// "Revolver" para armar otro animal distinto.

const COLORS = {
  wood: '#c89a5b', woodDeep: '#a9763a', teal: '#57bccb', tealDeep: '#3a9aa9', yellow: '#f5c518',
};

// Cada animal: lista de piezas con forma, color, tamaño, offset (dx,dy en px; dy<0 = arriba)
// y rotación (grados, horario). El triángulo apunta hacia arriba sin rotar.
const ANIMALS = {
  pajaro: [
    { shape: 'circle', color: 'teal',     size: 60, dx: 0,   dy: 6,   rot: 0 },    // cuerpo
    { shape: 'tri',    color: 'yellow',   size: 30, dx: -40, dy: 10,  rot: -100 }, // cola
    { shape: 'tri',    color: 'woodDeep', size: 36, dx: -2,  dy: 8,   rot: 200 },  // ala
    { shape: 'circle', color: 'teal',     size: 34, dx: 28,  dy: -26, rot: 0 },    // cabeza
    { shape: 'tri',    color: 'yellow',   size: 22, dx: 52,  dy: -22, rot: 90 },   // pico
    { shape: 'circle', color: 'woodDeep', size: 14, dx: 33,  dy: -32, rot: 0 },    // ojo
  ],
  gato: [
    { shape: 'circle', color: 'wood',     size: 56, dx: 0,   dy: 16,  rot: 0 },    // cuerpo
    { shape: 'tri',    color: 'teal',     size: 28, dx: 38,  dy: 20,  rot: 115 },  // cola
    { shape: 'circle', color: 'wood',     size: 44, dx: 0,   dy: -30, rot: 0 },    // cabeza
    { shape: 'tri',    color: 'wood',     size: 24, dx: -16, dy: -56, rot: 0 },    // oreja izq
    { shape: 'tri',    color: 'wood',     size: 24, dx: 16,  dy: -56, rot: 0 },    // oreja der
    { shape: 'tri',    color: 'yellow',   size: 14, dx: 0,   dy: -26, rot: 180 },  // nariz
  ],
  pez: [
    { shape: 'circle', color: 'teal',     size: 62, dx: 0,   dy: 0,   rot: 0 },    // cuerpo
    { shape: 'tri',    color: 'tealDeep', size: 40, dx: -48, dy: 0,   rot: -90 },  // cola
    { shape: 'tri',    color: 'yellow',   size: 26, dx: 0,   dy: -32, rot: 0 },    // aleta sup
    { shape: 'tri',    color: 'yellow',   size: 22, dx: 0,   dy: 30,  rot: 180 },  // aleta inf
    { shape: 'circle', color: 'woodDeep', size: 14, dx: 24,  dy: -6,  rot: 0 },    // ojo
    { shape: 'circle', color: 'yellow',   size: 14, dx: 42,  dy: -10, rot: 0 },    // burbuja
  ],
  tortuga: [
    { shape: 'circle', color: 'wood',     size: 60, dx: 0,   dy: -4,  rot: 0 },    // caparazón
    { shape: 'tri',    color: 'yellow',   size: 26, dx: 0,   dy: -26, rot: 0 },    // dibujo del caparazón
    { shape: 'circle', color: 'teal',     size: 28, dx: 38,  dy: -2,  rot: 0 },    // cabeza
    { shape: 'tri',    color: 'woodDeep', size: 22, dx: 22,  dy: 28,  rot: 180 },  // pata delantera
    { shape: 'tri',    color: 'woodDeep', size: 22, dx: -22, dy: 28,  rot: 180 },  // pata trasera
    { shape: 'tri',    color: 'yellow',   size: 18, dx: -40, dy: 6,   rot: -90 },  // cola
  ],
  conejo: [
    { shape: 'circle', color: 'wood',     size: 52, dx: 0,   dy: 18,  rot: 0 },    // cuerpo
    { shape: 'circle', color: 'yellow',   size: 18, dx: -34, dy: 22,  rot: 0 },    // cola
    { shape: 'circle', color: 'wood',     size: 40, dx: 0,   dy: -22, rot: 0 },    // cabeza
    { shape: 'tri',    color: 'wood',     size: 22, dx: -12, dy: -58, rot: 0 },    // oreja izq
    { shape: 'tri',    color: 'wood',     size: 22, dx: 12,  dy: -58, rot: 0 },    // oreja der
    { shape: 'circle', color: 'tealDeep', size: 12, dx: 0,   dy: -20, rot: 0 },    // nariz
  ],
  perro: [
    { shape: 'circle', color: 'teal',     size: 54, dx: 0,   dy: 14,  rot: 0 },    // cuerpo
    { shape: 'tri',    color: 'teal',     size: 26, dx: -38, dy: 4,   rot: -60 },  // cola
    { shape: 'circle', color: 'teal',     size: 38, dx: 30,  dy: -20, rot: 0 },    // cabeza
    { shape: 'tri',    color: 'woodDeep', size: 26, dx: 16,  dy: -40, rot: 160 },  // oreja
    { shape: 'circle', color: 'woodDeep', size: 16, dx: 50,  dy: -16, rot: 0 },    // hocico
    { shape: 'tri',    color: 'wood',     size: 20, dx: 6,   dy: 40,  rot: 180 },  // pata
  ],
};
const KEYS = Object.keys(ANIMALS);

function shapeSVG(shape, size, { fill, outline = false }) {
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

  const reset = document.createElement('button');
  reset.className = 'pieces-reset';
  reset.type = 'button';
  reset.textContent = '↻ Armar otro';
  reset.addEventListener('click', () => build());
  hero.appendChild(reset);

  let items = [];
  let figCount = 1;
  let W = 0, H = 0, scale = 1;

  function bounds() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    scale = Math.max(0.62, Math.min(1, W / 760));
  }

  // Ancla de cada figura (en la franja inferior, enmarcando el texto centrado).
  function anchor(fig) {
    const ay = H - 104 * scale;
    if (figCount === 1) return { ax: W >= 820 ? W * 0.74 : W * 0.5, ay };
    if (figCount === 2) return { ax: fig === 0 ? W * 0.24 : W * 0.76, ay };
    return { ax: W * [0.2, 0.5, 0.8][fig], ay };   // tres: izquierda, centro, derecha
  }

  function targets() {
    for (const it of items) {
      const a = anchor(it.fig);
      it.tx = a.ax + it.dx * scale;
      it.ty = a.ay + it.dy * scale;
    }
  }

  function place(it, x, y) {
    it.x = x; it.y = y;
    const s = it.size * scale;
    it.el.style.left = `${x - s / 2}px`;  it.el.style.top = `${y - s / 2}px`;
    it.slot.style.left = `${it.tx - s / 2}px`; it.slot.style.top = `${it.ty - s / 2}px`;
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
      const sp = (0.2 + Math.random() * 0.22) * (reduced ? 0 : 1);
      const a = Math.random() * Math.PI * 2;
      it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
      place(it, it.x, it.y);
    }
    hero.classList.remove('armado');
  }

  function build() {
    layer.innerHTML = '';
    bounds();
    figCount = W >= 900 ? 3 : W >= 560 ? 2 : 1;                    // 3 figuras en desktop ancho, 2 medio, 1 móvil
    const keys = [...KEYS].sort(() => Math.random() - 0.5).slice(0, figCount); // animales distintos al azar
    items = [];
    keys.forEach((key, fig) => {
      for (const p of ANIMALS[key]) {
        const s = p.size * scale;
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.style.transform = `rotate(${p.rot}deg)`;
        slot.innerHTML = shapeSVG(p.shape, s, { fill: COLORS[p.color], outline: true });
        layer.appendChild(slot);

        const el = document.createElement('div');
        el.className = 'piece';
        el.style.transform = `rotate(${p.rot}deg)`;
        el.innerHTML = shapeSVG(p.shape, s, { fill: COLORS[p.color] });
        layer.appendChild(el);

        items.push({ ...p, fig, el, slot, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, placed: false, dragging: false });
      }
    });
    wireDrag();
    scatter();
  }

  function wireDrag() {
    for (const it of items) {
      const off = { x: 0, y: 0 };
      it.el.addEventListener('pointerdown', e => {
        if (it.placed) return;
        it.dragging = true;
        try { it.el.setPointerCapture(e.pointerId); } catch {}
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
        if (Math.hypot(it.x - it.tx, it.y - it.ty) < 48 * scale) {
          it.placed = true;
          it.el.classList.add('placed');
          it.slot.classList.add('filled');
          place(it, it.tx, it.ty);
          if (items.every(i => i.placed)) hero.classList.add('armado');
        }
      };
      it.el.addEventListener('pointerup', drop);
      it.el.addEventListener('pointercancel', drop);
    }
  }

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

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      bounds(); targets();
      for (const it of items) place(it, it.placed ? it.tx : Math.min(it.x, W), it.placed ? it.ty : Math.min(it.y, H));
    }, 150);
  });

  build();
  if (!reduced) requestAnimationFrame(tick);
}
