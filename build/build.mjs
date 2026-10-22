/* ============================================================
   build.mjs — la web de laSADCUM, sin dependencias salvo sharp.
   Lee data/*.json y projects/<carpeta>/project.json, los comprueba
   con schema/ y escribe dist/: una página por proyecto e idioma.
   Las plantillas viven en paginas.mjs, el mismo fichero que usa la
   vista previa de Live Server.
       node build/build.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearSitio, leerJSON, validar } from './paginas.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const leer = f => leerJSON(readFileSync(join(ROOT, f), 'utf8'), f);

/* Un proyecto, una carpeta: cada carpeta de projects/ con su project.json */
const slugs = readdirSync(join(ROOT, 'projects'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(ROOT, 'projects', d.name, 'project.json')))
  .map(d => d.name);

/* Cada JSON se lee y se comprueba con su esquema (schema/), el mismo con el
   que VS Code subraya lo que está mal. */
const esquema = tipo => JSON.parse(readFileSync(join(ROOT, 'schema', tipo + '.json'), 'utf8'));
const errores = [];
const leerYMirar = (f, tipo) => { const d = leer(f); errores.push(...validar(d, esquema(tipo), f)); return d; };
let site, about, agenda, guillem, blog, proyectos;
try {
  site = leerYMirar('data/site.json', 'site');
  about = leerYMirar('data/about.json', 'about');
  agenda = leerYMirar('data/agenda.json', 'agenda');
  guillem = leerYMirar('data/guillem.json', 'guillem');
  // shortcut: posts de ejemplo hasta que el blog tenga su Worker (manus/blog.md)
  blog = leerYMirar('data/blog-ejemplo.json', 'blog');
  proyectos = slugs.map(slug => ({ ...leerYMirar(`projects/${slug}/project.json`, 'project'), slug }));
} catch (e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
if (errores.length) {
  console.error('\n' + errores.map(e => '✗ ' + e).join('\n')
    + '\n\nNo se publica nada hasta que se arregle (en VS Code sale subrayado en rojo).\n');
  process.exit(1);
}

/* Dónde se publica, según dónde se construye (JAMstack, patrones §5): en la
   Action de GitHub (nuestra copia), meowrhino.github.io/lasadcum/ y sin
   indexar; en cualquier otro sitio (Cloudflare, la copia de laSADCUM), la
   raíz y el dominio de site.json → "url", y se indexa si lo hay. */
const github = process.env.GITHUB_ACTIONS === 'true';
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'meowrhino/lasadcum').split('/');
const base = github ? `/${repo}` : '';
const origen = github ? `https://${owner}.github.io` : String(site.url || '').replace(/\/$/, '');
const indexar = !github && !!site.url;

/** Ancho y alto de una foto, leídos de su cabecera (para que el navegador
    reserve el hueco antes de que llegue). De oriol-colomer. */
const donde = rel => join(ROOT, rel);
const medidasCache = new Map();
function medidas(rel) {
  if (medidasCache.has(rel)) return medidasCache.get(rel);
  let r = null;
  try {
    const b = readFileSync(donde(rel));
    if (b[0] === 0xFF && b[1] === 0xD8) {                 // jpeg
      let o = 2;
      while (o + 9 < b.length) {
        if (b[o] !== 0xFF) { o++; continue; }             // resincronizar
        const m = b[o + 1];
        if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
        const len = b.readUInt16BE(o + 2);
        // SOF de verdad: C4 es la tabla Huffman, C8 una extension y CC el
        // codificador aritmetico. Ninguno de los tres trae medidas.
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
          r = { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5) };
          break;
        }
        o += 2 + len;
      }
    } else if (b.readUInt32BE(0) === 0x89504E47) {        // png
      r = { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      // webp: tres variantes de cabecera, cada una guarda el tamano a su manera
      const tipo = b.toString('ascii', 12, 16);
      if (tipo === 'VP8X') r = { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      else if (tipo === 'VP8 ') r = { w: b.readUInt16LE(26) & 0x3FFF, h: b.readUInt16LE(28) & 0x3FFF };
      else if (tipo === 'VP8L') {
        const v = b.readUInt32LE(21);
        r = { w: 1 + (v & 0x3FFF), h: 1 + ((v >> 14) & 0x3FFF) };
      }
    }
  } catch { /* fichero ausente o ilegible: se sigue sin medidas */ }
  medidasCache.set(rel, r);
  return r;
}

/* La foto para compartir (og:image): 1200x630 en JPG, que es lo que esperan
   WhatsApp, Instagram y compañía. Las horizontales llenan el recuadro; las
   verticales caben enteras sobre blanco. La hace sharp en .cache/og/ y solo
   la rehace si la foto cambia. Sin sharp, se comparte la foto tal cual. */
let sharp;
try { sharp = (await import('sharp')).default; }
catch (e) { console.warn(`⚠ sin sharp (${e.code || e.message}): al compartir sale la foto tal cual. Se arregla con: npm ci`); }
const ogNom = rel => createHash('sha1').update(rel).digest('hex').slice(0, 12) + '.jpg';
const ogHechas = new Map();
async function hacerOgs(rels) {
  if (!sharp) return;
  for (const rel of rels) {
    if (!existsSync(join(ROOT, rel))) continue;
    const cache = join(ROOT, '.cache', 'og', ogNom(rel));
    if (!(existsSync(cache) && statSync(cache).mtimeMs >= statSync(join(ROOT, rel)).mtimeMs)) {
      try {
        const m = medidas(rel);
        mkdirSync(dirname(cache), { recursive: true });
        await sharp(join(ROOT, rel))
          .resize(1200, 630, m && m.w / m.h >= 1.2 ? { fit: 'cover' } : { fit: 'contain', background: '#ffffff' })
          .flatten({ background: '#ffffff' }).jpeg({ quality: 85, mozjpeg: true }).toFile(cache);
      } catch (e) { console.warn(`⚠ ${rel}: no se ha podido hacer su imagen para compartir (${e.message})`); continue; }
    }
    ogHechas.set(rel, `og/${ogNom(rel)}`);
  }
}

const opciones = {
  site, about, agenda, guillem, blog, proyectos, base, origen, indexar, medidas,
  existe: rel => existsSync(join(ROOT, rel)),
  peso: rel => statSync(join(ROOT, rel)).size,
};
/* Las plantillas piden la og mientras pintan, y sharp va aparte: una primera
   pasada apunta cuáles hacen falta, se hacen, y se pinta. */
const ogPedidas = new Set();
const prueba = crearSitio({ ...opciones, og: rel => (ogPedidas.add(rel), null) });
for (const r of prueba.rutas()) r.pintar();
await hacerOgs(ogPedidas);
const sitio = crearSitio({ ...opciones, og: rel => ogHechas.get(rel) ?? null });

/* Lo que el esquema no ve (mirar el disco): lo grave para y no se publica
   nada; lo demás solo avisa. */
const avisos = sitio.revisar();
for (const a of avisos) console.warn(`${a.grave ? '✗' : '⚠'} ${a.quien}: ${a.texto}`);
if (avisos.some(a => a.grave)) {
  console.error('\nHay errores (los marcados con ✗). No se publica nada hasta que se arreglen;'
    + ' la vista previa (Live Server) te los enseña igual.\n');
  process.exit(1);
}

/* ---------- escribir ------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const dir of ['css', 'js']) cpSync(join(ROOT, dir), join(OUT, dir), { recursive: true });
// las fotos de cada proyecto, en el mismo sitio que en el repo; el project.json no, que va dentro del HTML
for (const slug of slugs) {
  const img = join(ROOT, 'projects', slug, 'img');
  if (existsSync(img)) cpSync(img, join(OUT, 'projects', slug, 'img'), { recursive: true });
}
cpSync(join(ROOT, '_headers'), join(OUT, '_headers'));   // la caché, en Cloudflare
mkdirSync(join(OUT, 'og'), { recursive: true });
for (const o of ogHechas.values()) cpSync(join(ROOT, '.cache', 'og', o.slice(3)), join(OUT, o));

const rutas = sitio.rutas();
for (const r of rutas) {
  const file = join(OUT, r.ruta, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.pintar());
}

/* sitemap + robots, del mismo JSON */
writeFileSync(join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + rutas.filter(r => !r.oculto).map(r => `  <url><loc>${sitio.publica(r.ruta)}</loc></url>`).join('\n')
  + '\n</urlset>\n');
// en github.io, o sin dominio en site.json, la web es de prueba: no se indexa
writeFileSync(join(OUT, 'robots.txt'), indexar
  ? `User-agent: *\nAllow: /\nSitemap: ${sitio.publica('/sitemap.xml')}\n`
  : 'User-agent: *\nDisallow: /\n');
// GitHub Pages y Cloudflare enseñan esta en cualquier dirección que no existe
writeFileSync(join(OUT, '404.html'), sitio.noEncontrada());
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`${rutas.length} páginas · ${proyectos.length} proyectos · ${sitio.LANGS.length} idiomas · ${agenda.length} fechas`
  + (avisos.length ? ` · ${avisos.length} avisos (⚠)` : ''));
