// js/render-producto.js — pinta la ficha según ?slug=
import { getProduct } from './products.js';
const clp = n => '$' + n.toLocaleString('es-CL');

export function renderProducto() {
  const cont = document.getElementById('ficha');
  if (!cont) return;
  const slug = new URLSearchParams(location.search).get('slug');
  const p = getProduct(slug);
  if (!p) {
    cont.innerHTML = `<div class="notice"><h1>Producto no encontrado</h1><p><a class="btn" href="/tienda.html">Volver a la tienda</a></p></div>`;
    return;
  }
  document.title = `${p.nombre} — Armadera`;
  cont.innerHTML = `
    <div class="product">
      <div class="gallery"><img src="${p.imagenes[0]}" alt="${p.nombre}" onerror="this.src='/img/productos/placeholder.svg'"></div>
      <div class="info">
        <h1>${p.nombre}</h1>
        <div class="price">${clp(p.precio)}</div>
        <div class="age">${p.edad}</div>
        <p>${p.descripcion}</p>
        ${p.stock ? `
          <div class="qty"><label for="qty-${p.slug}">Cantidad</label>
            <input type="number" id="qty-${p.slug}" value="1" min="1"></div>
          <button class="btn btn-wood" data-add-to-cart="${p.slug}">Agregar al carrito</button>`
          : `<p class="out-of-stock">Fuera de stock</p>`}
      </div>
    </div>`;
}
