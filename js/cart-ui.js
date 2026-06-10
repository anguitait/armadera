// js/cart-ui.js — panel deslizante + badge + botones agregar al carrito
import { products, getProduct } from './products.js';
import { createCart } from './cart.js';
import { startCheckout } from './checkout.js';
import { clp } from './format.js';

const cart = createCart(window.localStorage);

function ensurePanel() {
  if (document.getElementById('cart-panel')) return;
  const overlay = document.createElement('div');
  overlay.className = 'cart-overlay'; overlay.id = 'cart-overlay';
  const panel = document.createElement('aside');
  panel.className = 'cart-panel'; panel.id = 'cart-panel';
  panel.innerHTML = `
    <header><h3>Tu carrito</h3><button id="cart-close" class="cart-close" aria-label="Cerrar carrito">Cerrar ✕</button></header>
    <div class="lines" id="cart-lines"></div>
    <footer>
      <div class="cart-total"><span>Total</span><span id="cart-total">$0</span></div>
      <button class="btn btn-wood" id="cart-checkout" style="width:100%">Pagar con Mercado Pago</button>
    </footer>`;
  document.body.append(overlay, panel);
  overlay.addEventListener('click', closeCart);
  panel.querySelector('#cart-close').addEventListener('click', closeCart);
  panel.querySelector('#cart-checkout').addEventListener('click', checkout);
}

function render() {
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = cart.count();
  const lines = document.getElementById('cart-lines');
  if (!lines) return;
  const detailed = cart.detailed(products);
  if (detailed.length === 0) { lines.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>'; }
  else {
    lines.innerHTML = detailed.map(l => `
      <div class="cart-line">
        <div><div class="name">${l.nombre}</div>
          <div class="meta">
            <button class="step" data-dec="${l.slug}" aria-label="Quitar uno">−</button>
            <span class="qty-num">${l.qty}</span>
            <button class="step" data-inc="${l.slug}" aria-label="Agregar uno">+</button>
            <button class="link-rm" data-rm="${l.slug}">eliminar</button>
          </div></div>
        <div class="price">${clp(l.subtotal)}</div>
      </div>`).join('');
  }
  const total = document.getElementById('cart-total');
  if (total) total.textContent = clp(cart.total(products));
  lines.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { cart.add(b.dataset.inc); render(); });
  lines.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {
    const cur = cart.items().find(i => i.slug === b.dataset.dec);
    if (!cur) { render(); return; }
    cart.setQty(b.dataset.dec, cur.qty - 1); render(); });
  lines.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { cart.remove(b.dataset.rm); render(); });
}

function openCart() { ensurePanel(); render();
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-panel').classList.add('open'); }
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-panel').classList.remove('open'); }

async function checkout() {
  const btn = document.getElementById('cart-checkout');
  try {
    btn.disabled = true; btn.textContent = 'Redirigiendo…';
    await startCheckout(cart.items(), { redirect: url => { window.location.href = url; } });
  } catch (e) {
    alert(e.message); btn.disabled = false; btn.textContent = 'Pagar con Mercado Pago';
  }
}

export function mountCart() {
  ensurePanel(); render();
  const openBtn = document.getElementById('cart-open');
  if (openBtn) openBtn.addEventListener('click', openCart);
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.addToCart;
      const qtyInput = document.getElementById('qty-' + slug);
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      if (!getProduct(slug)) return;
      cart.add(slug, qty); openCart();
    });
  });
}
