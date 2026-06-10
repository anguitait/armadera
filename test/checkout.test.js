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
