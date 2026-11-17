// La copia del blog en el repo, para que nada se quede solo en Cloudflare:
// data/blog.json (los posts, con los nombres de la casa) y sus fotos en
// assets/img/blog/<año>/<mes>/<uuid>.<ext>, la misma clave que en R2. Lee solo
// lo que la web ya enseña (/api/posts y /media/): sin contraseña, y sin lo
// esborrat. La corre cada domingo .github/workflows/copia.yml, que hace commit si
// algo cambia. El build no la publica (build/build.mjs se salta assets/img/blog).
//
//   node tools/copia.mjs [web]     (por defecto, la url de data/site.json)
import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import assert from 'node:assert/strict';

const raiz = new URL('..', import.meta.url).pathname;
const site = JSON.parse(await readFile(join(raiz, 'data/site.json'), 'utf8'));
// shortcut: sin dominio, la de workers.dev; al poner url en site.json, sale sola de ahí
const web = (process.argv[2] || site.url || 'https://lasadcum.lasadcum.workers.dev').replace(/\/$/, '');
const carpeta = join(raiz, 'assets/img/blog');
const ruta = (src) => `assets/img/blog/${src.replace(/^\/media\//, '')}`;

const r = await fetch(`${web}/api/posts`);
if (!r.ok) throw new Error(`${web}/api/posts: ${r.status}`);
const posts = (await r.json()).sort((a, b) => a.id - b.id);   // por id: el diff no cambia al cambiar el orden de la web
// nada vacío: si la web falla y da una lista vacía, no se borra la copia
if (!posts.length) throw new Error('la web no ha dado ningún post: no toco la copia');

// los párrafos, como en la web (build/paginas.mjs → pintarPost): separados por una línea en blanco
const json = posts.map((p) => ({
  date: p.created_at,
  text: p.text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((t) => t.trim()).filter(Boolean),
  ...(p.image && { photo: ruta(p.image.src) }),
}));

// las fotos que faltan (las que ya están no cambian nunca: cada una tiene su uuid)
let nuevas = 0;
for (const p of posts) if (p.image) {
  const destino = join(raiz, ruta(p.image.src));
  if (await access(destino).then(() => true, () => false)) continue;
  const f = await fetch(`${web}${p.image.src}`);
  if (!f.ok) throw new Error(`${p.image.src}: ${f.status}`);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await f.arrayBuffer()));
  nuevas++;
}

// las que ya no salen en la web (esborrades): fuera de la copia (siguen en el historial de git)
const vivas = new Set(json.filter((p) => p.photo).map((p) => join(raiz, p.photo)));
const todas = (await readdir(carpeta, { recursive: true, withFileTypes: true }).catch(() => []))
  .filter((d) => d.isFile() && !d.name.startsWith('.')).map((d) => join(d.parentPath, d.name));
const sobran = todas.filter((f) => !vivas.has(f));
for (const f of sobran) await rm(f);

await writeFile(join(raiz, 'data/blog.json'), `${JSON.stringify(json, null, 2)}\n`);

// la copia tiene que cuadrar: cada foto del JSON, en su sitio
for (const f of vivas) await access(f);
assert.equal(vivas.size, posts.filter((p) => p.image).length);
console.log(`copia de ${web}: ${json.length} posts, ${vivas.size} fotos (${nuevas} nuevas, ${sobran.length} quitadas)`);
if (sobran.length) console.log('quitadas:', sobran.map((f) => relative(raiz, f)).join(', '));
