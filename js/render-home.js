// js/render-home.js — pinta los productos destacados
import { products } from './products.js';
const clp = n => '$' + n.toLocaleString('es-CL');

export function renderHome() {
  const cont = document.getElementById('destacados');
  if (!cont) return;
  cont.innerHTML = products.filter(p => p.destacado).map(p => `
    <article class="card-product">
      <a class="cover" href="/producto.html?slug=${p.slug}"><img src="${p.imagenes[0]}" alt="${p.nombre}" onerror="this.src='/img/productos/placeholder.svg'"></a>
      <div class="body">
        <h3><a href="/producto.html?slug=${p.slug}">${p.nombre}</a></h3>
        <div class="age">${p.edad}</div>
        <div class="price">${clp(p.precio)}</div>
        <button class="btn" data-add-to-cart="${p.slug}">Agregar</button>
      </div>
    </article>`).join('');
}
