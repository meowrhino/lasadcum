/* ============================================================
   paginas.mjs — las plantillas de la web de laSADCUM.
   ------------------------------------------------------------
   Todo el HTML sale de aquí, y lo usan dos sitios:

     build/build.mjs    en Node, al publicar: escribe dist/
     build/preview.mjs  en el navegador, con Live Server: pinta
                        la página al vuelo leyendo los JSON

   Por eso este fichero no importa nada ni toca el disco. Lo que
   necesita saber del disco —si una foto existe, cuánto mide— se lo
   pasa quien lo llama. (El modelo: oriol-colomer, JAMstack.)
   ============================================================ */

export const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function leerJSON(texto, nombre) {
  try { return JSON.parse(texto); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    let donde = '';
    const lc = /line (\d+) column (\d+)/.exec(e.message);
    if (lc) donde = ` (linea ${lc[1]}, columna ${lc[2]})`;
    else if (m) {
      const antes = texto.slice(0, +m[1]).split('\n');
      donde = ` (linea ${antes.length}, columna ${antes.at(-1).length + 1})`;
    } else {
      // una coma de mas ("Unexpected token ']'") no trae posicion: se busca la coma
      const coma = /,\s*[\]}]/.exec(texto);
      if (coma) donde = ` (linea ${texto.slice(0, coma.index).split('\n').length}: sobra la coma del final)`;
    }
    const err = new Error(`${nombre} no es un JSON valido${donde}. Suele ser una coma de mas `
      + `o de menos, o unas comillas sin cerrar. Detalle: ${e.message}`);
    err.json = true;
    throw err;
  }
}

/** Lo que dice schema/<tipo>.json, comprobado tambien aqui: lo que VS Code
    subraya en rojo, el build lo para y la vista previa lo ensena. Solo lo que
    usan esos esquemas (type, enum, pattern, required, properties,
    additionalProperties, items, maxItems, minimum, anyOf y $ref a sus $defs):
    cuarenta lineas en vez de una dependencia. Devuelve los errores, en
    castellano, o [] si esta bien. */
export function validar(dato, esquema, fichero) {
  const TIPO = { string: 'un texto entre comillas', number: 'un número', boolean: 'true o false',
                 array: 'una lista [ … ]', object: 'un bloque { … }', null: 'null' };
  const tipo = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  // un $ref lleva a su $defs; lo de al lado (la description) manda
  const def = s => (s.$ref ? { ...esquema.$defs[s.$ref.split('/').pop()], ...s, $ref: undefined } : s);
  const tipoOk = (v, s) => !s.type || [].concat(s.type).includes(tipo(v));
  function mirar(v, s, camino) {
    s = def(s);
    const donde = camino.length ? `"${camino.join(' → ')}"` : 'el fichero';
    const pista = s.description ? ` (${s.description})` : '';
    if (s.anyOf) {
      const opciones = s.anyOf.map(def);
      if (opciones.some(o => !mirar(v, o, camino).length)) return [];
      const suya = opciones.find(o => tipoOk(v, o));
      return suya ? mirar(v, suya, camino) : [`${donde} no vale así${pista}`];
    }
    if (!tipoOk(v, s)) return [`${donde} tiene que ser ${[].concat(s.type).map(t => TIPO[t]).join(' o ')}${pista}`];
    const e = [];
    if (s.enum && !s.enum.includes(v)) e.push(`${donde}: "${v}" no vale; tiene que ser ${s.enum.map(x => `"${x}"`).join(', ')}`);
    if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) e.push(`${donde}: "${v}" no tiene la forma que toca${pista}`);
    if (s.minimum != null && typeof v === 'number' && v < s.minimum) e.push(`${donde} tiene que ser ${s.minimum} o más`);
    if (Array.isArray(v)) {
      if (s.maxItems != null && v.length > s.maxItems) e.push(`${donde}: como mucho ${s.maxItems}`);
      if (s.items) v.forEach((x, i) => e.push(...mirar(x, s.items, [...camino, String(i + 1)])));
    } else if (tipo(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) e.push(`falta "${r}"${camino.length ? ` en ${donde}` : ''}`);
      for (const [k, x] of Object.entries(v)) {
        if (s.properties?.[k]) e.push(...mirar(x, s.properties[k], [...camino, k]));
        else if (typeof s.additionalProperties === 'object') e.push(...mirar(x, s.additionalProperties, [...camino, k]));
        else if (s.additionalProperties === false) {
          const hay = Object.keys(s.properties || {}).filter(p => p !== '$schema' && p !== '_');
          e.push(`"${[...camino, k].join(' → ')}" no es un campo de aquí (¿mal escrito?). Los que hay: ${hay.join(', ')}`);
        }
      }
    }
    return e;
  }
  return mirar(dato, esquema, []).map(m => `${fichero}: ${m}`);
}


/** El nombre de cada entrada de una lista de site.json: "everafter", o
    { "project": "aclucalls", "parts": ["capsula-aclucalls"] } si lleva partes
    dentro, o { "project": "x", "visible": false } si está oculto. */
export const entradas = lista => (Array.isArray(lista?.projects) ? lista.projects : []).map(e =>
  typeof e === 'string' ? { slug: e, visible: true, parts: [] }
    : { slug: e?.project, visible: e?.visible !== false, parts: Array.isArray(e?.parts) ? e.parts : [] });

/** Un post del blog: el texto, la foto y la fecha. Va fuera de crearSitio
    porque lo usará también el Worker del blog (manus/blog.md). `src` pone la
    base delante de una foto del repo; las del Worker ya vienen enteras. */
export function pintarPost(x, { src = f => f, borrar = false } = {}) {
  const iso = String(x.created_at);
  const fecha = `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;
  const foto = x.image
    ? `<img src="${/^(https?:|\/)/.test(x.image.src) ? esc(x.image.src) : src(esc(x.image.src))}" width="${x.image.width}" height="${x.image.height}" alt="" loading="lazy">`
    : '';
  return `<li id="p${x.id}">${String(x.text).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}${foto}`
    + `<a class="d" href="#p${x.id}">${fecha}</a>${borrar ? ` <button class="esborrar" data-id="${x.id}">esborrar</button>` : ''}</li>`;
}

/** Un vídeo: el enlace lleva a su página (se ve sin JS) y js/main.js lo
    incrusta al pulsar; los de YouTube, desde youtube-nocookie. */
export const videoPagina = u => (u.includes('player.vimeo.com') ? 'https://vimeo.com/' + (u.match(/video\/(\d+)/) || [])[1] : u);
export const youtube = u => (String(u).match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/) || [])[1];
export const videoIncrustado = u => (youtube(u) ? 'https://www.youtube-nocookie.com/embed/' + youtube(u) : u);

export function crearSitio({ site, about, agenda, guillem, blog = [], proyectos, base = '', origen = '',
                             indexar: INDEXAR = false, existe = () => false, medidas = () => null,
                             peso = () => null, og = () => null, hoy = new Date().toISOString().slice(0, 10),
                             preview = false }) {
  const LANGS = site.langs;
  const DEF = site.lang;
  const B = String(base).replace(/\/$/, '');
  const M = site.menu;

  /* ---------- los proyectos, según las listas ---------- */
  const porSlug = Object.fromEntries(proyectos.map(p => [p.slug, p]));
  // qué proyectos van dentro de otro (cápsula, réquiem…): salen en su página, no en la lista
  const partesDe = {}, padreDe = {};
  const listas = Object.entries(site.lists || {}).map(([clave, l]) => ({ clave, name: l.name, entradas: entradas(l) }));
  for (const l of listas) for (const e of l.entradas) {
    partesDe[e.slug] = e.parts;
    e.parts.forEach(x => (padreDe[x] = e.slug));
  }
  const conPagina = listas.flatMap(l => l.entradas).filter(e => porSlug[e.slug]);
  const ocultos = new Set(conPagina.filter(e => !e.visible).map(e => e.slug));

  /* ---------- rutas ---------- */
  const raiz = p => B + (p.startsWith('/') ? p : '/' + p);
  const pre = l => (l === DEF ? '' : `/${l}`);
  /** La ruta limpia de una página: /es/trabajos/navaja/ */
  const ruta = (l, path = '') => `${pre(l)}/${path}`.replace(/\/{2,}/g, '/');
  /** A dónde apuntan los enlaces. En la vista previa, al index con ?p= */
  const url = (l, path = '') => (preview ? `${B}/?p=${ruta(l, path)}` : B + ruta(l, path));
  /** La dirección pública, para canonical, hreflang, og y sitemap. */
  const publica = p => origen + raiz(p);
  const abs = (l, path = '') => publica(ruta(l, path));
  const src = f => raiz('/' + f);

  /** Un texto en un idioma, o en el de la web si falta (o en el que haya). */
  const t = (v, l) => (v == null ? '' : typeof v === 'object' && !Array.isArray(v) ? (v[l] ?? v[DEF] ?? Object.values(v)[0]) : v);
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  const yy = d => d.slice(2, 4);
  const metaDesc = txt => {
    const flat = String(txt || '').replace(/\s+/g, ' ').trim();
    return flat.length <= 155 ? flat : flat.slice(0, 152).replace(/\s+\S*$/, '') + '…';
  };
  const wordmark = '<span class="c1">la</span><span class="c2">SAD</span><span class="c3">CUM</span>';
  const foto = (slug, n) => `projects/${slug}/img/${n}.webp`;
  const titulo = (p, l) => t(p.title, l);

  /** La foto para compartir: la portada del proyecto, o la del primero de la
      primera lista. og() da la de 1200x630 que hace el build, si la hay. */
  const OG = (() => { const p = porSlug[conPagina[0]?.slug]; return p?.cover ? foto(p.slug, p.cover) : null; })();
  const ogDe = rel => (rel ? og(rel) || rel : null);

  /* ---------- la cabecera y el pie ---------- */
  const transicion = `<script>{
const html = document.documentElement;
html.classList.add('js');
let back = false;
try {
  const d = JSON.parse(sessionStorage.getItem('transicion'));
  back = !d && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (d?.carga) html.style.setProperty('--carga', d.carga);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (back || d)) html.classList.add('tapada');
} catch {}
window.revelada = 'onpagereveal' in window ? new Promise((done) => addEventListener('pagereveal', (e) => {
  const vt = e.viewTransition;
  if (vt && back && html.classList.contains('tapada')) { html.classList.add('tapando'); done(vt); }
  else { vt?.ready.catch(() => {}); vt?.skipTransition(); done(null); }
}, { once: true })) : Promise.resolve(null);
}</script>`;

  /** Una página entera. `path` es la ruta sin idioma; `unIdioma`, las que solo
      hay en el idioma de la web (blog, admin, Guillem): sin hreflang ni idiomas. */
  function pagina({ l, path, title, desc, body, cls = '', current = '', unIdioma = false, image = OG, indexar = INDEXAR, canonical = true }) {
    const nav = ['about', 'calendario', 'trabajos', 'contacto', 'blog'].map(k => {
      const label = k === 'trabajos' && current.startsWith('trabajos - ') ? t(M.trabajos, l) + current.slice(8) : t(M[k], l);
      return `<a href="${url(k === 'blog' ? DEF : l, k + '/')}"${current.startsWith(k) ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
    }).join('');
    const idiomas = LANGS.map(x => `<a href="${url(x, path)}" hreflang="${x}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join(' ');
    const img = ogDe(image);
    const dim = img?.startsWith('og/') ? { w: 1200, h: 630 } : img && medidas(img);
    return `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
${transicion}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc(desc || t(site.description, l)))}">${indexar ? '' : '\n<meta name="robots" content="noindex">'}
${canonical ? `<link rel="canonical" href="${abs(l, path)}">` : ''}
${unIdioma ? '' : LANGS.map(x => `<link rel="alternate" hreflang="${x}" href="${abs(x, path)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${abs(DEF, path)}">`}
<meta property="og:type" content="${path.startsWith('trabajos/') && path !== 'trabajos/' ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc(desc || t(site.description, l)))}">
${canonical ? `<meta property="og:url" content="${abs(l, path)}">` : ''}
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:locale" content="${l === 'ca' ? 'ca_ES' : l === 'es' ? 'es_ES' : 'en_GB'}">
${img ? `<meta property="og:image" content="${publica('/' + img)}">` : ''}${dim ? `\n<meta property="og:image:width" content="${dim.w}">\n<meta property="og:image:height" content="${dim.h}">` : ''}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="${src('css/transicion.css')}">
<link rel="stylesheet" href="${src('css/style.css')}">
<script src="${src('js/transicion.js')}" defer></script>
</head>
<body class="${cls}">
${cls === 'home' ? '' : `<a class="marca" href="${url(l)}">${wordmark}</a>`}
<nav class="menu">${nav}</nav>
<main>
${body}
</main>
${unIdioma ? '' : `<nav class="idioma">${idiomas}</nav>`}
<script src="${src('js/main.js')}" defer></script>
</body>
</html>
`;
  }

  const post = (x, borrar) => pintarPost(x, { src, borrar });

  /* ---------- un proyecto (y sus partes, debajo) ---------- */
  function ficha(p, l, h) {
    const name = titulo(p, l);
    const credits = (p.credits || []).map(c => `<dt>${esc(t(c.role, l))}</dt><dd>${md(t(c.name, l))}</dd>`).join('');
    const awards = t(p.awards, l) || [];
    const text = (t(p.text, l) || []).filter(Boolean);
    const videos = p.videos || [];
    const fotoTag = (n, i) => {
      const f = foto(p.slug, n), m = medidas(f);
      return `<img src="${src(f)}" alt="${i ? '' : esc(name)}"${m ? ` width="${m.w}" height="${m.h}"` : ''}${h === 'h2' || i > 0 ? ' loading="lazy"' : ''}>`;
    };
    return `<article class="cols${h === 'h2' ? ' parte' : ''}">
<div class="texto">
<${h}>${esc(name)} <span class="y">(${p.year})</span></${h}>
${p.kind ? `<p class="tipo">${esc(t(p.kind, l))}</p>` : ''}
${text.map(x => `<p>${md(x)}</p>`).join('\n')}
${awards.length ? `<ul class="premios">${awards.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
${credits ? `<dl class="creditos">${credits}</dl>` : ''}
${videos.length ? `<ul class="videos">${videos.map(v => `<li><a class="video" href="${esc(videoPagina(v.url))}" data-embed="${esc(videoIncrustado(v.url))}"><span class="flecha" aria-hidden="true">▸</span> ${esc(v.title || t(M.trailer, l))}</a></li>`).join('')}</ul>
<p class="nota"><a href="${url(l, 'contacto/')}">${esc(t(M.completa, l))}</a></p>` : ''}
${p.photo_credit ? `<p class="pie">${esc(t(p.photo_credit, l))}</p>` : ''}
</div>
<div class="fotos">
${(p.photos || []).map(fotoTag).join('\n')}
</div>
</article>`;
  }

  /* ---------- las páginas ---------- */
  const home = l => pagina({ l, path: '', title: site.title, cls: 'home', body: `<h1 class="gigante">${wordmark}</h1>` });

  const trabajos = l => pagina({
    l, path: 'trabajos/', title: `${t(M.trabajos, l)} · ${site.title}`, current: 'trabajos', cls: 'trabajos',
    body: `${listas.map(lista => `<h2 class="etiqueta">${esc(t(lista.name, l))}</h2>\n<ul class="lista">\n${lista.entradas
      .filter(e => e.visible && porSlug[e.slug]).map(e => {
        const p = porSlug[e.slug];
        return `<li><span class="y">${p.year}</span><span class="t"><a href="${url(l, `trabajos/${p.slug}/`)}">${esc(titulo(p, l))}</a></span></li>`;
      }).join('\n')}\n</ul>`).join('\n')}`,
  });

  const proyecto = (p, l) => pagina({
    l, path: `trabajos/${p.slug}/`, title: `${titulo(p, l)} (${p.year}) · ${site.title}`,
    current: 'trabajos - ' + titulo(p, l).toLowerCase(), cls: 'proyecto',
    desc: p.description ? t(p.description, l) : (t(p.text, l) || []).filter(Boolean)[0],
    image: p.cover ? foto(p.slug, p.cover) : OG, indexar: INDEXAR && !ocultos.has(p.slug),
    body: [p, ...(partesDe[p.slug] || []).map(s => porSlug[s]).filter(Boolean)].map((x, i) => ficha(x, l, i ? 'h2' : 'h1')).join('\n'),
  });

  // el about enlaza los proyectos que nombra, y Guillem Jiménez, su CV en otra pestaña
  function aboutTexto(l) {
    const nombres = proyectos.filter(p => !padreDe[p.slug]).flatMap(p => LANGS.map(x => [titulo(p, x), p.slug]))
      .sort((a, b) => b[0].length - a[0].length);
    return (about[l]?.length ? about[l] : about[DEF]).map(par => {
      let h = esc(par);
      const hechos = new Set();
      for (const [name, s] of nombres) {
        if (hechos.has(s) || !name) continue;
        const re = new RegExp(`(?<![\\wÀ-ÿ>])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\(\\d{4}\\))?`);
        if (re.test(h)) { h = h.replace(re, m => `<a href="${url(l, `trabajos/${s}/`)}">${m}</a>`); hechos.add(s); }
      }
      return `<p>${h.replace(/Guillem Jiménez/, `<a href="${url(DEF, 'about/guillem/')}" target="_blank" rel="noopener">Guillem Jiménez</a>`)}</p>`;
    }).join('\n');
  }
  const aboutPag = l => pagina({
    l, path: 'about/', title: `about · ${site.title}`, current: 'about', cls: 'about',
    desc: (about[l] || about[DEF])[0],
    body: `<div class="bio">\n${aboutTexto(l)}\n<p class="firma">web: <a href="https://meowrhino.studio" target="_blank" rel="noopener">meowrhino.studio</a></p>\n</div>`,
  });

  // calendario: lo que viene en negro, lo que pasó en gris
  function calendario(l) {
    const fecha = e => `${esc(t(e.days, l)).replace(/\//g, '.')}.${yy(e.date)}`;
    const linea = e => {
      const x = esc(t(e.text, l).replace(/\s*-\s*(info.*|entrades|entradas|tickets.*)$/i, ''));
      return `<li data-date="${e.date}"><span class="d">${fecha(e)}</span> ${e.link ? `<a href="${esc(e.link)}">${x}</a>` : x}</li>`;
    };
    const next = agenda.filter(e => e.date >= hoy).sort((a, b) => a.date.localeCompare(b.date));
    const past = agenda.filter(e => e.date < hoy).sort((a, b) => b.date.localeCompare(a.date));
    return pagina({
      l, path: 'calendario/', title: `${t(M.calendario, l)} · ${site.title}`, current: 'calendario', cls: 'calendario',
      body: `<div class="cols">
<section><h2 class="oculto">${esc(t(M.proximas, l))}</h2><ul class="fechas proximas">\n${next.map(linea).join('\n')}\n</ul></section>
<section><h2 class="oculto">${esc(t(M.pasadas, l))}</h2><ul class="fechas pasadas">\n${past.map(linea).join('\n')}\n</ul></section>
</div>`,
    });
  }

  function contacto(l) {
    const nl = site.newsletter ? new URL(site.newsletter).searchParams : null;
    const ig = site.instagram ? `https://www.instagram.com/${site.instagram.replace(/^@/, '')}` : null;
    return pagina({
      l, path: 'contacto/', title: `${t(M.contacto, l)} · ${site.title}`, current: 'contacto', cls: 'contacto',
      body: `<ul class="lista">
${site.email ? `<li><span class="y">email</span><span class="t"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></span></li>` : ''}
${ig ? `<li><span class="y">instagram</span><span class="t"><a href="${ig}">@${esc(site.instagram.replace(/^@/, ''))}</a></span></li>` : ''}
${Object.entries(site.social || {}).map(([k, u]) => `<li><span class="y">${esc(k)}</span><span class="t"><a href="${esc(u)}">${esc(u.replace(/^https?:\/\/(www\.)?/, ''))}</a></span></li>`).join('\n')}
${nl ? `<li><span class="y">newsletter</span><span class="t"><form action="${esc(site.newsletter)}" method="post" target="_blank"><input type="email" name="EMAIL" placeholder="${esc(t(M.tuEmail, l))}" required aria-label="${esc(t(M.tuEmail, l))}"><input type="text" name="b_${nl.get('u')}_${nl.get('id')}" tabindex="-1" value="" hidden> <button>${esc(t(M.apuntame, l))}</button></form></span></li>` : ''}
</ul>`,
    });
  }

  // Guillem Jiménez: su CV, tal cual lo pasan, en un solo idioma (se abre en otra pestaña desde el about)
  const guillemPag = () => pagina({
    l: DEF, path: 'about/guillem/', title: `Guillem Jiménez · ${site.title}`, current: 'about', cls: 'guillem', unIdioma: true,
    desc: guillem.title,
    body: `<div class="bio">\n<h1>${esc(guillem.title)}</h1>\n<ul class="cv">\n${guillem.items.map(x => `<li>${esc(x)}</li>`).join('\n')}\n</ul>\n</div>`,
  });

  // blog: uno solo, sin idiomas (el Worker rellenará <ol class="posts">; manus/blog.md)
  const blogPag = () => pagina({
    l: DEF, path: 'blog/', title: `blog · ${site.title}`, current: 'blog', cls: 'blog-page', unIdioma: true,
    body: `<ol class="posts">\n${blog.map(x => post(x)).join('\n')}\n</ol>`,
  });

  // /admin/: donde la compañía publica en el blog. Solo el diseño; lo programará el Worker
  const adminPag = () => pagina({
    l: DEF, path: 'admin/', title: `publicar · ${site.title}`, current: 'blog', cls: 'admin', unIdioma: true, indexar: false,
    body: `<form class="publicar" method="post" action="/api/posts" enctype="multipart/form-data">
<label><span class="y">text</span><textarea name="text" rows="6" required></textarea></label>
<label><span class="y">imatge</span><span class="t"><input type="file" name="image" accept="image/*"> <span class="pista">es passa a webp, màx. 2000 px</span></span></label>
<p><span class="y"></span><button>publicar</button></p>
</form>
<h2 class="etiqueta">publicat</h2>
<ol class="posts admin-posts">\n${blog.map(x => post(x, true)).join('\n')}\n</ol>`,
  });

  /** La 404: GitHub Pages y Cloudflare la sirven en cualquier dirección que no existe. */
  const noEncontrada = () => pagina({
    l: DEF, path: '404/', title: `404 · ${site.title}`, unIdioma: true, indexar: false, canonical: false,
    body: `<div class="bio">\n${LANGS.map(x => `<p lang="${x}">${esc(t(M.noEncontrada, x))}</p>`).join('\n')}\n</div>`,
  });

  /* ---------- el mapa del sitio ----------
     Cada página con su ruta y la función que la pinta. El build las escribe
     todas; la vista previa busca la que se ha pedido y pinta solo esa. */
  function rutas() {
    const r = [];
    for (const l of LANGS) {
      r.push({ ruta: ruta(l), pintar: () => home(l) });
      r.push({ ruta: ruta(l, 'trabajos/'), pintar: () => trabajos(l) });
      for (const e of conPagina) {
        const p = porSlug[e.slug];
        r.push({ ruta: ruta(l, `trabajos/${p.slug}/`), oculto: !e.visible, pintar: () => proyecto(p, l) });
      }
      r.push({ ruta: ruta(l, 'about/'), pintar: () => aboutPag(l) });
      r.push({ ruta: ruta(l, 'calendario/'), pintar: () => calendario(l) });
      r.push({ ruta: ruta(l, 'contacto/'), pintar: () => contacto(l) });
    }
    r.push({ ruta: ruta(DEF, 'about/guillem/'), pintar: guillemPag });
    r.push({ ruta: ruta(DEF, 'blog/'), pintar: blogPag });
    r.push({ ruta: ruta(DEF, 'admin/'), oculto: true, pintar: adminPag });
    return r;
  }

  /* ---------- revisión de los datos ----------
     Lo que el esquema no ve porque hay que mirar el disco. Lo grave (una foto
     que no está, un nombre de la lista sin carpeta) para el build; lo demás
     solo avisa. La vista previa enseña los dos. */
  function revisar() {
    const avisos = [];
    const aviso = (quien, texto, grave = false) => avisos.push({ quien, texto, grave });
    for (const l of LANGS) if (!about?.[l]?.length) aviso('data/about.json', `falta el about en "${l}"`);

    const vistos = new Set();
    for (const lista of listas) {
      for (const e of lista.entradas) {
        for (const s of [e.slug, ...e.parts]) {
          if (typeof s !== 'string') { aviso('data/site.json', `en la lista "${lista.clave}", cada proyecto es "nombre-de-la-carpeta" o { "project": "…", "parts": […] }`, true); continue; }
          if (!porSlug[s]) aviso('data/site.json', `la lista "${lista.clave}" dice "${s}", pero no hay ninguna carpeta projects/${s}/`, true);
          if (vistos.has(s)) aviso('data/site.json', `"${s}" sale dos veces en las listas`, true);
          vistos.add(s);
        }
      }
    }
    for (const p of proyectos) {
      const quien = `projects/${p.slug}`;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug))
        aviso(quien, 'el nombre de la carpeta solo puede llevar minúsculas, números y guiones (sin acentos ni espacios)', true);
      if (!vistos.has(p.slug)) { aviso(quien, 'no está en ninguna lista de data/site.json: no sale en la web'); continue; }
      const textos = p.text && typeof p.text === 'object' ? Object.keys(p.text) : [];
      const faltan = LANGS.filter(l => !textos.includes(l));
      if (textos.length && faltan.length) aviso(quien, `el texto no está en ${faltan.join(', ')}: ahí sale en ${textos.includes(DEF) ? DEF : textos[0]}`);
      for (const n of [...new Set([...(p.photos || []), ...(p.cover ? [p.cover] : [])])]) {
        const f = foto(p.slug, n);
        if (!existe(f)) aviso(quien, `"${n}": no hay ningún ${n}.webp en projects/${p.slug}/img/`, true);
        else if ((peso(f) || 0) > 1048576) aviso(quien, `${f} pesa ${(peso(f) / 1048576).toFixed(1)} MB: pásala por imgToWeb (85 %)`);
      }
      if (p.cover && !(p.photos || []).includes(p.cover)) aviso(quien, `la portada ("cover": "${p.cover}") no está en "photos"`);
      for (const v of p.videos || []) if (!/vimeo\.com|youtu\.?be/.test(v.url)) aviso(quien, `${v.url}: solo se incrustan vídeos de YouTube y Vimeo; este sale como enlace`);
    }
    for (const e of agenda) if (e.date < '2000' || isNaN(Date.parse(e.date))) aviso('data/agenda.json', `"${e.date}" no es una fecha AAAA-MM-DD`, true);
    return avisos;
  }

  return { rutas, revisar, noEncontrada, publica, LANGS };
}
