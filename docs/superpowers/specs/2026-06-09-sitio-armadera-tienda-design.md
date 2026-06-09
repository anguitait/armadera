# Diseño — Sitio Armadera con tienda y carrito

Fecha: 2026-06-09
Estado: aprobado (pendiente revisión final del usuario)

## Contexto

El sitio original `juegosarmadera.cl` (WordPress + WooCommerce) fue borrado por GoDaddy
por falta de pago y el dominio quedó en manos de un tercero. Se rescató contenido desde
Wayback Machine (ver [rescate/contenido-rescatado.md](../../../rescate/contenido-rescatado.md)).
Se reconstruye bajo el nuevo dominio **armadera.cl**, sin WordPress, manteniendo carrito
de compra.

Armadera es una empresa familiar de Villarrica (Región de la Araucanía) que fabrica juegos
de madera para el desarrollo infantil. Lema: *"Nos haces feliz ver a los niños jugar felices"*.

## Decisiones tomadas

- **Enfoque:** sitio estático + carrito embebido.
- **Pago:** Mercado Pago (Checkout Pro).
- **Construcción:** HTML + CSS + JS a mano (sin framework, sin paso de build para el front),
  manteniendo la estética del `index.html` actual.
- **Hosting:** Netlify (estático + 1 función serverless + Netlify Forms). Dominio repuntado.

## Arquitectura

```
armadera.cl (DNS → Netlify)
│
├── Front estático (HTML/CSS/JS a mano)
│   ├── index.html            Portada: hero + destacados
│   ├── tienda.html           Grilla de productos (render desde products.js)
│   ├── producto.html         Plantilla única de ficha (?slug=…, render desde products.js)
│   ├── sobre-nosotras.html   Historia de la empresa
│   ├── contacto.html         Formulario (Netlify Forms) + datos + Instagram
│   ├── success.html          Retorno OK de Mercado Pago
│   ├── error.html            Retorno fallido de Mercado Pago
│   ├── css/styles.css        CSS compartido (estética actual extendida)
│   └── js/
│       ├── products.js       Datos de los 12 productos (fuente única)
│       ├── cart.js           Lógica de carrito (localStorage) + panel deslizante
│       └── checkout.js       Llama a la función y redirige a Mercado Pago
│
└── netlify/functions/
    └── create-preference.js  Crea la preferencia MP con MP_ACCESS_TOKEN (env var)
```

### Componentes y responsabilidades

- **products.js** — fuente única de verdad del catálogo. Arreglo de objetos:
  `{ slug, nombre, precio, edad, descripcion, imagenes[], stock }`. Editar/agregar un
  producto = editar este archivo. No tiene dependencias.
- **cart.js** — mantiene el carrito en `localStorage`, expone agregar/quitar/actualizar
  cantidad y total, y renderiza el panel deslizante + el contador del ícono. Depende de
  `products.js` para datos de producto.
- **checkout.js** — toma los ítems del carrito, hace POST a `create-preference`, recibe el
  `init_point` y redirige a Mercado Pago. Depende de `cart.js`.
- **producto.html / tienda.html** — leen `products.js` y renderizan en cliente. `producto.html`
  lee `?slug=` del URL y muestra la ficha correspondiente (404 amistoso si no existe).
- **create-preference.js** (Netlify Function) — único punto con secreto. Recibe los ítems,
  valida precios contra una copia del catálogo en el servidor (no confía en el precio que
  manda el cliente), crea la preferencia en Mercado Pago y devuelve `init_point`. Lee
  `MP_ACCESS_TOKEN` desde variable de entorno de Netlify.

## Flujo de compra

1. Usuario navega tienda/ficha → "Agregar al carrito" (`cart.js` guarda en localStorage).
2. Abre el panel del carrito → "Pagar".
3. `checkout.js` → POST `/.netlify/functions/create-preference` con `[{slug, cantidad}]`.
4. La función valida precios contra el catálogo del servidor, crea la preferencia MP con
   `back_urls` a `success.html` / `error.html`, devuelve `init_point`.
5. Redirección al checkout alojado de Mercado Pago.
6. MP devuelve al usuario a `success.html` (limpia el carrito) o `error.html`.

## Datos del catálogo

12 productos (categoría "Juegos"), precios CLP. Todos en stock. Detalle completo en
[rescate/contenido-rescatado.md](../../../rescate/contenido-rescatado.md):
Pájaros Armo Pájaras Pinto ($35.000), Animales del Campo Chileno ($35.000), Sueña con el
Bosque Ideal ($35.000), Acróbatas ($35.000), Multiforma ($160.000), Equilibrio ($60.000),
Tipi ($70.000), Semicírculo ($70.000), Muro de escalada 1.80×1.06 ($270.000), Muro de
escalada 2.20×1.40 ($360.000), Triángulo ($80.000), Rampla ($60.000).

## Contacto

- Villarrica, Región de la Araucanía, Chile (vigente).
- Email: hola@armadera.cl (vigente).
- Teléfonos: +56 9 6593 2938 · +56 9 8548 8233 (vigentes).
- Instagram: @armadera_.

## Estética

Reutiliza el lenguaje visual del `index.html` actual: tipografías Fraunces (titulares) +
Outfit (texto), paleta madera (#c89a5b) / teal (#57bccb) / amarillo (#f5c518) / crema
(#faf4e9), grano de papel, formas geométricas flotantes (eco del logo), tarjetas
redondeadas con sombra suave. Se factoriza a `css/styles.css` compartido.

## Imágenes

Las rescatadas son solo miniaturas (máx. 300×300). Se usan como placeholders temporales;
producción requiere fotos nuevas en alta resolución. `products.js` referencia rutas en
`/img/productos/` para reemplazo trivial.

## Fuera de alcance (v1)

- Blog (existía en el sitio original; se puede agregar después).
- Cuentas de usuario / login.
- Gestión de inventario en tiempo real (stock se edita a mano en `products.js`).
- Cálculo automático de envíos (se coordina por contacto en v1).

## Pendientes operativos (no bloquean el desarrollo)

- Credenciales de Mercado Pago: se cargan más adelante como env var en Netlify. Se puede
  verificar el flujo antes con credenciales de prueba (sandbox) de MP.
- Fotos en alta resolución de los productos.
- Repuntar DNS de armadera.cl a Netlify al momento de publicar.

## Estrategia de pruebas

- `products.js`: validar que cada producto tiene los campos requeridos y precio numérico.
- `cart.js`: pruebas de agregar/quitar/actualizar cantidad y cálculo de total
  (localStorage mockeado).
- `create-preference.js`: prueba de que rechaza precios manipulados por el cliente y arma
  el payload de preferencia correcto (cliente MP mockeado).
- Verificación manual del flujo completo con credenciales sandbox de MP antes de publicar.
