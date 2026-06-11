// js/render-producto.js · ficha de producto con galería (miniaturas + lightbox) y detalle.
import { getProduct } from './products.js';
import { clp } from './format.js';

const WA = '56965932938'; // +56 9 6593 2938

const lista = (titulo, items) => `
  <div class="spec-block">
    <h3>${titulo}</h3>
    <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
  </div>`;

const chips = (titulo, items) => `
  <div class="spec-block">
    <h3>${titulo}</h3>
    <div class="chips">${items.map(i => `<span class="chip">${i}</span>`).join('')}</div>
  </div>`;

function acciones(p) {
  if (p.consultar) {
    const msg = encodeURIComponent(`Hola Armadera, quiero consultar el precio y disponibilidad de "${p.nombre}".`);
    return `<a class="btn btn-wood" href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`;
  }
  if (!p.stock) return `<p class="out-of-stock">Fuera de stock</p>`;
  return `
    <div class="qty"><label for="qty-${p.slug}">Cantidad</label>
      <input type="number" id="qty-${p.slug}" value="1" min="1"></div>
    <button class="btn btn-wood" data-add-to-cart="${p.slug}">Agregar al carrito</button>`;
}

export function renderProducto() {
  const cont = document.getElementById('ficha');
  if (!cont) return;
  const slug = new URLSearchParams(location.search).get('slug');
  const p = getProduct(slug);
  if (!p) {
    cont.innerHTML = `<div class="notice"><h1>Producto no encontrado</h1><p><a class="btn" href="/tienda.html">Volver a la tienda</a></p></div>`;
    return;
  }
  document.title = `${p.nombre} · Armadera`;
  const imgs = p.imagenes;
  const fallback = "this.onerror=null;this.src='/img/productos/placeholder.svg'";

  cont.innerHTML = `
    <nav class="crumbs"><a href="/tienda.html">← Volver a la tienda</a></nav>
    <div class="product">
      <div class="gallery">
        <button class="gallery-main" id="gmain-btn" aria-label="Ampliar imagen">
          <img id="gmain" src="${imgs[0]}" alt="${p.nombre}" onerror="${fallback}">
        </button>
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((src, i) =>
          `<button class="thumb${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Ver imagen ${i + 1}"><img src="${src}" alt="" onerror="${fallback}"></button>`
        ).join('')}</div>` : ''}
      </div>
      <div class="info">
        <h1>${p.nombre}</h1>
        <div class="price">${p.consultar ? 'Consultar precio' : clp(p.precio)}</div>
        <div class="age">${p.edad}</div>
        <p class="lead">${p.descripcion}</p>
        ${lista('Incluye', p.incluye)}
        ${chips('Favorece', p.favorece)}
        ${p.medidas ? `<p class="spec"><strong>Medidas:</strong> ${p.medidas}</p>` : ''}
        <p class="spec"><strong>Materiales:</strong> ${p.materiales}</p>
        ${acciones(p)}
        <p class="made-note">🪵 Hecho a mano a pedido · coordinamos el despacho contigo</p>
      </div>
    </div>`;

  setupGallery(imgs, p.nombre, fallback);
}

function setupGallery(imgs, nombre, fallback) {
  let idx = 0;
  const main = document.getElementById('gmain');
  const thumbs = [...document.querySelectorAll('.thumb')];

  function show(i) {
    idx = (i + imgs.length) % imgs.length;
    main.src = imgs[idx];
    thumbs.forEach((t, j) => t.classList.toggle('active', j === idx));
    const lb = document.getElementById('lightbox');
    if (lb) lb.querySelector('img').src = imgs[idx];
  }
  thumbs.forEach(t => t.addEventListener('click', () => show(Number(t.dataset.i))));

  // Lightbox (ampliar a pantalla completa)
  const lb = document.createElement('div');
  lb.className = 'lightbox'; lb.id = 'lightbox'; lb.hidden = true;
  lb.innerHTML = `
    <button class="lb-close" aria-label="Cerrar">✕</button>
    ${imgs.length > 1 ? '<button class="lb-prev" aria-label="Anterior">‹</button>' : ''}
    <img src="${imgs[0]}" alt="${nombre}" onerror="${fallback}">
    ${imgs.length > 1 ? '<button class="lb-next" aria-label="Siguiente">›</button>' : ''}`;
  document.body.appendChild(lb);

  const open = () => { lb.querySelector('img').src = imgs[idx]; lb.hidden = false; document.body.style.overflow = 'hidden'; };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
  document.getElementById('gmain-btn').addEventListener('click', open);
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  lb.querySelector('.lb-prev')?.addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb-next')?.addEventListener('click', () => show(idx + 1));
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
}
