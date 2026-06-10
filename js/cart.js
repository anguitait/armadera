// js/cart.js — lógica pura de carrito, storage inyectado
const KEY = 'armadera_cart';

export function createCart(storage) {
  function read() {
    try { return JSON.parse(storage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(items) { storage.setItem(KEY, JSON.stringify(items)); }

  return {
    items() { return read(); },
    count() { return read().reduce((n, i) => n + i.qty, 0); },
    add(slug, qty = 1) {
      const items = read();
      const line = items.find(i => i.slug === slug);
      if (line) line.qty += qty; else items.push({ slug, qty });
      write(items);
    },
    setQty(slug, qty) {
      let items = read();
      if (qty <= 0) { items = items.filter(i => i.slug !== slug); }
      else { const line = items.find(i => i.slug === slug); if (line) line.qty = qty; }
      write(items);
    },
    remove(slug) { write(read().filter(i => i.slug !== slug)); },
    clear() { storage.removeItem(KEY); },
    detailed(catalog) {
      return read().map(i => {
        const p = catalog.find(c => c.slug === i.slug);
        return { slug: i.slug, nombre: p.nombre, precio: p.precio, qty: i.qty, subtotal: p.precio * i.qty };
      });
    },
    total(catalog) {
      return read().reduce((sum, i) => {
        const p = catalog.find(c => c.slug === i.slug);
        return sum + p.precio * i.qty;
      }, 0);
    },
  };
}
