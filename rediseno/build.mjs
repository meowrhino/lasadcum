// Rediseño de laSADCUM, fase 1: data/ + projects/ → una página HTML por idioma, aquí mismo.
// node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const site = read('data/site.json');
const about = read('data/about.json');
const agenda = read('data/agenda.json');
const press = read('data/press.json');
const projects = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'projects'))
  .filter(s => fs.existsSync(path.join(ROOT, 'projects', s, 'project.json')))
  .map(s => [s, read(`projects/${s}/project.json`)]));
const LANGS = site.langs, DEF = LANGS[0];
const TODAY = new Date().toISOString().slice(0, 10);

const T = {
  about: { ca: 'about', es: 'about', en: 'about' },
  calendario: { ca: 'calendari', es: 'calendario', en: 'calendar' },
  trabajos: { ca: 'treballs', es: 'trabajos', en: 'works' },
  contacto: { ca: 'contacte', es: 'contacto', en: 'contact' },
  blog: { ca: 'blog', es: 'blog', en: 'blog' },
  proximas: { ca: 'Properes dates', es: 'Próximas fechas', en: 'Upcoming dates' },
  pasadas: { ca: 'Dates anteriors', es: 'Fechas anteriores', en: 'Past dates' },
  video: { ca: 'veure el vídeo', es: 'ver el vídeo', en: 'watch the video' },
  apuntame: { ca: 'apunta-m’hi', es: 'apúntame', en: 'sign me up' },
  tuEmail: { ca: 'el teu email', es: 'tu email', en: 'your email' },
};

const pick = (v, l) => v == null ? '' : (typeof v === 'object' && !Array.isArray(v)) ? (v[l] ?? v[DEF] ?? Object.values(v)[0]) : v;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
const yy = d => d.slice(2, 4);
const vimeoPage = src => 'https://vimeo.com/' + (src.match(/video\/(\d+)/) || [])[1];
const wordmark = '<span class="c1">la</span><span class="c2">SAD</span><span class="c3">CUM</span>';

// página: ruta sin idioma ('', 'trabajos/navaja/') → archivo y enlaces relativos
const file = (l, p) => (l === DEF ? '' : l + '/') + p + 'index.html';
const relOf = (l, p) => '../'.repeat(file(l, p).split('/').length - 1);
function page({ l, p, title, body, cls = '', current = '', desc }) {
  const rel = relOf(l, p);
  const href = (lang, q) => rel + (lang === DEF ? '' : lang + '/') + q || './';
  const nav = ['about', 'calendario', 'trabajos', 'contacto'].map(k => {
    const label = k === 'trabajos' && current.startsWith('trabajos - ') ? pick(T.trabajos, l) + current.slice(8) : pick(T[k], l);
    return `<a href="${href(l, k + '/')}"${current.startsWith(k) ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  }).join('');
  const langs = LANGS.map(x => `<a href="${href(x, p)}" hreflang="${x}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join(' ');
  const html = `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || pick(site.description, l))}">
<meta name="robots" content="noindex">
${LANGS.map(x => `<link rel="alternate" hreflang="${x}" href="${href(x, p)}">`).join('\n')}
<link rel="stylesheet" href="${rel}css/style.css">
<link rel="icon" href="data:,">
</head>
<body class="${cls}">
${cls === 'home' ? '' : `<a class="marca" href="${href(l, '')}">${wordmark}</a>`}
<nav class="menu">${nav}</nav>
<main>
${body}
</main>
<nav class="idioma">${langs}</nav>
<a class="blog" href="${href(l, 'blog/')}"${current === 'blog' ? ' aria-current="page"' : ''}>${pick(T.blog, l)}</a>
<script src="${rel}js/main.js" defer></script>
</body>
</html>
`;
  const out = path.join(ROOT, file(l, p));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return rel;
}

const titleOf = (s, l) => pick(projects[s].title, l);
const img = (rel, s, n, lazy = true, alt = '') =>
  `<img src="${rel}projects/${s}/img/${n}.webp" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''}>`;

// el about enlaza solo los proyectos que nombra
function aboutText(l, rel) {
  const names = Object.keys(projects).flatMap(s => LANGS.map(x => [titleOf(s, x), s]))
    .sort((a, b) => b[0].length - a[0].length);
  return (about[l] || about[DEF]).map(par => {
    let h = esc(par);
    const done = new Set();
    for (const [name, s] of names) {
      if (done.has(s)) continue;
      const re = new RegExp(`(?<![\\wÀ-ÿ>])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\(\\d{4}\\))?`);
      if (re.test(h)) { h = h.replace(re, m => `<a class="obra" href="${rel}trabajos/${s}/">${m}</a>`); done.add(s); }
    }
    return `<p>${h.replace(/Guillem Jiménez/, '<b>Guillem Jiménez</b>')}</p>`;
  }).join('\n');
}

for (const l of LANGS) {
  // portada
  page({ l, p: '', title: site.title, cls: 'home', body: `<h1 class="gigante">${wordmark}</h1>` });

  // trabajos
  page({
    l, p: 'trabajos/', title: `${pick(T.trabajos, l)} · ${site.title}`, current: 'trabajos', cls: 'trabajos',
    body: `<ul class="lista">\n${site.lists.trabajos.map(it => {
      const pj = it.project && projects[it.project];
      const name = pj ? titleOf(it.project, l) : it.title;
      const year = pj ? pj.year : it.year;
      const t = pj ? `<a href="${it.project}/" data-cover="${relOf(l, 'trabajos/')}projects/${it.project}/img/${pj.cover}.webp">${esc(name)}</a>` : esc(name);
      return `<li${it.under ? ' class="sub"' : ''}><span class="y">${year}</span><span class="t">${t}</span></li>`;
    }).join('\n')}\n</ul>\n<img class="cover" alt="" hidden>`,
  });

  // un proyecto, una página
  for (const [s, pj] of Object.entries(projects)) {
    const name = titleOf(s, l);
    const credits = (pj.credits || []).map(c => `<dt>${esc(pick(c.role, l))}</dt><dd>${md(pick(c.name, l))}</dd>`).join('');
    const awards = pick(pj.awards, l) || [];
    const p = `trabajos/${s}/`;
    const rel = relOf(l, p);
    const text = (pick(pj.text, l) || []).filter(Boolean);
    page({
      l, p, title: `${name} (${pj.year}) · ${site.title}`, current: 'trabajos - ' + name.toLowerCase(), cls: 'proyecto',
      desc: text[0],
      body: `<article class="cols">
<div class="texto">
<h1>${esc(name)} <span class="y">(${pj.year})</span></h1>
<p class="tipo">${esc(pick(pj.kind, l))}</p>
${text.map(t => `<p>${md(t)}</p>`).join('\n')}
${awards.length ? `<ul class="premios">${awards.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
${credits ? `<dl class="creditos">${credits}</dl>` : ''}
${pj.video ? `<p><a class="video" href="${vimeoPage(pj.video)}" data-embed="${esc(pj.video)}">▸ ${pick(T.video, l)}</a></p>` : ''}
${pj.photo_credit ? `<p class="pie">${esc(pick(pj.photo_credit, l))}</p>` : ''}
</div>
<div class="fotos">
${(pj.photos || []).map((n, i) => img(rel, s, n, i > 0, i ? '' : name)).join('\n')}
</div>
</article>`,
    });
  }

  // about
  page({
    l, p: 'about/', title: `about · ${site.title}`, current: 'about', cls: 'about',
    body: `<div class="bio">\n${aboutText(l, relOf(l, 'about/') + (l === DEF ? '' : l + '/'))}\n<p class="firma">web: <a href="https://meowrhino.studio" target="_blank" rel="noopener">meowrhino.studio</a></p>\n</div>`,
  });

  // calendario: lo que viene en negro, lo que pasó en gris
  const fecha = e => `${esc(pick(e.days, l)).replace(/\//g, '.')}.${yy(e.date)}`;
  const linea = e => {
    const t = esc(pick(e.text, l).replace(/\s*-\s*(info.*|entrades|entradas|tickets.*)$/i, ''));
    return `<li data-date="${e.date}"><span class="d">${fecha(e)}</span> ${e.link ? `<a href="${esc(e.link)}">${t}</a>` : t}</li>`;
  };
  const next = agenda.filter(e => e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date));
  const past = agenda.filter(e => e.date < TODAY).sort((a, b) => b.date.localeCompare(a.date));
  page({
    l, p: 'calendario/', title: `${pick(T.calendario, l)} · ${site.title}`, current: 'calendario', cls: 'calendario',
    body: `<div class="cols">
<section><h2 class="oculto">${pick(T.proximas, l)}</h2><ul class="fechas proximas">\n${next.map(linea).join('\n')}\n</ul></section>
<section><h2 class="oculto">${pick(T.pasadas, l)}</h2><ul class="fechas pasadas">\n${past.map(linea).join('\n')}\n</ul></section>
</div>`,
  });

  // contacto
  const nl = site.newsletter && new URL(site.newsletter).searchParams;
  page({
    l, p: 'contacto/', title: `${pick(T.contacto, l)} · ${site.title}`, current: 'contacto', cls: 'contacto',
    body: `<ul class="lista">
${site.email ? `<li><span class="y">email</span><span class="t"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></span></li>` : ''}
<li><span class="y">instagram</span><span class="t"><a href="${site.instagram}">@${site.instagram.split('/').filter(Boolean).pop()}</a></span></li>
${Object.entries(site.social).map(([k, u]) => `<li><span class="y">${k}</span><span class="t"><a href="${u}">${u.replace(/^https?:\/\/(www\.)?/, '')}</a></span></li>`).join('\n')}
${site.newsletter ? `<li><span class="y">newsletter</span><span class="t"><form action="${esc(site.newsletter)}" method="post" target="_blank"><input type="email" name="EMAIL" placeholder="${pick(T.tuEmail, l)}" required aria-label="${pick(T.tuEmail, l)}"><input type="text" name="b_${nl.get('u')}_${nl.get('id')}" tabindex="-1" value="" hidden> <button>${pick(T.apuntame, l)}</button></form></span></li>` : ''}
</ul>`,
  });

  // blog: lo que se ha escrito de laSADCUM
  page({
    l, p: 'blog/', title: `blog · ${site.title}`, current: 'blog', cls: 'blog-page',
    body: `<ul class="lista prensa">\n${press.map(x => `<li><span class="y">${esc(pick(x.source, l))}</span><span class="t"><a href="${esc(x.url)}">${esc(pick(x.title, l))}</a></span></li>`).join('\n')}\n</ul>`,
  });
}
console.log(`${LANGS.length} idiomas, ${Object.keys(projects).length} proyectos, ${agenda.length} fechas`);
