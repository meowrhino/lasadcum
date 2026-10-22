// Lo poco que añade el navegador; sin JS la web se lee igual.
const PALETA = ['#1c7fff', '#2824b1', '#ff171a', '#ff5c00', '#00b400', '#ce00ff', '#e0a800', '#616161'];
const azar = () => Math.floor(Math.random() * PALETA.length);

// la marca: tres trozos, tres colores distintos en cada visita (billwurtz)
const mezcla = [...PALETA].sort(() => Math.random() - .5);
['--c1', '--c2', '--c3'].forEach((v, i) => document.documentElement.style.setProperty(v, mezcla[i]));

// el nombre gigante se pinta trozo a trozo al pasar por encima
document.querySelectorAll('.gigante span').forEach(s =>
  s.addEventListener('pointerenter', () => s.style.setProperty('--pinta', PALETA[azar()])));

// los vídeos solo se cargan al pedirlos: la flecha mira abajo y el vídeo sale debajo; otro clic lo cierra
document.querySelectorAll('a.video').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const li = a.parentNode, abierto = li.querySelector('iframe');
  li.classList.toggle('abierto', !abierto);
  if (abierto) return abierto.remove();
  const f = document.createElement('iframe');
  f.src = a.dataset.embed + (a.dataset.embed.includes('?') ? '&' : '?') + 'autoplay=1';
  f.allow = 'autoplay; fullscreen; picture-in-picture';
  f.allowFullscreen = true;
  li.append(f);
}));

// calendario: lo que ya ha pasado desde el último build baja a la columna gris
const hoy = new Date().toISOString().slice(0, 10);
const pasadas = document.querySelector('.pasadas');
document.querySelectorAll('.proximas li').forEach(li => {
  if (li.dataset.date < hoy) pasadas.prepend(li);
});
