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
