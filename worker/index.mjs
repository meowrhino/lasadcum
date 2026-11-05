/* ============================================================
   worker/index.mjs — el blog de laSADCUM.
   ------------------------------------------------------------
   Cloudflare sirve la web (dist/) sin pasar por aquí. Solo llegan las
   rutas de run_worker_first (wrangler.jsonc):

     /blog/                los posts, dentro del HTML (se leen sin JS)
     /about/ (y es, en)    una foto de los posts, al azar
     /admin/               publicar y esborrar (con la contraseña)
     /api/*                login, logout, posts, export
     /media/*              las fotos de los posts, de R2

   Los posts en D1 (la tabla se crea sola) y las fotos en R2. Un solo
   secreto, PASSWORD: la contraseña de /admin/, que firma también la
   sesión (si se cambia, hay que volver a entrar). Las plantillas son
   las del build (build/paginas.mjs): un post sale igual aquí que en
   la vista previa.
   ============================================================ */
import { pintarPost, fotoPost } from '../build/paginas.mjs';

const SESION = 'sadcum';
const DIAS = 60;
const MAX_TEXT = 4000;
const MAX_FOTO = 5 * 1024 * 1024;   // ya comprimida en el navegador (js/admin.js) pesa mucho menos
const TIPOS = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/* ---------- D1: la tabla se crea la primera vez, sin migrar nada a mano ---------- */
let preparada = null;
function db(env) {
  preparada ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      image_key TEXT,
      image_width INTEGER,
      image_height INTEGER,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      deleted_at TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC, id DESC)'),
  ]).catch((e) => { preparada = null; throw e; });
  return preparada.then(() => env.DB);
}

/** Un post con la forma de data/blog-ejemplo.json, la que pinta pintarPost. */
const comoPost = (r) => ({
  id: r.id, created_at: r.created_at, text: r.text,
  ...(r.image_key && { image: { src: `/media/${r.image_key}`, width: r.image_width, height: r.image_height } }),
});
const VISIBLES = 'SELECT * FROM posts WHERE deleted_at IS NULL';
const leer = async (env, sql) => (await (await db(env)).prepare(sql).all()).results.map(comoPost);
const posts = (env) => leer(env, `${VISIBLES} ORDER BY created_at DESC, id DESC`);

/* ---------- la sesión: una cookie con la hora, firmada con la contraseña ---------- */
async function firmar(env, msg) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// sin salir antes al primer carácter distinto: no dice por el tiempo cuánto se ha acertado
function iguales(a, b) {
  let r = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}
async function dentro(req, env) {
  if (!env.PASSWORD) return false;
  const c = /(?:^|;\s*)sadcum=(\d+)\.([0-9a-f]+)/.exec(req.headers.get('cookie') || '');
  return !!c && Date.now() - Number(c[1]) < DIAS * 864e5 && iguales(c[2], await firmar(env, c[1]));
}
const cookie = (valor, edad) => `${SESION}=${valor}; Path=/; Max-Age=${edad}; HttpOnly; Secure; SameSite=Strict`;
// lo que escribe tiene que venir de la propia web (un formulario de otra no puede)
const deAqui = (req) => req.headers.get('origin') === new URL(req.url).origin;

const texto = (msg, status) => new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
const ir = (url, extra = {}) => new Response(null, { status: 303, headers: { location: url, ...extra } });

/* ---------- las páginas del build, con lo de D1 dentro ---------- */
async function rellenar(req, env, selector, html) {
  // sin If-None-Match: la página cambia con cada post aunque el fichero no
  const res = await env.ASSETS.fetch(new Request(req.url));
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return res;
  let dentroHtml = '';
  try { dentroHtml = await html(); } catch (e) { console.error('el blog no ha podido leer D1:', e); }
  const headers = new Headers(res.headers);
  headers.delete('etag');
  headers.set('cache-control', 'no-store');
  return new HTMLRewriter()
    .on(selector, { element: (el) => { el.setInnerContent(dentroHtml, { html: true }); } })
    .transform(new Response(res.body, { status: res.status, headers }));
}

async function login(req, env) {
  if (!deAqui(req)) return texto('no', 403);
  if (!env.PASSWORD) return texto('Falta el secret PASSWORD a Cloudflare: Workers → lasadcum → Settings → Variables and Secrets (GUIA, punt 8).', 500);
  // sin los espacios de los lados: un espacio de más al pegarla no deja fuera
  const pw = String((await req.formData()).get('password') || '').trim();
  let libre = true;   // diez intentos por minuto y por IP (wrangler.jsonc → ratelimits)
  try { libre = (await env.LOGIN_LIMIT?.limit({ key: req.headers.get('cf-connecting-ip') || 'local' }))?.success ?? true; }
  catch (e) { console.error('sin límite de intentos:', e); }
  if (libre && iguales(pw, env.PASSWORD.trim())) {
    const ara = String(Date.now());
    return ir('/admin/', { 'set-cookie': cookie(`${ara}.${await firmar(env, ara)}`, DIAS * 86400) });
  }
  // en Workers → lasadcum → Logs: por qué no ha entrado (sin nada de la contraseña)
  console.log('login fallido', { libre });
  await new Promise((r) => setTimeout(r, 1000));
  const res = await env.ASSETS.fetch(new Request(new URL('/login/', req.url)));
  return new HTMLRewriter().on('.error', { element: (el) => { el.removeAttribute('hidden'); } })
    .transform(new Response(res.body, { status: 401, headers: res.headers }));
}

async function publicar(req, env) {
  const f = await req.formData();
  const text = String(f.get('text') || '').trim();
  if (!text) return texto('falta el text', 400);
  if (text.length > MAX_TEXT) return texto(`el text és massa llarg (màx. ${MAX_TEXT} caràcters)`, 400);
  const img = f.get('image');
  let key = null, w = null, h = null;
  if (img && typeof img === 'object' && img.size) {
    const ext = TIPOS[img.type];
    if (!ext) return texto('la imatge ha de ser webp, jpg o png', 400);
    if (img.size > MAX_FOTO) return texto('la imatge pesa massa (màx. 5 MB)', 400);
    w = Number(f.get('width'));
    h = Number(f.get('height'));
    if (![w, h].every((n) => Number.isInteger(n) && n > 0 && n <= 10000)) return texto('falten les mides de la imatge', 400);
    const d = new Date().toISOString();
    key = `${d.slice(0, 4)}/${d.slice(5, 7)}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key, await img.arrayBuffer(), { httpMetadata: { contentType: img.type } });
  }
  const fila = await (await db(env))
    .prepare('INSERT INTO posts (text, image_key, image_width, image_height) VALUES (?, ?, ?, ?) RETURNING *')
    .bind(text, key, w, h).first();
  return Response.json(comoPost(fila), { status: 201 });
}

// esborrar es borrado blando: el post y su foto se quedan, y salen en /api/export
async function esborrar(id, env) {
  const r = await (await db(env))
    .prepare("UPDATE posts SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND deleted_at IS NULL")
    .bind(Number(id)).run();
  return r.meta.changes ? Response.json({ ok: true }) : texto('no hi és', 404);
}

// la foto de un post esborrat deja de salir (sigue en R2, por si hay que recuperarlo)
async function media(key, env) {
  const viva = await (await db(env)).prepare('SELECT 1 FROM posts WHERE image_key = ? AND deleted_at IS NULL').bind(key).first();
  const o = viva && await env.MEDIA.get(key);
  if (!o) return texto('no hi és', 404);
  const headers = new Headers();
  o.writeHttpMetadata(headers);
  headers.set('etag', o.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(o.body, { headers });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname, m = req.method;
    try {
      if (p === '/blog/') return rellenar(req, env, 'ol.posts', async () => (await posts(env)).map((x) => pintarPost(x)).join('\n'));
      if (/^\/((es|en)\/)?about\/$/.test(p)) return rellenar(req, env, 'div.azar', async () =>
        (await leer(env, `${VISIBLES} AND image_key IS NOT NULL ORDER BY RANDOM() LIMIT 1`)).map((x) => fotoPost(x)).join('\n'));
      // las claves (2026/11/<uuid>.webp) no llevan nada que descodificar
      if (p.startsWith('/media/') && (m === 'GET' || m === 'HEAD')) return media(p.slice(7), env);
      if (p === '/api/posts' && m === 'GET') return Response.json(await posts(env));
      if (p === '/api/login' && m === 'POST') return login(req, env);
      if (p === '/api/logout' && m === 'POST') return ir('/', { 'set-cookie': cookie('', 0) });

      // a partir de aquí, con la contraseña
      const ok = await dentro(req, env);
      if (p === '/admin/') return ok
        ? rellenar(req, env, 'ol.posts', async () => (await posts(env)).map((x) => pintarPost(x, { borrar: true })).join('\n'))
        : ir('/login/');
      if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
      if (!ok) return texto('cal entrar amb la contrasenya (torna a /admin/)', 401);
      if (p === '/api/export' && m === 'GET') {
        const tot = (await (await db(env)).prepare('SELECT * FROM posts ORDER BY id').all()).results;
        return Response.json(tot, { headers: { 'content-disposition': `attachment; filename="blog-${new Date().toISOString().slice(0, 10)}.json"` } });
      }
      if (!deAqui(req)) return texto('no', 403);
      if (p === '/api/posts' && m === 'POST') return publicar(req, env);
      const id = /^\/api\/posts\/(\d+)$/.exec(p)?.[1];
      if (id && m === 'DELETE') return esborrar(id, env);
      return texto('no hi és', 404);
    } catch (e) {
      console.error(e);
      return texto(`error del blog: ${e.message}`, 500);
    }
  },
};
