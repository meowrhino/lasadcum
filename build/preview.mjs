/* ============================================================
   preview.mjs — la web entera sin build, para Live Server
   ------------------------------------------------------------
   Live Server (la extensión de VS Code) sirve la carpeta tal cual, y
   la web de verdad no existe hasta que el build la escribe en dist/.
   Esto la pinta al vuelo: lee los JSON, pregunta al servidor qué fotos
   hay y escribe la página pedida con las mismas plantillas que el
   build (paginas.mjs). Todas son el index.html de la raíz, con la
   ruta en ?p=   (/?p=/es/trabajos/navaja/)
   ============================================================ */
import { crearSitio, leerJSON, entradas, validar, esc } from './paginas.mjs';

/* La carpeta del index.html: la raíz, o una subcarpeta si Live Server se abre más arriba. */
const BASE = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');

const pedir = async ruta => {
  const r = await fetch(`${BASE}/${ruta}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`no encuentro ${ruta}`);
  return r.text();
};

/* ¿Existe este fichero? Se pregunta con HEAD (no baja el fichero) y se recuerda. */
const hay = new Map(), pesos = new Map();
const preguntar = rutas => Promise.all([...rutas].filter(r => !hay.has(r)).map(async r => {
  try {
    const res = await fetch(`${BASE}/${encodeURI(r)}`, { method: 'HEAD', cache: 'no-store' });
    hay.set(r, res.ok);
    pesos.set(r, +res.headers.get('content-length') || null);
  } catch { hay.set(r, false); }
}));

function escribir(html) {
  document.open();
  document.write(html);
  document.close();
}

function pantallaDeError(titulo, texto) {
  escribir(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>vista previa — error</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:clamp(24px,6vw,80px);font:16px/1.5 -apple-system,Helvetica,Arial,sans-serif;background:#fff;color:#444}
h1{font-weight:400;font-size:28px;margin:0 0 .6em;color:#b3261e}p{max-width:62ch;white-space:pre-line}</style>
</head><body><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>
<p>Arréglalo, guarda, y esta página se recarga sola.</p></body></html>`);
}

async function arrancar() {
  let pedida = new URLSearchParams(location.search).get('p') || '/';
  if (!pedida.startsWith('/')) pedida = '/' + pedida;
  if (!pedida.endsWith('/')) pedida += '/';

  let datos;
  try {
    const leer = async f => leerJSON(await pedir(f), f);
    const site = await leer('data/site.json');
    const [about, agenda, guillem, blog] = await Promise.all(
      ['data/about.json', 'data/agenda.json', 'data/guillem.json', 'data/blog-ejemplo.json'].map(leer));
    /* El navegador no puede listar la carpeta projects/: se leen los de las
       listas (con sus partes). Una carpeta que no está en ninguna lista no
       sale en la web; para verla, ponla en una lista. */
    const slugs = [...new Set(Object.values(site.lists || {}).flatMap(l => entradas(l).flatMap(e => [e.slug, ...e.parts])))]
      .filter(s => typeof s === 'string');
    const proyectos = (await Promise.all(slugs.map(async s => {
      const f = `projects/${s}/project.json`;
      try { return { ...(await leer(f)), slug: s }; }
      catch (e) { if (e.json) throw e; return null; }   // sin carpeta: lo dice revisar()
    }))).filter(Boolean);

    /* Lo mismo que comprueba el build con schema/ (en VS Code, subrayado en rojo). */
    const esquemas = {};
    for (const t of ['site', 'about', 'agenda', 'guillem', 'blog', 'project']) {
      try { esquemas[t] = JSON.parse(await pedir(`schema/${t}.json`)); } catch { /* sin esquema, sin mirar */ }
    }
    const mirar = (d, t, f) => (esquemas[t] ? validar(d, esquemas[t], f) : []);
    const errores = [...mirar(site, 'site', 'data/site.json'), ...mirar(about, 'about', 'data/about.json'),
      ...mirar(agenda, 'agenda', 'data/agenda.json'), ...mirar(guillem, 'guillem', 'data/guillem.json'),
      ...mirar(blog, 'blog', 'data/blog-ejemplo.json'),
      ...proyectos.flatMap(({ slug, ...p }) => mirar(p, 'project', `projects/${slug}/project.json`))];
    if (errores.length) { pantallaDeError('Hay algo mal en un JSON', errores.join('\n')); return; }
    datos = { site, about, agenda, guillem, blog, proyectos };
  } catch (e) {
    pantallaDeError(e.json ? 'Hay un error en un JSON' : 'No puedo leer los datos', e.message);
    return;
  }

  /* Las plantillas preguntan "¿existe este fichero?" de forma síncrona, y al
     servidor solo se le puede preguntar de forma asíncrona: se pinta en seco
     apuntando lo que se pregunta, se pregunta todo de una vez y se repite. */
  const montar = existe => crearSitio({ ...datos, base: BASE, existe, peso: r => pesos.get(r), preview: true });
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    const nuevas = new Set();
    const sitio = montar(r => (hay.has(r) ? hay.get(r) : (nuevas.add(r), false)));
    sitio.revisar();
    sitio.rutas().find(r => r.ruta === pedida)?.pintar();
    if (!nuevas.size) break;
    await preguntar(nuevas);
  }
  const sitio = montar(r => hay.get(r) === true);
  const pagina = sitio.rutas().find(r => r.ruta === pedida);
  if (!pagina) {
    pantallaDeError('Esta página no existe', `No hay ninguna página en ${pedida}. Si es un proyecto, mira que el nombre de la carpeta esté bien escrito.`);
    return;
  }

  /* Lo grave (una foto que no está…) no se publicaría: sale en vez de la
     página. Los avisos, en una franja arriba. */
  const avisos = sitio.revisar();
  const graves = avisos.filter(a => a.grave);
  if (graves.length) {
    pantallaDeError('Esto no se publicaría', graves.map(a => `${a.quien}: ${a.texto}`).join('\n'));
    return;
  }
  escribir(pagina.pintar());
  const franja = html => (document.body ? document.body.insertAdjacentHTML('afterbegin', html)
    : document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', html), { once: true }));
  if (avisos.length) franja(
    '<div style="position:fixed;inset:0 0 auto;z-index:8;padding:8px 12px;background:#fff3c4;color:#5c4400;'
    + 'font:13px/1.4 -apple-system,Helvetica,Arial,sans-serif;max-height:30vh;overflow:auto">'
    + avisos.map(a => `⚠ ${esc(a.quien)}: ${esc(a.texto)}`).join('<br>')
    + ' <button onclick="this.parentNode.remove()" style="font:inherit">cerrar</button></div>');
}

arrancar().catch(e => pantallaDeError('La vista previa ha fallado', e.message));
