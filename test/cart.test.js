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
