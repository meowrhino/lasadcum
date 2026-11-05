// /admin/: publicar y esborrar en el blog (el Worker, worker/index.mjs).
// La foto se pasa en el navegador a webp ≤ 2000 px, q85, con lo de imgToWeb
// (meowrhino/imgToWeb, js/converter.js): HEIC con heic2any y TIFF con UTIF, que se
// cargan solo si hacen falta. Safari no sabe hacer webp (ni en iPhone): ahí sale
// jpg, que el Worker también acepta.
const form = document.querySelector('form[action="/api/posts"]');
const estat = form?.querySelector('.estat');

// las librerías de imgToWeb (js/loaders.js), con SRI para no ejecutar nada alterado
const LIBS = {
  heic2any: ['https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
    'sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL'],
  UTIF: ['https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js',
    'sha384-RyBmXHdfZ/Uon+ud+/AqSyWpUWnKYt2tkRG/P4gWoRUGDU+qIAV3tGBPNlYTBZEF'],
};
const cargar = (nom) => window[nom] ? Promise.resolve(window[nom]) : new Promise((ok, ko) => {
  const s = Object.assign(document.createElement('script'), { src: LIBS[nom][0], integrity: LIBS[nom][1], crossOrigin: 'anonymous' });
  s.onload = () => ok(window[nom]);
  s.onerror = () => { s.remove(); ko(new Error(`no s’ha pogut carregar ${nom}`)); };
  document.head.append(s);
});

// con <img> el navegador aplica la orientación EXIF, como al mostrarla
const llegir = (blob) => new Promise((ok, ko) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); ok(img); };
  img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('el navegador no sap llegir aquesta imatge')); };
  img.src = url;
});

async function obrir(file) {
  if (file.type === 'image/tiff' || /\.tiff?$/i.test(file.name)) {
    const UTIF = await cargar('UTIF');
    const buf = await file.arrayBuffer();
    const [p] = UTIF.decode(buf);
    if (!p) throw new Error('tiff sense imatges');
    UTIF.decodeImage(buf, p);
    const c = Object.assign(document.createElement('canvas'), { width: p.width, height: p.height });
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(p)), p.width, p.height), 0, 0);
    return c;
  }
  try { return await llegir(file); }
  catch (e) {
    // HEIC (fotos de iPhone): Safari lo lee; Chrome y Firefox, con heic2any
    if (!/^image\/hei[cf]$/.test(file.type) && !/\.hei[cf]$/i.test(file.name)) throw e;
    const out = await (await cargar('heic2any'))({ blob: file, toType: 'image/png' });
    return llegir(Array.isArray(out) ? out[0] : out);
  }
}

async function comprimir(file) {
  const src = await obrir(file);
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
  const k = Math.min(1, 2000 / Math.max(w0, h0));
  const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w0 * k)), height: Math.max(1, Math.round(h0 * k)) });
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';   // con el de por defecto, una reducción grande sale con dientes
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const blob = (tipo) => new Promise((ok) => c.toBlob(ok, tipo, 0.85));
  let b = await blob('image/webp');
  if (b?.type !== 'image/webp') b = await blob('image/jpeg');
  if (!b) throw new Error('el navegador no ha pogut fer la imatge');
  return { b, w: c.width, h: c.height };
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boto = form.querySelector('button');
  boto.disabled = true;
  estat.textContent = 'publicant…';
  try {
    const dades = new FormData();
    dades.set('text', form.text.value);
    const file = form.image.files[0];
    if (file) {
      const { b, w, h } = await comprimir(file);
      dades.set('image', b, 'foto');
      dades.set('width', w);
      dades.set('height', h);
    }
    const r = await fetch(form.action, { method: 'POST', body: dades });
    if (!r.ok) throw new Error(await r.text());
    location.reload();
  } catch (err) {
    estat.textContent = `no s’ha publicat: ${err.message}`;
    boto.disabled = false;
  }
});

document.querySelectorAll('.esborrar').forEach((b) => b.addEventListener('click', async () => {
  if (!confirm('Esborrar aquest post?')) return;
  const r = await fetch(`/api/posts/${b.dataset.id}`, { method: 'DELETE' });
  if (r.ok) b.closest('li').remove();
  else alert(`no s’ha pogut esborrar: ${await r.text()}`);
}));
