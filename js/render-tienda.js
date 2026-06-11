// js/render-tienda.js — pinta la grilla completa
import { products } from './products.js';
import { productCard } from './product-card.js';

export function renderTienda() {
  const cont = document.getElementById('grilla');
  if (!cont) return;
  cont.innerHTML = products.map(productCard).join('');
}
