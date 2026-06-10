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

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

export async function handler(req) {
  // Validación del pedido: errores aquí son culpa del cliente (400).
  let preferenceBody;
  try {
    const body = await req.json();
    const backBase = process.env.SITE_URL || new URL(req.url).origin;
    preferenceBody = buildPreference(body?.items, products, backBase);
  } catch (err) {
    return json({ error: err.message }, 400);
  }

  // Creación de la preferencia en Mercado Pago: errores aquí son del
  // procesador (502). No exponemos el detalle interno del SDK al cliente.
  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const pref = await new Preference(client).create({ body: preferenceBody });
    return json({ init_point: pref.init_point }, 200);
  } catch {
    return json({ error: 'No se pudo iniciar el pago. Intenta nuevamente.' }, 502);
  }
}

export default handler;
