// js/product-card.js · tarjeta de producto compartida (tienda y home)
import { clp } from './format.js';

export function productCard(p) {
  const url = `/producto.html?slug=${p.slug}`;
  const fallback = "this.onerror=null;this.src='/img/productos/placeholder.svg'";
  const precio = p.consultar ? 'Consultar precio' : clp(p.precio);
  const accion = p.consultar
    ? `<a class="btn" href="${url}">Ver más</a>`
    : p.stock
      ? `<button class="btn" data-add-to-cart="${p.slug}">Agregar</button>`
      : `<span class="out-of-stock">Fuera de stock</span>`;
  return `
    <article class="card-product">
      <a class="cover" href="${url}"><img src="${p.imagenes[0]}" alt="${p.nombre}" onerror="${fallback}"></a>
      <div class="body">
        <h3><a href="${url}">${p.nombre}</a></h3>
        <div class="age">${p.edad}</div>
        <div class="price${p.consultar ? ' price-consultar' : ''}">${precio}</div>
        ${accion}
      </div>
    </article>`;
}
