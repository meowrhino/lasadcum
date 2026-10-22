// Lo poco que añade el navegador; sin JS la web se lee igual.
// todos los colores con nombre de HTML (es.wikipedia.org/wiki/Colores_web), como los escribe
// billwurtz: también los amarillos y los casi blancos, que sobre blanco casi desaparecen
const PALETA = [
  'lightcoral', 'salmon', 'indianred', 'red', 'crimson', 'firebrick', 'brown', 'darkred', 'maroon',
  'papayawhip', 'blanchedalmond', 'bisque', 'moccasin', 'peachpuff', 'navajowhite', 'lightsalmon',
  'darksalmon', 'orange', 'darkorange', 'coral', 'tomato', 'orangered', 'wheat', 'burlywood', 'tan',
  'sandybrown', 'goldenrod', 'peru', 'darkgoldenrod', 'chocolate', 'sienna', 'saddlebrown',
  'lightyellow', 'cornsilk', 'lemonchiffon', 'lightgoldenrodyellow', 'palegoldenrod', 'khaki',
  'yellow', 'gold', 'darkkhaki', 'olive', 'greenyellow', 'chartreuse', 'lawngreen', 'yellowgreen',
  'olivedrab', 'darkolivegreen', 'palegreen', 'lightgreen', 'mediumspringgreen', 'springgreen',
  'lime', 'darkseagreen', 'limegreen', 'mediumseagreen', 'seagreen', 'forestgreen', 'green',
  'darkgreen', 'lightcyan', 'paleturquoise', 'aquamarine', 'turquoise', 'mediumturquoise',
  'darkturquoise', 'mediumaquamarine', 'lightseagreen', 'cadetblue', 'darkcyan', 'teal', 'lavender',
  'powderblue', 'lightblue', 'lightskyblue', 'skyblue', 'lightsteelblue', 'deepskyblue',
  'cornflowerblue', 'dodgerblue', 'steelblue', 'royalblue', 'blue', 'mediumblue', 'darkblue',
  'navy', 'midnightblue', 'darkslateblue', 'thistle', 'plum', 'violet', 'orchid', 'mediumpurple',
  'mediumorchid', 'mediumslateblue', 'slateblue', 'blueviolet', 'darkviolet', 'darkorchid',
  'darkmagenta', 'purple', 'indigo', 'mistyrose', 'pink', 'lightpink', 'hotpink', 'rosybrown',
  'palevioletred', 'deeppink', 'mediumvioletred', 'white', 'whitesmoke', 'snow', 'seashell',
  'linen', 'antiquewhite', 'oldlace', 'floralwhite', 'ivory', 'beige', 'honeydew', 'mintcream',
  'azure', 'aliceblue', 'ghostwhite', 'lavenderblush', 'gainsboro', 'lightgrey', 'silver',
  'darkgray', 'lightslategray', 'slategray', 'gray', 'dimgray', 'darkslategray', 'black',
];
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
