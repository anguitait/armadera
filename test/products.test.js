// test/products.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products, getProduct } from '../js/products.js';

test('hay 16 productos', () => {
  assert.equal(products.length, 16);
});

test('cada producto tiene los campos requeridos y tipos correctos', () => {
  for (const p of products) {
    assert.ok(typeof p.slug === 'string' && p.slug.length > 0, `slug inválido: ${JSON.stringify(p)}`);
    assert.ok(typeof p.nombre === 'string' && p.nombre.length > 0, `nombre inválido en ${p.slug}`);
    assert.ok(Number.isInteger(p.precio) && p.precio >= 0, `precio inválido en ${p.slug}`);
    assert.ok(typeof p.descripcion === 'string' && p.descripcion.length > 0, `descripcion inválida en ${p.slug}`);
    assert.ok(typeof p.edad === 'string' && p.edad.length > 0, `edad inválida en ${p.slug}`);
    assert.ok(typeof p.materiales === 'string' && p.materiales.length > 0, `materiales inválidos en ${p.slug}`);
    assert.ok(Array.isArray(p.incluye) && p.incluye.length > 0, `incluye inválido en ${p.slug}`);
    assert.ok(Array.isArray(p.favorece) && p.favorece.length > 0, `favorece inválido en ${p.slug}`);
    assert.ok(Array.isArray(p.imagenes) && p.imagenes.length > 0, `imagenes inválidas en ${p.slug}`);
    assert.equal(typeof p.destacado, 'boolean', `destacado inválido en ${p.slug}`);
    assert.equal(typeof p.stock, 'boolean', `stock inválido en ${p.slug}`);
  }
});

test('los productos con precio fijo lo tienen > 0; los de "consultar" tienen precio 0', () => {
  for (const p of products) {
    if (p.consultar) assert.equal(p.precio, 0, `un producto consultar no debería tener precio: ${p.slug}`);
    else assert.ok(p.precio > 0, `precio debería ser > 0 en ${p.slug}`);
  }
});

test('los slugs son únicos', () => {
  const slugs = products.map(p => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('getProduct devuelve el producto correcto o undefined', () => {
  const tipi = getProduct('tipi');
  assert.ok(tipi, 'getProduct debería encontrar "tipi"');
  assert.equal(tipi.nombre, 'Tipi');
  assert.equal(getProduct('no-existe'), undefined);
});

test('hay exactamente 4 destacados', () => {
  assert.equal(products.filter(p => p.destacado).length, 4);
});
