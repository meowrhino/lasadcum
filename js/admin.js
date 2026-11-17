// /admin/: publicar y esborrar en el blog (el Worker, worker/index.mjs).
// La foto se pasa en el navegador a webp ≤ 2000 px, q85, con el conversor de imgToWeb, que
// se carga de su web: aquí no hay copia, y lo que cambie en meowrhino/imgToWeb
// (js/converter.js) llega solo. Hace webp también en Safari y el iPhone (su códec en wasm);
// si ni eso carga, sale jpg.
const form = document.querySelector('form[action="/api/posts"]');
const IMGTOWEB = 'https://meowrhino.github.io/imgToWeb/js/converter.js';
const estat = form?.querySelector('.estat');

async function comprimir(file) {
  const { convertToWebp } = await import(IMGTOWEB).catch(() => {
    throw new Error('no s’ha pogut carregar el conversor (imgToWeb); torna a carregar la pàgina');
  });
  const { blob, dimensions } = await convertToWebp(file, { quality: 0.85, maxDimension: 2000, jpegFallback: true });
  return { b: blob, w: dimensions.width, h: dimensions.height };
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
