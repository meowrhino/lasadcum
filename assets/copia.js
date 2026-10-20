// Lo mínimo del JS de Cargo: modo móvil, tamaño de letra y slideshow de fondo.
function size() {
  const mobile = innerWidth < 768;
  document.body.classList.toggle('mobile', mobile);
  document.documentElement.style.fontSize = mobile ? '86.25%' : '72%';
}
size();
addEventListener('resize', size);

document.querySelectorAll('[data-backdrop] .slick-track').forEach(track => {
  const slides = track.querySelectorAll('.slick-slide:not(.slick-cloned)');
  // Cargo solo había cargado las primeras; el resto tiene la foto en data-lazy
  const load = s => s?.querySelectorAll('img:not([src])').forEach(img => img.src = img.dataset.lazy);
  let i = 0;
  slides[0]?.classList.add('on');
  load(slides[0]); load(slides[1]);
  if (slides.length > 1) setInterval(() => {
    slides[i].classList.remove('on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('on');
    load(slides[(i + 1) % slides.length]);
  }, 2600);
});
