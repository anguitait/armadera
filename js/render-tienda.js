// js/render-tienda.js — pinta la grilla completa
import { products } from './products.js';
import { clp } from './format.js';

export function renderTienda() {
  const cont = document.getElementById('grilla');
  if (!cont) return;
  cont.innerHTML = products.map(p => `
    <article class="card-product">
      <a class="cover" href="/producto.html?slug=${p.slug}"><img src="${p.imagenes[0]}" alt="${p.nombre}" onerror="this.src='/img/productos/placeholder.svg'"></a>
      <div class="body">
        <h3><a href="/producto.html?slug=${p.slug}">${p.nombre}</a></h3>
        <div class="age">${p.edad}</div>
        <div class="price">${clp(p.precio)}</div>
        ${p.stock
          ? `<button class="btn" data-add-to-cart="${p.slug}">Agregar</button>`
          : `<span class="out-of-stock">Fuera de stock</span>`}
      </div>
    </article>`).join('');
}
