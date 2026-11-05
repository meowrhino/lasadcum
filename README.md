# laSADCUM

La web de la compañía laSADCUM, con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)): blanco, una sola letra y un solo
tamaño, listas de fecha + enlace y la marca partida en colores (billwurtz.com).

**Lo que edita laSADCUM: [GUIA.md](GUIA.md).**

- `data/`: `site.json` (treballs en dos listas, con las partes que van dentro de otro proyecto;
  el menú, las redes, la newsletter), `about.json`, `agenda.json`, `guillem.json` (su CV, en
  `about/guillem/`) y `blog-ejemplo.json` (los posts que se ven donde no hay Worker: la vista
  previa y la copia de github.io).
- `projects/<carpeta>/project.json` + `img/1.webp…`; `schema/`, un esquema por tipo.
- `build/paginas.mjs` (la plantilla), `build/build.mjs` (→ `dist/`), `build/preview.mjs` (Live
  Server, con el `index.html` de la raíz).
- `worker/index.mjs`: el blog. Cloudflare sirve `dist/` y solo pasan por el Worker `/blog/`, el
  about (su foto al azar), `/admin/`, `/api/*` y `/media/*` (`wrangler.jsonc`). Posts en
  D1, fotos en R2, la contraseña en el secreto `PASSWORD`. Probarlo en local: un `.dev.vars` con
  `PASSWORD=…` y `npx wrangler@4 dev`.
- Publica: la copia de laSADCUM, Workers Builds en su Cloudflare (`wrangler.jsonc`); la nuestra,
  la Action a `meowrhino.github.io/lasadcum/` (noindex, sin blog de verdad).
