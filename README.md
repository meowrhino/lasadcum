# laSADCUM

La web de la compañía laSADCUM, con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)): blanco, una sola letra y un solo
tamaño, listas de fecha + enlace y la marca partida en colores (billwurtz.com).

- `data/`: `site.json` (treballs en dos listas, con las partes que van dentro de otro proyecto;
  el menú, las redes, la newsletter), `about.json`, `agenda.json`, `guillem.json` (su CV, en
  `about/guillem/`) y `blog-ejemplo.json` (posts de mentira hasta que esté el Worker).
- `projects/<carpeta>/project.json` + `img/1.webp…`; `schema/`, un esquema por tipo.
- `build/paginas.mjs` (la plantilla), `build/build.mjs` (→ `dist/`), `build/preview.mjs` (Live
  Server, con el `index.html` de la raíz).
- Publica: nuestra copia, la Action a `meowrhino.github.io/lasadcum/` (noindex); la suya,
  Workers Builds (`wrangler.jsonc`).
- El blog con Worker, planeado en `manus/blog.md`.

Sale de la web de Cargo: todo su contenido (textos, fotos originales, meta) está en
`Desktop/lasadcum/contenido`, y la copia estática que hubo aquí, en el historial (`9236363`).
Falta: el email de contacto, las fotos de Click Tarola y los textos nuevos en ca y en.

Lo que edita laSADCUM: [GUIA.md](GUIA.md). Si el build falla: [CLAUDE.md](CLAUDE.md).
