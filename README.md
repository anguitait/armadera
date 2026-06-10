# Armadera — sitio y tienda

Sitio estático (HTML/CSS/JS, sin framework) con carrito de compra y checkout vía
Mercado Pago, desplegado en Netlify. Reconstrucción del antiguo `juegosarmadera.cl`
(WordPress) bajo el nuevo dominio **armadera.cl**.

## Estructura

- Páginas: `index.html`, `tienda.html`, `producto.html`, `sobre-nosotras.html`,
  `contacto.html`, `success.html`, `error.html`.
- Lógica (módulos ES, testeada en Node): `js/products.js` (catálogo, fuente única),
  `js/cart.js` (carrito + localStorage), `js/checkout.js` (inicia el pago),
  `js/cart-ui.js` (panel deslizante), `js/layout.js` (header/footer),
  `js/render-*.js` (pintan portada/tienda/ficha).
- Función serverless: `netlify/functions/create-preference.js` (crea la preferencia
  de Mercado Pago; recalcula precios desde el catálogo, nunca confía en el cliente).

## Desarrollo local

    npm install
    cp .env.example .env    # poner tus credenciales TEST de Mercado Pago
    npm run dev             # netlify dev: sitio + función en http://localhost:8888

Solo el front (sin la función), basta un servidor estático:

    python3 -m http.server 8000

## Tests

    npm test     # node --test: products, cart, checkout, create-preference

## Editar el catálogo

Todo el catálogo está en `js/products.js`. Agregar/editar un producto = editar ese
archivo. Las fotos van en `img/productos/<slug>.jpg`; mientras no existan se muestra
`img/productos/placeholder.svg` automáticamente.

## Despliegue (Netlify)

1. Conectar el repo a Netlify (publish dir `.`, functions `netlify/functions`).
2. En Site settings → Environment variables, definir `MP_ACCESS_TOKEN` (producción) y
   `SITE_URL=https://armadera.cl`.
3. Apuntar el DNS de armadera.cl a Netlify.
4. Los envíos del formulario de contacto aparecen en Netlify → Forms.

## Pendientes operativos

- Cargar credenciales de producción de Mercado Pago (hasta entonces, el botón "Pagar"
  no completa el checkout; el resto del sitio funciona).
- Verificar el flujo de pago end-to-end con credenciales TEST de Mercado Pago vía
  `npm run dev` antes de publicar.
- Subir fotos reales de los productos (las rescatadas eran solo miniaturas de 300×300).

## Nota sobre `netlify-cli` y Node

`netlify-cli` puede tener problemas de compatibilidad con versiones muy nuevas de Node
(p. ej. Node 25). Si `npm run dev` falla localmente, usar Node 22 LTS. Esto no afecta
ni a `npm test` ni al despliegue en Netlify (que usa su propio runtime).
