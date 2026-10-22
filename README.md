# laSADCUM, rediseño (fase 1)

Blanco, una sola letra y un solo tamaño (los wireframes de `Desktop/lasadcum/figma test`); listas de
fecha + enlace y la marca partida en colores (billwurtz.com).

- `data/`: `site.json` (treballs en dos listas, propias y otras, y qué partes van dentro de qué proyecto; redes, newsletter), `about.json`, `agenda.json`,
  `guillem.json` (su CV, en `about/guillem/`), `blog-ejemplo.json` (posts de mentira hasta que esté el Worker).
- `blog/` lo verá el público; `admin/` es donde la compañía publica. Solo el diseño: el Worker que
  los hace funcionar está planeado en `manus/blog.md`.
- `projects/<slug>/project.json` + `img/1.webp…`
- `node build.mjs` escribe el HTML aquí mismo: catalán en la raíz, `es/` y `en/`.

Sale de la web de Cargo: todo su contenido (textos, fotos originales, meta) está en
`Desktop/lasadcum/contenido`, y la copia estática que hubo aquí, en el historial (commit `9236363`).
Falta: el email de contacto (no está en la web vieja).
