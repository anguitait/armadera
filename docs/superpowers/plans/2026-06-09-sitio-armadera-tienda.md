# Sitio Armadera con Tienda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir el sitio de Armadera como sitio estático (HTML/CSS/JS a mano) con catálogo de 12 productos, carrito de compra y checkout vía Mercado Pago, desplegable en Netlify.

**Architecture:** Front estático multipágina. La lógica (catálogo, carrito, checkout) vive en módulos ES con inyección de dependencias para poder testearla en Node sin navegador. El único secreto (token de Mercado Pago) vive en una función serverless de Netlify que valida precios contra el catálogo y crea la preferencia de pago. `js/products.js` es la fuente única de verdad, compartida entre front y función.

**Tech Stack:** HTML5, CSS3, JavaScript ES Modules (sin framework, sin bundler para el front), Node.js (test runner `node --test`), Netlify Functions + Netlify Forms, SDK `mercadopago` v2.

**Spec:** [docs/superpowers/specs/2026-06-09-sitio-armadera-tienda-design.md](../specs/2026-06-09-sitio-armadera-tienda-design.md)
**Contenido fuente:** [rescate/contenido-rescatado.md](../../../rescate/contenido-rescatado.md)

---

## Estructura de archivos

```
package.json                         Tooling + deps (mercadopago, netlify-cli)
netlify.toml                         Config de build/funciones/redirects
.gitignore                           (añadir node_modules, .netlify)
js/
  products.js                        Catálogo (fuente única) + getProduct()
  cart.js                            createCart(storage): lógica pura de carrito
  checkout.js                        startCheckout(): POST a la función + redirect
  layout.js                          Inyecta header/nav y footer compartidos
  cart-ui.js                         Panel deslizante + badge + botones agregar
  render-home.js                     Pinta destacados en la portada
  render-tienda.js                   Pinta la grilla de la tienda
  render-producto.js                 Pinta la ficha según ?slug=
css/
  styles.css                         Estilos compartidos (estética de index.html)
netlify/functions/
  create-preference.js               validateItems/buildPreference/handler (MP)
img/productos/
  placeholder.svg                    Imagen temporal mientras llegan fotos reales
index.html                           Portada
tienda.html                          Grilla de productos
producto.html                        Plantilla de ficha (?slug=)
sobre-nosotras.html                  Historia de la empresa
contacto.html                        Formulario (Netlify Forms) + datos
success.html                         Retorno OK de Mercado Pago
error.html                           Retorno fallido de Mercado Pago
test/
  products.test.js
  cart.test.js
  checkout.test.js
  create-preference.test.js
```

**Convenciones de interfaz (se respetan en todas las tareas):**
- `products.js` exporta `export const products = [...]` y `export function getProduct(slug)`.
  Cada producto: `{ slug, nombre, precio, edad, descripcion, imagenes: [string], destacado: boolean, stock: boolean }`. `precio` es entero CLP (sin decimales).
- `cart.js` exporta `export function createCart(storage)` con clave de storage `'armadera_cart'`. El carrito guarda `[{ slug, qty }]`. Métodos: `items()`, `add(slug, qty=1)`, `remove(slug)`, `setQty(slug, qty)`, `clear()`, `count()`, `detailed(catalog)`, `total(catalog)`.
- `checkout.js` exporta `export async function startCheckout(items, deps)` donde `deps = { fetchImpl, endpoint, redirect }`.
- `create-preference.js` exporta `validateItems(items, catalog)`, `buildPreference(items, catalog, backBase)` y `handler(req)`.

---

### Task 1: Scaffolding del proyecto y tooling

**Files:**
- Create: `package.json`
- Create: `netlify.toml`
- Modify: `.gitignore`
- Create: `test/.gitkeep`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "armadera",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test test/",
    "dev": "netlify dev"
  },
  "dependencies": {
    "mercadopago": "^2.0.15"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
```

- [ ] **Step 2: Crear `netlify.toml`**

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/.netlify/functions/*"
  status = 200
```

- [ ] **Step 3: Añadir a `.gitignore`**

Añadir estas líneas al final del `.gitignore` existente:

```
node_modules/
.netlify/
```

- [ ] **Step 4: Crear `test/.gitkeep`** (archivo vacío, para versionar la carpeta)

- [ ] **Step 5: Instalar dependencias y verificar el runner**

Run: `npm install && node --test test/`
Expected: instala sin errores; `node --test` imprime `tests 0 ... pass 0` (no hay tests aún, sale con código 0).

- [ ] **Step 6: Commit**

```bash
git add package.json netlify.toml .gitignore test/.gitkeep package-lock.json
git commit -m "chore: scaffolding del proyecto y tooling de test"
```

---

### Task 2: Catálogo de productos (fuente única)

**Files:**
- Create: `js/products.js`
- Test: `test/products.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
// test/products.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products, getProduct } from '../js/products.js';

test('hay 12 productos', () => {
  assert.equal(products.length, 12);
});

test('cada producto tiene los campos requeridos y tipos correctos', () => {
  for (const p of products) {
    assert.ok(typeof p.slug === 'string' && p.slug.length > 0, `slug inválido: ${JSON.stringify(p)}`);
    assert.ok(typeof p.nombre === 'string' && p.nombre.length > 0, `nombre inválido en ${p.slug}`);
    assert.ok(Number.isInteger(p.precio) && p.precio > 0, `precio inválido en ${p.slug}`);
    assert.ok(typeof p.descripcion === 'string' && p.descripcion.length > 0, `descripcion inválida en ${p.slug}`);
    assert.ok(Array.isArray(p.imagenes) && p.imagenes.length > 0, `imagenes inválidas en ${p.slug}`);
    assert.equal(typeof p.destacado, 'boolean', `destacado inválido en ${p.slug}`);
    assert.equal(typeof p.stock, 'boolean', `stock inválido en ${p.slug}`);
  }
});

test('los slugs son únicos', () => {
  const slugs = products.map(p => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('getProduct devuelve el producto correcto o undefined', () => {
  assert.equal(getProduct('tipi').nombre, 'Tipi');
  assert.equal(getProduct('no-existe'), undefined);
});

test('hay exactamente 4 destacados', () => {
  assert.equal(products.filter(p => p.destacado).length, 4);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test test/products.test.js`
Expected: FAIL — `Cannot find module '../js/products.js'`.

- [ ] **Step 3: Crear `js/products.js` con el catálogo real**

```javascript
// js/products.js — fuente única de verdad del catálogo
export const products = [
  { slug: 'pajaros-armo-pajaras-pinto', nombre: 'Pájaros Armo, Pájaras Pinto', precio: 35000, edad: 'Desde 3 años',
    descripcion: 'Pájaros autóctonos de las distintas zonas del país para pintar. Contiene mapa de ubicación y témperas para colorear.',
    imagenes: ['/img/productos/pajaros-armo-pajaras-pinto.jpg'], destacado: true, stock: true },
  { slug: 'animales-campo-chileno', nombre: 'Animales del Campo Chileno', precio: 35000, edad: 'Desde 6 meses',
    descripcion: '13 figuritas con distintos modelos de animales para una estimulación temprana.',
    imagenes: ['/img/productos/animales-campo-chileno.jpg'], destacado: true, stock: true },
  { slug: 'suena-con-el-bosque-ideal', nombre: 'Sueña con el Bosque Ideal', precio: 35000, edad: 'Desde 3 años',
    descripcion: 'Juego que desafía a los niños a aprender y a querer su entorno y naturaleza.',
    imagenes: ['/img/productos/suena-con-el-bosque-ideal.jpg'], destacado: true, stock: true },
  { slug: 'acrobatas', nombre: 'Acróbatas', precio: 35000, edad: 'Desde 12 meses',
    descripcion: 'Este juego desafía el equilibrio y la creatividad.',
    imagenes: ['/img/productos/acrobatas.jpg'], destacado: true, stock: true },
  { slug: 'multiforma', nombre: 'Multiforma', precio: 160000, edad: 'Desde 1 año',
    descripcion: 'Este fabuloso juego propone una estructura de aventura para niñas y niños. Está compuesto de 3 partes: rampla, semicírculo y triángulo.',
    imagenes: ['/img/productos/multiforma.jpg'], destacado: false, stock: true },
  { slug: 'equilibrio', nombre: 'Equilibrio', precio: 60000, edad: 'Desde 12 meses',
    descripcion: 'Favorece el sistema neuromuscular, aumenta la estabilidad del cuerpo, mejora la fuerza de los músculos, aumenta el potencial y rendimiento.',
    imagenes: ['/img/productos/equilibrio.jpg'], destacado: false, stock: true },
  { slug: 'tipi', nombre: 'Tipi', precio: 70000, edad: 'Desde 10 meses',
    descripcion: 'Un versátil refugio para niños y niñas de fácil armado.',
    imagenes: ['/img/productos/tipi.jpg'], destacado: false, stock: true },
  { slug: 'semicirculo', nombre: 'Semicírculo', precio: 70000, edad: 'Desde 12 meses',
    descripcion: 'Este juego es ideal para exploradores y exploradoras.',
    imagenes: ['/img/productos/semicirculo.jpg'], destacado: false, stock: true },
  { slug: 'muro-de-escalada-180', nombre: 'Muro de escalada 1.80 × 1.06 m', precio: 270000, edad: 'Todas las edades',
    descripcion: 'Muro de escalada de 1.80 × 1.06 metros para el desarrollo de la motricidad y la confianza.',
    imagenes: ['/img/productos/muro-de-escalada-180.jpg'], destacado: false, stock: true },
  { slug: 'muro-de-escalada-220', nombre: 'Muro de escalada 2.20 × 1.40 m', precio: 360000, edad: 'Todas las edades',
    descripcion: 'Muro de escalada de 2.20 × 1.40 metros, versión grande para el desarrollo de la motricidad y la confianza.',
    imagenes: ['/img/productos/muro-de-escalada-220.jpg'], destacado: false, stock: true },
  { slug: 'triangulo', nombre: 'Triángulo', precio: 80000, edad: 'Desde 12 meses',
    descripcion: 'Un juego diseñado para escaladores y escaladoras. Práctico para espacios interiores y exteriores.',
    imagenes: ['/img/productos/triangulo.jpg'], destacado: false, stock: true },
  { slug: 'rampla', nombre: 'Rampla', precio: 60000, edad: 'Desde 12 meses',
    descripcion: 'Juego para emplear la destreza que puede ser como muro o resbalín.',
    imagenes: ['/img/productos/rampla.jpg'], destacado: false, stock: true },
];

export function getProduct(slug) {
  return products.find(p => p.slug === slug);
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test test/products.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add js/products.js test/products.test.js
git commit -m "feat: catálogo de productos como fuente única de verdad"
```

---

### Task 3: Lógica del carrito

**Files:**
- Create: `js/cart.js`
- Test: `test/cart.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
// test/cart.test.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCart } from '../js/cart.js';

// storage falso en memoria (mismo contrato que localStorage)
function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

const catalog = [
  { slug: 'tipi', nombre: 'Tipi', precio: 70000 },
  { slug: 'rampla', nombre: 'Rampla', precio: 60000 },
];

let cart;
beforeEach(() => { cart = createCart(fakeStorage()); });

test('empieza vacío', () => {
  assert.deepEqual(cart.items(), []);
  assert.equal(cart.count(), 0);
});

test('add agrega y acumula cantidad', () => {
  cart.add('tipi');
  cart.add('tipi', 2);
  assert.deepEqual(cart.items(), [{ slug: 'tipi', qty: 3 }]);
  assert.equal(cart.count(), 3);
});

test('setQty fija cantidad y 0 elimina', () => {
  cart.add('tipi', 2);
  cart.setQty('tipi', 5);
  assert.equal(cart.items()[0].qty, 5);
  cart.setQty('tipi', 0);
  assert.deepEqual(cart.items(), []);
});

test('remove elimina la línea', () => {
  cart.add('tipi'); cart.add('rampla');
  cart.remove('tipi');
  assert.deepEqual(cart.items(), [{ slug: 'rampla', qty: 1 }]);
});

test('detailed y total usan el catálogo', () => {
  cart.add('tipi', 2); cart.add('rampla', 1);
  assert.deepEqual(cart.detailed(catalog), [
    { slug: 'tipi', nombre: 'Tipi', precio: 70000, qty: 2, subtotal: 140000 },
    { slug: 'rampla', nombre: 'Rampla', precio: 60000, qty: 1, subtotal: 60000 },
  ]);
  assert.equal(cart.total(catalog), 200000);
});

test('persiste en storage entre instancias', () => {
  const storage = fakeStorage();
  const a = createCart(storage);
  a.add('tipi', 2);
  const b = createCart(storage);
  assert.deepEqual(b.items(), [{ slug: 'tipi', qty: 2 }]);
});

test('clear vacía el carrito', () => {
  cart.add('tipi', 2);
  cart.clear();
  assert.deepEqual(cart.items(), []);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test test/cart.test.js`
Expected: FAIL — `Cannot find module '../js/cart.js'`.

- [ ] **Step 3: Crear `js/cart.js`**

```javascript
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test test/cart.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add js/cart.js test/cart.test.js
git commit -m "feat: lógica de carrito con persistencia en storage"
```

---

### Task 4: Cliente de checkout

**Files:**
- Create: `js/checkout.js`
- Test: `test/checkout.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
// test/checkout.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startCheckout } from '../js/checkout.js';

test('postea los items y redirige al init_point', async () => {
  let postedUrl, postedBody, redirected;
  const fetchImpl = async (url, opts) => {
    postedUrl = url; postedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ init_point: 'https://mp/checkout/123' }) };
  };
  const items = [{ slug: 'tipi', qty: 2 }];
  const result = await startCheckout(items, {
    fetchImpl,
    endpoint: '/.netlify/functions/create-preference',
    redirect: url => { redirected = url; },
  });
  assert.equal(postedUrl, '/.netlify/functions/create-preference');
  assert.deepEqual(postedBody, { items });
  assert.equal(redirected, 'https://mp/checkout/123');
  assert.equal(result, 'https://mp/checkout/123');
});

test('lanza error si la respuesta no es ok', async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({ error: 'boom' }) });
  await assert.rejects(
    () => startCheckout([{ slug: 'tipi', qty: 1 }], { fetchImpl, endpoint: '/x', redirect: () => {} }),
    /No se pudo iniciar el pago/,
  );
});

test('lanza error si el carrito está vacío', async () => {
  await assert.rejects(
    () => startCheckout([], { fetchImpl: async () => ({}), endpoint: '/x', redirect: () => {} }),
    /carrito está vacío/,
  );
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test test/checkout.test.js`
Expected: FAIL — `Cannot find module '../js/checkout.js'`.

- [ ] **Step 3: Crear `js/checkout.js`**

```javascript
// js/checkout.js — inicia el pago contra la función serverless
export async function startCheckout(items, deps) {
  const { fetchImpl = fetch, endpoint = '/.netlify/functions/create-preference', redirect } = deps || {};
  if (!items || items.length === 0) throw new Error('El carrito está vacío.');

  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('No se pudo iniciar el pago. Intenta de nuevo.');

  const data = await res.json();
  if (!data.init_point) throw new Error('No se pudo iniciar el pago. Intenta de nuevo.');
  redirect(data.init_point);
  return data.init_point;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test test/checkout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add js/checkout.js test/checkout.test.js
git commit -m "feat: cliente de checkout que inicia el pago de Mercado Pago"
```

---

### Task 5: Función serverless de Mercado Pago

**Files:**
- Create: `netlify/functions/create-preference.js`
- Test: `test/create-preference.test.js`

La función NO confía en el precio que manda el cliente: recalcula todo contra `products.js`.

- [ ] **Step 1: Escribir el test que falla**

```javascript
// test/create-preference.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateItems, buildPreference } from '../netlify/functions/create-preference.js';

const catalog = [
  { slug: 'tipi', nombre: 'Tipi', precio: 70000 },
  { slug: 'rampla', nombre: 'Rampla', precio: 60000 },
];

test('validateItems normaliza usando precios del catálogo, no del cliente', () => {
  const result = validateItems([{ slug: 'tipi', qty: 2, precio: 1 }], catalog);
  assert.deepEqual(result, [{ slug: 'tipi', nombre: 'Tipi', precio: 70000, qty: 2 }]);
});

test('validateItems rechaza slug inexistente', () => {
  assert.throws(() => validateItems([{ slug: 'fantasma', qty: 1 }], catalog), /Producto no encontrado/);
});

test('validateItems rechaza cantidad inválida', () => {
  assert.throws(() => validateItems([{ slug: 'tipi', qty: 0 }], catalog), /Cantidad inválida/);
  assert.throws(() => validateItems([{ slug: 'tipi', qty: -3 }], catalog), /Cantidad inválida/);
  assert.throws(() => validateItems([{ slug: 'tipi', qty: 1.5 }], catalog), /Cantidad inválida/);
});

test('validateItems rechaza carrito vacío', () => {
  assert.throws(() => validateItems([], catalog), /carrito vacío/i);
});

test('buildPreference arma el payload de Mercado Pago en CLP', () => {
  const pref = buildPreference([{ slug: 'tipi', qty: 2 }], catalog, 'https://armadera.cl');
  assert.deepEqual(pref.items, [
    { id: 'tipi', title: 'Tipi', quantity: 2, unit_price: 70000, currency_id: 'CLP' },
  ]);
  assert.equal(pref.back_urls.success, 'https://armadera.cl/success.html');
  assert.equal(pref.back_urls.failure, 'https://armadera.cl/error.html');
  assert.equal(pref.auto_return, 'approved');
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test test/create-preference.test.js`
Expected: FAIL — `Cannot find module '../netlify/functions/create-preference.js'`.

- [ ] **Step 3: Crear `netlify/functions/create-preference.js`**

```javascript
// netlify/functions/create-preference.js
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { products } from '../../js/products.js';

export function validateItems(items, catalog) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('El carrito vacío no se puede pagar.');
  return items.map(i => {
    const p = catalog.find(c => c.slug === i.slug);
    if (!p) throw new Error(`Producto no encontrado: ${i.slug}`);
    if (!Number.isInteger(i.qty) || i.qty <= 0) throw new Error(`Cantidad inválida para ${i.slug}`);
    return { slug: p.slug, nombre: p.nombre, precio: p.precio, qty: i.qty };
  });
}

export function buildPreference(items, catalog, backBase) {
  const lines = validateItems(items, catalog);
  return {
    items: lines.map(l => ({
      id: l.slug, title: l.nombre, quantity: l.qty, unit_price: l.precio, currency_id: 'CLP',
    })),
    back_urls: {
      success: `${backBase}/success.html`,
      failure: `${backBase}/error.html`,
      pending: `${backBase}/success.html`,
    },
    auto_return: 'approved',
  };
}

export async function handler(req) {
  try {
    const body = await req.json();
    const backBase = process.env.SITE_URL || new URL(req.url).origin;
    const preferenceBody = buildPreference(body.items, products, backBase);

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const pref = await new Preference(client).create({ body: preferenceBody });

    return new Response(JSON.stringify({ init_point: pref.init_point }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default handler;
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test test/create-preference.test.js`
Expected: PASS (5 tests). (`validateItems`/`buildPreference` no tocan la red ni el SDK.)

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: PASS (todos los tests de products/cart/checkout/create-preference).

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/create-preference.js test/create-preference.test.js
git commit -m "feat: función serverless que crea la preferencia de Mercado Pago"
```

---

### Task 6: Estilos compartidos

**Files:**
- Create: `css/styles.css`

CSS no se testea con unit tests; se verifica visualmente en tareas posteriores. Extrae la estética del `index.html` actual (paleta, tipografías, grano, tarjetas) a un stylesheet reutilizable.

- [ ] **Step 1: Crear `css/styles.css`**

```css
/* css/styles.css — lenguaje visual de Armadera */
:root{
  --wood:#c89a5b; --wood-deep:#a9763a; --teal:#57bccb; --teal-deep:#3a9aa9;
  --yellow:#f5c518; --ink:#3a3a3a; --ink-soft:#6b6258;
  --cream:#faf4e9; --cream-deep:#f1e6d2; --paper:#fffdf8;
}
*{ margin:0; padding:0; box-sizing:border-box; }
html{ scroll-behavior:smooth; }
body{
  font-family:'Outfit',sans-serif; color:var(--ink);
  background:linear-gradient(160deg,var(--cream) 0%,var(--cream-deep) 100%);
  min-height:100vh; line-height:1.6;
}
h1,h2,h3{ font-family:'Fraunces',serif; font-optical-sizing:auto; letter-spacing:-.015em; line-height:1.1; }
a{ color:var(--teal-deep); }
img{ max-width:100%; display:block; }
.container{ width:min(1100px,92%); margin:0 auto; }

/* Header / nav */
.site-header{ background:var(--paper); border-bottom:1px solid rgba(200,154,91,.25); position:sticky; top:0; z-index:50; }
.site-header .container{ display:flex; align-items:center; justify-content:space-between; padding:.8rem 0; }
.site-header .logo img{ height:42px; }
.site-nav{ display:flex; gap:1.4rem; align-items:center; }
.site-nav a{ text-decoration:none; color:var(--ink); font-weight:500; }
.site-nav a:hover{ color:var(--teal-deep); }
.cart-btn{ position:relative; background:none; border:none; cursor:pointer; font-size:1.4rem; }
.cart-badge{ position:absolute; top:-8px; right:-10px; background:var(--yellow); color:var(--ink);
  font-size:.7rem; font-weight:600; min-width:18px; height:18px; border-radius:9px; display:grid; place-items:center; padding:0 4px; }

/* Hero */
.hero{ text-align:center; padding:clamp(3rem,8vw,6rem) 0; }
.hero h1{ font-size:clamp(2.2rem,6vw,3.6rem); color:var(--ink); margin-bottom:1rem; }
.hero p{ color:var(--ink-soft); max-width:46ch; margin:0 auto 2rem; font-size:1.15rem; }
.btn{ display:inline-block; background:var(--teal); color:#fff; text-decoration:none; font-weight:600;
  padding:.8rem 1.6rem; border-radius:100px; border:none; cursor:pointer; transition:background .2s; }
.btn:hover{ background:var(--teal-deep); }
.btn-wood{ background:var(--wood); } .btn-wood:hover{ background:var(--wood-deep); }

/* Section titles */
.section{ padding:clamp(2rem,5vw,3.5rem) 0; }
.section h2{ font-size:clamp(1.6rem,4vw,2.4rem); margin-bottom:1.5rem; color:var(--ink); }

/* Product grid */
.grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:1.6rem; }
.card-product{ background:var(--paper); border:1px solid rgba(200,154,91,.25); border-radius:20px; overflow:hidden;
  display:flex; flex-direction:column; box-shadow:0 14px 30px -22px rgba(120,90,40,.5); transition:transform .2s; }
.card-product:hover{ transform:translateY(-4px); }
.card-product a.cover{ display:block; aspect-ratio:1; background:var(--cream-deep); }
.card-product .body{ padding:1rem 1.1rem 1.2rem; display:flex; flex-direction:column; gap:.4rem; flex:1; }
.card-product h3{ font-size:1.1rem; }
.card-product h3 a{ text-decoration:none; color:var(--ink); }
.card-product .price{ font-weight:600; color:var(--wood-deep); font-size:1.1rem; }
.card-product .age{ font-size:.82rem; color:var(--ink-soft); }
.card-product .btn{ margin-top:auto; text-align:center; }
.out-of-stock{ opacity:.6; font-size:.85rem; color:var(--ink-soft); margin-top:auto; }

/* Product detail */
.product{ display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:start; padding:2.5rem 0; }
.product .gallery img{ border-radius:24px; background:var(--cream-deep); aspect-ratio:1; object-fit:cover; }
.product .info h1{ font-size:clamp(1.8rem,4vw,2.6rem); margin-bottom:.6rem; }
.product .info .price{ font-size:1.6rem; color:var(--wood-deep); font-weight:600; margin:.4rem 0 1rem; }
.product .info .age{ color:var(--ink-soft); margin-bottom:1rem; }
.qty{ display:inline-flex; align-items:center; gap:.6rem; margin:1rem 0; }
.qty input{ width:64px; padding:.5rem; border:1px solid rgba(200,154,91,.4); border-radius:10px; font-size:1rem; text-align:center; }
@media(max-width:720px){ .product{ grid-template-columns:1fr; } }

/* Cart slide-over */
.cart-overlay{ position:fixed; inset:0; background:rgba(58,58,58,.35); opacity:0; pointer-events:none; transition:opacity .25s; z-index:60; }
.cart-overlay.open{ opacity:1; pointer-events:auto; }
.cart-panel{ position:fixed; top:0; right:0; height:100%; width:min(380px,90%); background:var(--paper);
  box-shadow:-20px 0 60px -30px rgba(58,58,58,.5); transform:translateX(100%); transition:transform .25s; z-index:70;
  display:flex; flex-direction:column; }
.cart-panel.open{ transform:none; }
.cart-panel header{ display:flex; justify-content:space-between; align-items:center; padding:1.2rem; border-bottom:1px solid rgba(200,154,91,.25); }
.cart-panel .lines{ flex:1; overflow-y:auto; padding:1rem 1.2rem; display:flex; flex-direction:column; gap:1rem; }
.cart-line{ display:grid; grid-template-columns:1fr auto; gap:.3rem; border-bottom:1px solid rgba(200,154,91,.15); padding-bottom:.8rem; }
.cart-line .name{ font-weight:500; }
.cart-line .meta{ font-size:.85rem; color:var(--ink-soft); display:flex; gap:.6rem; align-items:center; }
.cart-line .remove{ background:none; border:none; color:var(--wood-deep); cursor:pointer; font-size:.8rem; }
.cart-panel footer{ padding:1.2rem; border-top:1px solid rgba(200,154,91,.25); }
.cart-total{ display:flex; justify-content:space-between; font-weight:600; font-size:1.15rem; margin-bottom:1rem; }
.cart-empty{ color:var(--ink-soft); text-align:center; margin-top:2rem; }

/* Forms */
.form{ display:flex; flex-direction:column; gap:1rem; max-width:480px; }
.form label{ display:flex; flex-direction:column; gap:.3rem; font-weight:500; }
.form input,.form textarea{ padding:.7rem; border:1px solid rgba(200,154,91,.4); border-radius:12px; font-family:inherit; font-size:1rem; }

/* Footer */
.site-footer{ background:var(--paper); border-top:1px solid rgba(200,154,91,.25); margin-top:3rem; padding:2.2rem 0; color:var(--ink-soft); }
.site-footer .container{ display:flex; flex-wrap:wrap; gap:1.5rem; justify-content:space-between; }
.site-footer a{ color:var(--teal-deep); text-decoration:none; }

/* States */
.notice{ text-align:center; padding:4rem 0; }
.notice h1{ font-size:2rem; margin-bottom:1rem; }
```

- [ ] **Step 2: Verificación**

Run: `node -e "const c=require('fs').readFileSync('css/styles.css','utf8'); if(!c.includes('--wood')||!c.includes('.cart-panel')) throw new Error('CSS incompleto'); console.log('CSS OK')"`
Expected: imprime `CSS OK`.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: hoja de estilos compartida con la estética de Armadera"
```

---

### Task 7: Header, footer y panel de carrito compartidos (layout)

**Files:**
- Create: `js/layout.js`
- Create: `js/cart-ui.js`
- Create: `img/productos/placeholder.svg`

`layout.js` inyecta header/footer en `#site-header`/`#site-footer`. `cart-ui.js` monta el panel deslizante y conecta los botones `[data-add-to-cart]`. Se prueban a mano en el navegador (Task 13).

- [ ] **Step 1: Crear `img/productos/placeholder.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f1e6d2"/>
  <path d="M170 230l30-40 30 40z" fill="#57bccb"/>
  <rect x="150" y="170" width="22" height="22" rx="5" fill="#c89a5b"/>
  <circle cx="245" cy="180" r="11" fill="#f5c518"/>
  <text x="200" y="300" font-family="sans-serif" font-size="20" fill="#6b6258" text-anchor="middle">Armadera</text>
</svg>
```

- [ ] **Step 2: Crear `js/layout.js`**

```javascript
// js/layout.js — header y footer compartidos
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
```

- [ ] **Step 3: Crear `js/cart-ui.js`**

```javascript
// js/cart-ui.js — panel deslizante + badge + botones agregar al carrito
import { products, getProduct } from './products.js';
import { createCart } from './cart.js';
import { startCheckout } from './checkout.js';

const cart = createCart(window.localStorage);
const clp = n => '$' + n.toLocaleString('es-CL');

function ensurePanel() {
  if (document.getElementById('cart-panel')) return;
  const overlay = document.createElement('div');
  overlay.className = 'cart-overlay'; overlay.id = 'cart-overlay';
  const panel = document.createElement('aside');
  panel.className = 'cart-panel'; panel.id = 'cart-panel';
  panel.innerHTML = `
    <header><h3>Tu carrito</h3><button id="cart-close" class="remove" aria-label="Cerrar">Cerrar ✕</button></header>
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
            <button class="remove" data-dec="${l.slug}">−</button>${l.qty}
            <button class="remove" data-inc="${l.slug}">+</button>
            <button class="remove" data-rm="${l.slug}">eliminar</button>
          </div></div>
        <div class="price">${clp(l.subtotal)}</div>
      </div>`).join('');
  }
  const total = document.getElementById('cart-total');
  if (total) total.textContent = clp(cart.total(products));
  lines.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { cart.add(b.dataset.inc); render(); });
  lines.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {
    const cur = cart.items().find(i => i.slug === b.dataset.dec); cart.setQty(b.dataset.dec, cur.qty - 1); render(); });
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
```

- [ ] **Step 4: Verificación de sintaxis**

Run: `node --check js/layout.js && node --check js/cart-ui.js && echo "sintaxis OK"`
Expected: imprime `sintaxis OK`.

- [ ] **Step 5: Commit**

```bash
git add js/layout.js js/cart-ui.js img/productos/placeholder.svg
git commit -m "feat: layout compartido y panel de carrito"
```

---

### Task 8: Portada (index.html)

**Files:**
- Modify: `index.html` (reemplaza la página "en construcción" actual)
- Create: `js/render-home.js`

- [ ] **Step 1: Crear `js/render-home.js`**

```javascript
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
```

- [ ] **Step 2: Reemplazar `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Armadera — Juegos de madera para crecer jugando</title>
<meta name="description" content="Armadera · Juegos de madera fabricados en Villarrica para el desarrollo de niñas y niños.">
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main>
    <section class="hero container">
      <h1>Nos haces feliz ver a los niños jugar felices</h1>
      <p>Juegos de madera fabricados en Villarrica que estimulan la coordinación, la motricidad y la creatividad. 100% biodegradables y amigables con el medioambiente.</p>
      <a class="btn" href="/tienda.html">Ver la tienda</a>
    </section>
    <section class="section container">
      <h2>Productos destacados</h2>
      <div class="grid" id="destacados"></div>
      <p style="margin-top:2rem"><a class="btn btn-wood" href="/tienda.html">Ver todos los productos</a></p>
    </section>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { renderHome } from '/js/render-home.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); renderHome(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificación**

Run: `node --check js/render-home.js && echo OK`
Expected: imprime `OK`. (La verificación visual se hace en Task 13.)

- [ ] **Step 4: Commit**

```bash
git add index.html js/render-home.js
git commit -m "feat: portada con hero y productos destacados"
```

---

### Task 9: Tienda (tienda.html)

**Files:**
- Create: `tienda.html`
- Create: `js/render-tienda.js`

- [ ] **Step 1: Crear `js/render-tienda.js`**

```javascript
// js/render-tienda.js — pinta la grilla completa
import { products } from './products.js';
const clp = n => '$' + n.toLocaleString('es-CL');

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
```

- [ ] **Step 2: Crear `tienda.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tienda — Armadera</title>
<meta name="description" content="Todos los juegos de madera de Armadera.">
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="section container">
    <h2>Tienda</h2>
    <div class="grid" id="grilla"></div>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { renderTienda } from '/js/render-tienda.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); renderTienda(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificación**

Run: `node --check js/render-tienda.js && echo OK`
Expected: imprime `OK`.

- [ ] **Step 4: Commit**

```bash
git add tienda.html js/render-tienda.js
git commit -m "feat: página de tienda con grilla de productos"
```

---

### Task 10: Ficha de producto (producto.html)

**Files:**
- Create: `producto.html`
- Create: `js/render-producto.js`

- [ ] **Step 1: Crear `js/render-producto.js`**

```javascript
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
```

- [ ] **Step 2: Crear `producto.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Producto — Armadera</title>
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="container" id="ficha"></main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { renderProducto } from '/js/render-producto.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); renderProducto(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificación**

Run: `node --check js/render-producto.js && echo OK`
Expected: imprime `OK`.

- [ ] **Step 4: Commit**

```bash
git add producto.html js/render-producto.js
git commit -m "feat: ficha de producto desde plantilla única"
```

---

### Task 11: Sobre Nosotras (sobre-nosotras.html)

**Files:**
- Create: `sobre-nosotras.html`

- [ ] **Step 1: Crear `sobre-nosotras.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sobre Nosotras — Armadera</title>
<meta name="description" content="Armadera, empresa familiar de Villarrica que fabrica juegos de madera.">
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="section container" style="max-width:760px">
    <h2>Sobre Nosotras</h2>
    <p style="margin-bottom:1.2rem">Armadera es una pequeña empresa familiar que nace en Villarrica con el objetivo de aportar en el desarrollo de niños y niñas, a través de juegos entretenidos y fabricados en madera que estimulan la coordinación, motricidad y todas las capacidades físicas.</p>
    <p>Nuestros juegos permiten estimular aptitudes como la concentración, la creatividad, el desarrollo de la personalidad y el carácter. Nuestra principal materia prima es la madera, material 100% biodegradable y amigable con el medioambiente. Además, permite a los niños entrar en conexión con la naturaleza.</p>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add sobre-nosotras.html
git commit -m "feat: página Sobre Nosotras"
```

---

### Task 12: Contacto (contacto.html) con Netlify Forms

**Files:**
- Create: `contacto.html`

El atributo `data-netlify="true"` y el campo oculto `form-name` activan Netlify Forms.

- [ ] **Step 1: Crear `contacto.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contacto — Armadera</title>
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="section container" style="max-width:760px">
    <h2>Contacto</h2>
    <p style="margin-bottom:1.5rem">Villarrica, Región de la Araucanía, Chile · <a href="mailto:hola@armadera.cl">hola@armadera.cl</a><br>
       +56 9 6593 2938 · +56 9 8548 8233 · <a href="https://www.instagram.com/armadera_/" target="_blank" rel="noopener">@armadera_</a></p>
    <form name="contacto" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/success.html" class="form">
      <input type="hidden" name="form-name" value="contacto">
      <p hidden><label>No llenar: <input name="bot-field"></label></p>
      <label>Nombre<input type="text" name="nombre" required></label>
      <label>Correo electrónico<input type="email" name="email" required></label>
      <label>Mensaje<textarea name="mensaje" rows="5" required></textarea></label>
      <button class="btn" type="submit">Enviar</button>
    </form>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add contacto.html
git commit -m "feat: página de contacto con Netlify Forms"
```

---

### Task 13: Páginas de retorno de pago (success / error)

**Files:**
- Create: `success.html`
- Create: `error.html`

`success.html` también limpia el carrito.

- [ ] **Step 1: Crear `success.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>¡Gracias por tu compra! — Armadera</title>
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="notice container">
    <h1>¡Gracias! 🎉</h1>
    <p>Recibimos tu mensaje/compra. Te contactaremos pronto.</p>
    <p style="margin-top:1.5rem"><a class="btn" href="/tienda.html">Seguir mirando</a></p>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { mountCart } from '/js/cart-ui.js';
    import { createCart } from '/js/cart.js';
    createCart(window.localStorage).clear();
    mountLayout(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 2: Crear `error.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pago no completado — Armadera</title>
<link rel="icon" type="image/png" href="/cropped-logo-color-2-01-2.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400..600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header id="site-header"></header>
  <main class="notice container">
    <h1>El pago no se completó</h1>
    <p>No se realizó ningún cobro. Tu carrito sigue guardado, puedes intentarlo de nuevo.</p>
    <p style="margin-top:1.5rem"><a class="btn" href="/tienda.html">Volver a la tienda</a></p>
  </main>
  <footer id="site-footer"></footer>
  <script type="module">
    import { mountLayout } from '/js/layout.js';
    import { mountCart } from '/js/cart-ui.js';
    mountLayout(); mountCart();
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificación visual local de todo el front**

Run (servidor estático simple, sin funciones): `python3 -m http.server 8000`
Luego abrir `http://localhost:8000/` en el navegador y comprobar:
- Portada carga con header, hero, 4 destacados y footer.
- `tienda.html` muestra los 12 productos; "Multiforma" con botón Agregar (en stock).
- Click en "Agregar" abre el panel del carrito y el badge sube.
- En el panel: +, −, eliminar y total funcionan; el total se ve como `$200.000`.
- `producto.html?slug=tipi` muestra la ficha; `?slug=xxx` muestra "Producto no encontrado".
- `sobre-nosotras.html` y `contacto.html` cargan con header/footer.
- Recargar la página mantiene el carrito (localStorage).
Detener con Ctrl+C.

Expected: todo lo anterior se cumple. (El botón "Pagar" todavía fallará sin función/credenciales — se prueba en Task 14.)

- [ ] **Step 4: Commit**

```bash
git add success.html error.html
git commit -m "feat: páginas de retorno de pago y verificación del front"
```

---

### Task 14: Integración y verificación end-to-end con Mercado Pago (sandbox)

**Files:**
- Create: `README.md`
- Create: `.env.example`

Esta tarea conecta todo y documenta el despliegue. Requiere credenciales de PRUEBA de Mercado Pago (sandbox); si aún no están, se completa la parte de docs y se deja la verificación E2E marcada como pendiente operativo.

- [ ] **Step 1: Crear `.env.example`**

```bash
# Copiar a .env (no se versiona) para desarrollo local con `netlify dev`.
# Credenciales de PRUEBA de Mercado Pago (panel de desarrolladores de MP).
MP_ACCESS_TOKEN=TEST-xxxxxxxx
# URL pública del sitio (para back_urls). En local la rellena netlify dev.
SITE_URL=http://localhost:8888
```

- [ ] **Step 2: Crear `README.md`**

```markdown
# Armadera — sitio y tienda

Sitio estático (HTML/CSS/JS) con carrito y checkout vía Mercado Pago, desplegado en Netlify.

## Desarrollo local
```bash
npm install
cp .env.example .env   # y poner tus credenciales TEST de Mercado Pago
npm run dev            # netlify dev: sirve el sitio + la función en http://localhost:8888
```
Sin función (solo front): `python3 -m http.server 8000`.

## Tests
```bash
npm test
```

## Editar el catálogo
Todo el catálogo está en `js/products.js`. Agregar/editar un producto = editar ese archivo.
Las fotos van en `img/productos/<slug>.jpg` (mientras tanto se muestra un placeholder).

## Despliegue (Netlify)
1. Conectar el repo a Netlify (publish dir `.`, functions `netlify/functions`).
2. En Site settings → Environment variables, definir `MP_ACCESS_TOKEN` (producción) y `SITE_URL=https://armadera.cl`.
3. Apuntar el DNS de armadera.cl a Netlify.
4. Los envíos del formulario de contacto aparecen en Netlify → Forms.

## Pendientes operativos
- Cargar credenciales de producción de Mercado Pago.
- Subir fotos reales de los productos.
```

- [ ] **Step 3: Verificación E2E con sandbox** (requiere credenciales TEST de MP)

Run: `npm run dev`
En `http://localhost:8888`: agregar un producto al carrito → "Pagar con Mercado Pago" → debe redirigir al checkout de Mercado Pago (entorno de prueba) sin errores. Completar un pago de prueba y verificar el retorno a `/success.html` con el carrito vacío.
Expected: redirección correcta al checkout de MP y retorno a success. Si no hay credenciales aún, dejar este step sin marcar y anotarlo como pendiente operativo en el README.

- [ ] **Step 4: Commit**

```bash
git add README.md .env.example
git commit -m "docs: README de desarrollo y despliegue + ejemplo de entorno"
```

---

## Notas finales

- **Borrar la página "en construcción":** queda reemplazada por la portada nueva en Task 8. No se requiere acción extra.
- **El carrito sobrevive recargas** vía `localStorage`; `success.html` lo limpia tras una compra.
- **Seguridad de precios:** el cliente nunca define el precio; la función recalcula desde `products.js` (Task 5). No se puede manipular el total desde el navegador.
- **Mover a `main`:** al terminar, usar la skill `superpowers:finishing-a-development-branch` para decidir merge/PR.
