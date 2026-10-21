# blog de laSADCUM: el plan para el Worker

Lo que falta programar. El diseño ya está hecho (`blog/` y `admin/` salen de `build.mjs`); los
posts que se ven ahora son de ejemplo (`data/blog-ejemplo.json`) y desaparecen cuando el Worker
ponga los de verdad.

## qué es

- La compañía entra en **`/admin/`** con una contraseña, escribe un **texto**, sube una
  **imagen** (opcional) y publica. Puede borrar lo publicado. Nada más: sin títulos, sin
  hashtags, sin vídeo, sin idiomas.
- El público lo ve en **`/blog/`**, una sola página **sin selector de idioma** (desde `/es/` y
  `/en/`, "blog" lleva ahí): fecha en gris + texto + imagen,
  lo más nuevo arriba. Cada post tiene ancla `#p<id>`.

## cómo: el motor de elmundodelasjordis, recortado

Copiar de `~/Documents/GitHub/jordis-twoitter` (Workers + Hono + D1 + R2) y quitar lo que sobra:

| se queda | se va |
| --- | --- |
| `auth.ts` (cookie firmada con HMAC, `requireAuth`), `/login`, `/api/logout` | hashtags, lugar, título |
| subida a R2 + `/r2/<key>` (o `/media/<key>`) | vídeo, ffmpeg.wasm y las cabeceras COOP/COEP |
| `compressor-image.js`: la imagen se pasa a **webp ≤ 2000 px, q85** en el navegador (lo de imgToWeb) | las jordis, `/editar` |
| borrado blando (`deleted_at`) y `/api/export` (copia en JSON) | scroll infinito (con pocos posts, la página entera) |
| rate limit de escritura (`WRITE_LIMITER`) | |

## rutas

| ruta | quién | qué hace |
| --- | --- | --- |
| `GET /blog/` | público | la página estática del build, con los posts **dentro del HTML**: el Worker la pasa por `HTMLRewriter` y rellena `<ol class="posts">` con la misma plantilla que `post()` de `build.mjs` (regla 1: se lee sin JS) |
| `GET /api/posts` | público | JSON de los posts visibles, nuevos primero |
| `GET /media/<key>` | público | la imagen desde R2, `Cache-Control: public, max-age=31536000, immutable` |
| `GET /login`, `POST /api/login` | público | contraseña → cookie de sesión |
| `GET /admin/` | sesión | la página del build (sin sesión → `/login`) |
| `POST /api/posts` | sesión | `multipart/form-data`: `text` + `image` (ya en webp) → R2 + D1 |
| `DELETE /api/posts/:id` | sesión | borrado blando |
| `GET /api/export` | sesión | todo en JSON, de copia |
| el resto | público | los ficheros estáticos de `dist/` (binding `ASSETS`) |

`wrangler.jsonc`: `assets: { directory: "dist", binding: "ASSETS", run_worker_first: ["/blog/*", "/admin/*", "/api/*", "/media/*", "/login"] }`
(solo esas rutas pasan por el Worker; el resto lo sirve Cloudflare directamente). D1 `lasadcum-db`,
R2 `lasadcum-media`, secretos `PASSWORD` y `AUTH_SECRET` con `wrangler secret put`.

## base de datos (D1)

```sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  image_key TEXT,            -- clave en R2, p. ej. 2026/10/<uuid>.webp
  image_width INTEGER,
  image_height INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT            -- NULL = visible
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC, id DESC);
```

Un post en `/api/posts` sale con la forma de `data/blog-ejemplo.json`:
`{ id, created_at, text, image: { src: "/media/<key>", width, height } }`.

## seguridad

- El texto se escapa siempre (la plantilla ya lo hace con `esc()`): nada de HTML del cliente.
- Imagen: solo `image/webp` (o jpeg/png si el navegador no puede comprimir), máx. 5 MB tras comprimir.
- Cookie `HttpOnly; Secure; SameSite=Strict`; login con espera tras fallos.

## hosting (receta, regla 9)

- **Su copia**: Workers Builds en la cuenta de Cloudflare **de laSADCUM** (ya tiene una,
  la del dominio). D1, R2 y secretos, allí; las cuentas son suyas
  desde el principio.
- **Nuestra copia** (`meowrhino.github.io/lasadcum/`): Pages no ejecuta Workers, así
  que el blog enseña los ejemplos (o nada) y `/admin/` no publica. Es solo para ver el diseño.

## pendiente de decidir

- La contraseña: una sola para la compañía (como jordis) o una por persona.
- Si `/admin/` deja **editar** un post además de borrarlo (jordis lo hace).
- Si el blog sale también en la portada (el último post, pequeño).
