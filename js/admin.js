// /admin/: publicar y esborrar en el blog (el Worker, worker/index.mjs).
// La foto se pasa en el navegador a webp ≤ 2000 px, q85, como imgToWeb. Safari no
// sabe hacer webp (ni en iPhone): ahí sale jpg, que el Worker también acepta.
const form = document.querySelector('form[action="/api/posts"]');
const estat = form?.querySelector('.estat');

async function comprimir(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = (tipo) => new Promise((ok) => c.toBlob(ok, tipo, 0.85));
  let b = await blob('image/webp');
  if (b?.type !== 'image/webp') b = await blob('image/jpeg');
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
