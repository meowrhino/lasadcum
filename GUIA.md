# Guía: cómo actualizar la web de laSADCUM

Esta guía es para cambiar la web sin depender de nadie: un trabajo nuevo, una fecha del
calendario, el texto del about… Todo se hace con **Visual Studio Code**, un programa gratuito:
cambiáis los ficheros en el ordenador y, al subirlos, la web se publica sola.

> **La regla de oro**: solo se tocan **dos carpetas**: `data/` (lo general: el about, el
> calendario, el menú, el CV de Guillem) y `projects/` (cada trabajo, con sus fotos). Lo demás
> es el código: mejor no tocarlo.

Cuando subís un cambio, la web se actualiza sola en **1 o 2 minutos**. Si os equivocáis en algo,
la web **no se rompe**: se queda como estaba hasta que lo arregléis (punto 8, *Si algo sale en rojo*).

---

## 0. Antes de empezar (solo la primera vez)

1. Haceos una cuenta en [github.com](https://github.com) y pasadnos el nombre de usuario.
2. Os pasamos **una copia de la web a vuestra cuenta**: desde ese momento es vuestra.
3. Instalad **Visual Studio Code**: https://code.visualstudio.com
4. Abridlo y traed la web: a la izquierda, el icono de las ramas (**Source Control**) →
   **Clone Repository** → **Clone from GitHub** → entrad con vuestra cuenta → elegid la web →
   elegid una carpeta del ordenador → **Open**. Si pide instalar Git, aceptad.
   **Esa carpeta, fuera de Google Drive o Dropbox**: se pelean con los ficheros de Git.
5. Instalad la extensión **Live Server** (en VS Code, el icono de los cuadraditos → buscad
   "Live Server" → **Install**). Es para ver los cambios antes de subirlos (punto 7).

Para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/ (las pasa al
formato de la web, `.webp`, al tamaño justo). **Abridlo con Chrome o Firefox**, no con Safari:
Safari no sabe hacer `.webp`.

---

## 1. Cómo está organizado

```
data/
  site.json          ← lo general: las listas de treballs, el menú, Instagram, Vimeo, la newsletter
  about.json         ← el texto del about, en ca, es y en
  agenda.json        ← el calendario: una fecha, un bloque
  guillem.json       ← el CV de Guillem (about → Guillem Jiménez)
projects/
  navaja/
    project.json     ← el texto, los créditos, los vídeos…
    img/1.webp       ← las fotos, por número: 1.webp, 2.webp, 3.webp…
  everafter/
  …
```

**Un trabajo, una carpeta.** El nombre de la carpeta es también su dirección en la web
(`projects/navaja/` → `lasadcum.com/trabajos/navaja/`): minúsculas, números y guiones, sin
acentos ni espacios.

---

## 2. Cómo se hace un cambio

1. **Antes de nada, bajad la última versión**: en la barra de abajo del todo, las flechas ⟳
   (**Sync**). Así tenéis lo que está publicado.
2. A la izquierda, abrid el fichero (por ejemplo `data/agenda.json`) y cambiad lo que haga
   falta. Guardad con **Cmd+S**.
   Si algo sale **subrayado en rojo**, hay una coma o unas comillas mal, o un campo mal
   escrito: arregladlo antes de seguir (punto 8). **VS Code os ayuda**: si pasáis el ratón por
   encima de un campo (`"title"`, `"year"`…) os dice qué es, y dentro de las llaves,
   **Ctrl+Espacio** os enseña qué campos se pueden poner. Lo sabe por la primera línea de cada
   JSON (`"$schema": …`): **no la borréis**.
3. Mirad cómo queda (punto 7) si queréis.
4. A la izquierda, el icono de las ramas (**Source Control**): escribid en una línea qué habéis
   cambiado ("calendario: fechas de febrero") y pulsad **Commit**.
5. Pulsad **Sync Changes** (el mismo botón azul). Ya está.

**Para ver si se ha publicado**: en la página de la web en GitHub, al lado del último cambio sale
una bolita: amarilla mientras se publica, verde ✓ cuando ya está, roja ✗ si algo ha fallado
(entonces, el punto 8).

---

## 3. Los tres idiomas

Cualquier texto se puede escribir de dos maneras:

```json
"title": "NAVAJA"
"kind": { "ca": "peça escènica", "es": "pieza escénica", "en": "stage piece" }
```

La primera, para lo que no se traduce (nombres, títulos de obra). La segunda, para todo lo
demás. **Si falta un idioma, sale el catalán** (o el que haya). Los textos largos van en
párrafos: una lista de textos, cada uno entre comillas y separados por comas:

```json
"text": {
  "ca": ["Primer paràgraf.", "Segon paràgraf."],
  "es": ["Primer párrafo.", "Segundo párrafo."],
  "en": ["First paragraph.", "Second paragraph."]
}
```

Dentro de un texto, `**así**` sale en negrita y `[así](https://…)` es un enlace.

---

## 4. Añadir un trabajo

1. **Copiad la carpeta de un trabajo parecido** dentro de `projects/` (clic derecho → *Copy* y
   *Paste*) y ponedle el nombre nuevo: `projects/nombre-del-trabajo/`.
2. **Las fotos**: pasadlas por imgToWeb, que las llama `1.webp`, `2.webp`… y metedlas en su
   `img/` (borrad las de la carpeta que habéis copiado). Arrastrarlas a la columna de la
   izquierda de VS Code ya vale.
3. **El `project.json`**: cambiad los campos (la tabla, abajo).
4. **Que salga en la web**: en `data/site.json` → `lists`, añadid el nombre de la carpeta a la
   lista que toque, en el sitio en que tiene que salir:

```json
"propias": {
  "name": { "ca": "Produccions pròpies", "es": "Producciones propias", "en": "Own productions" },
  "projects": ["everafter", "nombre-del-trabajo", "navaja", …]
}
```

Un trabajo que va **dentro de otro** (como la cápsula dentro de ACLUCALLS) se pone así:
`{ "project": "aclucalls", "parts": ["capsula-aclucalls"] }`. Y uno que tiene que tener su
página pero **no salir en la lista** (para mandarlo a alguien): `{ "project": "x", "visible": false }`.

| campo | qué es | ejemplo |
|---|---|---|
| `title` | el título | `"NAVAJA"` |
| `year` | el año, sin comillas | `2024` |
| `kind` | *(opcional)* la línea gris de debajo del título | `{ "ca": "peça escènica / laSADCUM", … }` |
| `text` | el texto, en párrafos y por idioma | `{ "ca": ["…"], "es": ["…"], "en": ["…"] }` |
| `awards` | *(opcional)* los premios, uno por línea | `{ "ca": ["Premi …"], … }` |
| `credits` | la ficha artística, un rol por línea | `[{ "role": { "ca": "Direcció", "es": "Dirección", "en": "Director" }, "name": "Guillem Jiménez" }]` |
| `videos` | *(opcional)* YouTube o Vimeo. Sin `title` dice «veure el tràiler» | `[{ "url": "https://youtu.be/…", "title": "Trailer" }]` |
| `photo_credit` | *(opcional)* quién ha hecho las fotos | `"Fotos: Alan Gomis"` |
| `cover` | la foto que sale al compartir el enlace (WhatsApp, Instagram…), por su número | `"1"` |
| `photos` | las fotos, en el orden en que salen | `["1", "2", "3"]` |
| `description` | *(opcional)* lo que sale en Google y al compartir; si no está, el primer párrafo | `{ "ca": "…", … }` |

---

## 5. Añadir una fecha al calendario

En `data/agenda.json`, **copiad un bloque que ya esté** (de `{` a `},`, con la coma) y cambiad
los campos. El orden da igual: la web ordena por fecha y pasa sola al gris lo que ya ha pasado.

```json
{
  "date": "2027-02-25",
  "days": "25/02",
  "text": {
    "ca": "EVERAFTER / Mercat de les Flors, Barcelona (Espanya)",
    "es": "EVERAFTER / Mercat de les Flors, Barcelona (España)",
    "en": "EVERAFTER / Mercat de les Flors, Barcelona (Spain)"
  },
  "link": "https://mercatflors.cat/es/espectacle/everafter/"
},
```

| campo | qué es | ejemplo |
|---|---|---|
| `date` | el primer día, siempre `AAAA-MM-DD`: con esta se ordena | `"2027-02-25"` |
| `days` | cómo se escriben los días | `"25/02"`, `"24 i 25/05"`, `"05 al 28/05"` |
| `text` | qué y dónde | `"NAVAJA / La Mutant, Valencia (Espanya)"` |
| `link` | *(opcional)* a dónde lleva: entradas, la web del festival | `"https://…"` |

---

## 6. El about, Guillem y lo general

- **El about**: `data/about.json`, un párrafo por línea en cada idioma.
- **El CV de Guillem**: `data/guillem.json`, una línea por cosa, en el orden en que salen.
- **Instagram, Vimeo, la newsletter, el correo**: `data/site.json`. El correo, `"email"`: mientras
  sea `null`, no sale.
- **Los textos fijos** (el menú, «veure el tràiler», «Per veure la peça completa…»):
  `data/site.json` → `menu`.

**Lo que sale en Google y al compartir**: el título de cada trabajo, su `description` (o el primer
párrafo) y su foto `cover`; en el resto de páginas, `description` de `data/site.json`. Mientras
`"url"` de `data/site.json` sea `null` (sin dominio), Google no la indexa.

---

## 7. Ver los cambios antes de subirlos

En VS Code, el botón **Go Live** (abajo a la derecha): se abre la web en el navegador, con
vuestros cambios, y se recarga sola cada vez que guardáis. Si algo no se publicaría (una foto que
no está, una coma), en vez de la página sale qué es y dónde. Los avisos (un texto que falta en un
idioma, una foto que pesa demasiado) salen en una franja amarilla arriba.

---

## 8. Si algo sale en rojo

**Casi siempre es una coma.** Lo que más pasa:

- **Una coma de más** al final de una lista o de un bloque: `["1", "2",]` → `["1", "2"]`.
- **Una coma de menos** entre dos bloques: `} {` → `}, {`.
- **Unas comillas sin cerrar**: `"title": "NAVAJA` → `"title": "NAVAJA"`.
- **Una foto que no está**: en `photos` pone `"7"` pero en `img/` no hay `7.webp`.
- **Un nombre de carpeta mal escrito** en `data/site.json` → `lists`.

Si la bolita del último cambio sale roja ✗, pulsadla: el mensaje dice qué fichero y qué línea.
La web sigue como estaba hasta que lo arregléis y volváis a subir. Si no sale, escribidnos.

---

Web: [meowrhino.studio](https://meowrhino.studio)
