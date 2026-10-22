// Lo poco que añade el navegador; sin JS la web se lee igual.
const PALETA = ['#1c7fff', '#2824b1', '#ff171a', '#ff5c00', '#00b400', '#ce00ff', '#e0a800', '#616161'];
const azar = (n = PALETA.length) => Math.floor(Math.random() * n);

// la marca: tres trozos, tres colores distintos en cada visita (billwurtz)
const mezcla = [...PALETA].sort(() => Math.random() - .5);
['--c1', '--c2', '--c3'].forEach((v, i) => document.documentElement.style.setProperty(v, mezcla[i]));

// el nombre gigante se pinta trozo a trozo al pasar por encima
document.querySelectorAll('.gigante span').forEach(s =>
  s.addEventListener('pointerenter', () => s.style.setProperty('--pinta', PALETA[azar()])));

// treballs: la portada del proyecto al pasar por el título
const cover = document.querySelector('.cover');
if (cover) document.querySelectorAll('[data-cover]').forEach(a => {
  a.addEventListener('pointerenter', () => { cover.src = a.dataset.cover; cover.hidden = false; });
  a.addEventListener('pointerleave', () => { cover.hidden = true; });
});

// el vídeo de Vimeo solo se carga al pedirlo
document.querySelectorAll('a.video').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const f = document.createElement('iframe');
  f.src = a.dataset.embed + (a.dataset.embed.includes('?') ? '&' : '?') + 'autoplay=1';
  f.allow = 'autoplay; fullscreen; picture-in-picture';
  f.allowFullscreen = true;
  a.replaceWith(f);
}));

// calendario: lo que ya ha pasado desde el último build baja a la columna gris
const hoy = new Date().toISOString().slice(0, 10);
const pasadas = document.querySelector('.pasadas');
document.querySelectorAll('.proximas li').forEach(li => {
  if (li.dataset.date < hoy) pasadas.prepend(li);
});
