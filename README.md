# laSADCUM

La web de la compañía laSADCUM, con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)): blanco, una sola letra y un solo
tamaño, listas de fecha + enlace y la marca partida en colores (billwurtz.com).

**Lo que edita laSADCUM: [GUIA.md](GUIA.md).**

- `data/`: `site.json` (treballs en dos listas, con las partes que van dentro de otro proyecto;
  el menú, las redes, la newsletter), `about.json`, `agenda.json`, `guillem.json` (su CV, en
  `about/guillem/`) y `blog-ejemplo.json` (los posts que se ven donde no hay Worker: la vista
  previa y la copia de github.io).
- `projects/<carpeta>/project.json` + `img/1.webp…`; `schema/`, un esquema por fichero (`blog.json`
  es la copia del blog, `blog-ejemplo.json` los de ejemplo).
- `assets/navicon.png`: el 🫵 de [Noto Emoji](https://github.com/googlefonts/noto-emoji) (Google,
  Apache 2.0), en PNG de 180 px: como emoji en texto, los sistemas de antes de 2021 no lo tienen.
- `build/paginas.mjs` (la plantilla), `build/build.mjs` (→ `dist/`), `build/preview.mjs` (Live
  Server, con el `index.html` de la raíz).
- `worker/index.mjs`: el blog. Cloudflare sirve `dist/` y solo pasan por el Worker `/blog/`, el
  about (su foto al azar), `/admin/`, `/api/*` y `/media/*` (`wrangler.jsonc`). Posts en
  D1, fotos en R2, la contraseña en el secreto `PASSWORD`. Probarlo en local: un `.dev.vars` con
  `PASSWORD=…` y `npx wrangler@4 dev`. La foto se comprime en el navegador (webp ≤ 2000 px, q85)
  con el conversor de imgToWeb, que `js/admin.js` carga de
  `meowrhino.github.io/imgToWeb/js/converter.js`: aquí no hay copia, lo que cambie allí llega
  solo, y si imgToWeb cambia de dirección hay que cambiarla en `admin.js`. Hace webp también en
  Safari y el iPhone.
- **La copia del blog**, para que nada se quede solo en Cloudflare: cada domingo (05:00 UTC, como
  profilepics) `.github/workflows/copia.yml` corre `tools/copia.mjs`, que baja de la web
  `data/blog.json` (`date`, `text` en párrafos, `photo`) y las fotos a
  `assets/img/blog/<año>/<mes>/<uuid>.webp` (la clave de R2; las tres primeras, `.jpg`), y hace commit si algo ha cambiado.
  Sin secretos: lee `/api/posts` y `/media/`, lo mismo que enseña la web, así que lo esborrat
  sale de la copia (y queda en el historial de git). No se publica: el build se salta
  `assets/img/blog/` y no copia `data/`. A mano: `node tools/copia.mjs [web]`.
- Publica: la copia de laSADCUM, Workers Builds en su Cloudflare (`wrangler.jsonc`); la nuestra,
  la Action a `meowrhino.github.io/lasadcum/` (noindex, sin blog de verdad).
