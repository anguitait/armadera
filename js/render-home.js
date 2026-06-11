// js/render-home.js · pinta los productos destacados
import { products } from './products.js';
import { productCard } from './product-card.js';

export function renderHome() {
  const cont = document.getElementById('destacados');
  if (!cont) return;
  cont.innerHTML = products.filter(p => p.destacado).map(productCard).join('');
}
