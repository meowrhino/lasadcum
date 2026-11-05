// Lo poco que añade el navegador; sin JS la web se lee igual.
// los colores de la marca, los de data/site.json → "colors" (el build los pone en <html data-colors>)
const PALETA = (document.documentElement.dataset.colors || '').split(' ').filter(Boolean);
const azar = () => Math.floor(Math.random() * PALETA.length);

// la marca: tres trozos, tres colores distintos en cada visita (billwurtz); con menos de tres
// en la lista, los de css/style.css
const mezcla = [...PALETA].sort(() => Math.random() - .5);
if (mezcla.length >= 3) ['--c1', '--c2', '--c3'].forEach((v, i) => document.documentElement.style.setProperty(v, mezcla[i]));

// al tocar, unos ✨ saltan un poco y caen girando, como purpurina (con «reducir movimiento», no).
// Cuántos y de qué tamaño, en data/site.json → "sparkles" (el build los pone en <html data-sparkles>)
const r = (a, b) => a + Math.random() * (b - a);
const [cuantos = 3, tam = 22] = (document.documentElement.dataset.sparkles || '').split(' ').filter(Boolean).map(Number);
if (cuantos > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  addEventListener('pointerdown', e => {
    const k = tam / 13;   // los más grandes, más lejos
    for (let i = cuantos; i--;) {
      const s = Object.assign(document.createElement('span'), { textContent: '✨', ariaHidden: 'true' });
      s.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:20;font-size:${r(.75, 1.25) * tam}px;`
        + 'line-height:1;pointer-events:none;translate:-50% -50%';
      document.body.append(s);
      const vx = r(-38, 38) * k, sube = r(22, 40) * k, cae = r(50, 80) * k, gira = r(-200, 200);
      s.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 1 },
        { transform: `translate(${vx / 2}px,${-sube}px) rotate(${gira * .4}deg) scale(1)`, opacity: 1, offset: .3, easing: 'ease-in' },
        { transform: `translate(${vx}px,${cae}px) rotate(${gira}deg) scale(.7)`, opacity: 0 },
      ], { duration: r(850, 1100), easing: 'ease-out' }).onfinish = () => s.remove();
    }
  });

// el nombre gigante se pinta trozo a trozo al pasar por encima
document.querySelectorAll('.gigante span').forEach(s =>
  s.addEventListener('pointerenter', () => s.style.setProperty('--pinta', PALETA[azar()])));

// treballs: la portada del proyecto al pasar por el título
const cover = document.querySelector('.cover');
if (cover) document.querySelectorAll('[data-cover]').forEach(a => {
  a.addEventListener('pointerenter', () => { cover.src = a.dataset.cover; cover.hidden = false; });
  a.addEventListener('pointerleave', () => { cover.hidden = true; });
});

// lo nuestro que se abre en otra pestaña (Guillem, desde el about), en el móvil va en la misma
if (matchMedia('(pointer: coarse)').matches)
  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    if (a.origin === location.origin) a.removeAttribute('target');
  });

// about: una foto del blog al azar (sin JS, la del post más nuevo; con el Worker ya llega solo una)
const fotos = [...document.querySelectorAll('.azar img')].sort(() => Math.random() - .5);
fotos.forEach((img, i) => (img.hidden = i > 0));


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
