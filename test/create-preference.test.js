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
