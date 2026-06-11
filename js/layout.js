// js/layout.js · header y footer compartidos
function headerHTML() {
  return `
  <div class="container">
    <a class="logo" href="/index.html"><img src="/cropped-logo-color-2-01-2.png" alt="Armadera"></a>
    <nav class="site-nav">
      <a href="/index.html">Inicio</a>
      <a href="/tienda.html">Tienda</a>
      <a href="/sobre-nosotras.html">Sobre Nosotras</a>
      <a href="/contacto.html">Contacto</a>
      <button class="cart-btn" id="cart-open" aria-label="Abrir carrito">🛒<span class="cart-badge" id="cart-badge">0</span></button>
    </nav>
  </div>`;
}
function footerHTML() {
  return `
  <div class="container">
    <div><strong>Armadera</strong><br>Villarrica, Región de la Araucanía, Chile</div>
    <div>
      <a href="mailto:hola@armadera.cl">hola@armadera.cl</a><br>
      +56 9 6593 2938 · +56 9 8548 8233<br>
      <a href="https://www.instagram.com/armadera_/" target="_blank" rel="noopener">@armadera_</a>
    </div>
  </div>`;
}
export function mountLayout() {
  const h = document.getElementById('site-header');
  const f = document.getElementById('site-footer');
  if (h) { h.className = 'site-header'; h.innerHTML = headerHTML(); }
  if (f) { f.className = 'site-footer'; f.innerHTML = footerHTML(); }
}
