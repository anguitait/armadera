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

  let data;
  try { data = await res.json(); }
  catch { throw new Error('No se pudo iniciar el pago. Intenta de nuevo.'); }
  if (!data || !data.init_point) throw new Error('No se pudo iniciar el pago. Intenta de nuevo.');
  redirect(data.init_point);
  return data.init_point;
}
