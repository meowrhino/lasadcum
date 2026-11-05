# Traspaso: la web y el blog a la cuenta de laSADCUM

Se le pasa una copia del repositorio a su cuenta de GitHub, y la publica **Workers Builds en su
Cloudflare** con `lasadcum.com`: la web (`dist/`) y el Worker del blog (`worker/index.mjs`), con
sus posts en D1 y sus fotos en R2, todo en su cuenta. El de meowrhino se queda de archivo en
`meowrhino.github.io/lasadcum/` (sin indexar, con los posts de ejemplo). Desde el traspaso son
dos repositorios separados: los cambios, en el suyo.

Tiempo: unos 30 minutos, más lo que tarden los DNS.

## Antes

- [ ] `main` al día y sin cambios a medias (`git status` limpio), y `node build/build.mjs` sin ✗.
- [ ] Traen el ordenador con **VS Code y git** (Mac: `xcode-select --install`; `git --version` lo comprueba).
- [ ] Tienen cuenta de GitHub. Su usuario: `<su-usuario>`.
- [ ] Su cuenta de Cloudflare con `lasadcum.com` dentro (el DNS).
- [ ] **R2 activado** en su Cloudflare (*R2 Object Storage* → *Purchase R2 Plan*, el gratis). Pide
      una tarjeta aunque no cobre: que la pongan ellos. Sin R2, el primer deploy falla.
- [ ] La contraseña del blog, la que han elegido. **No se escribe en el repo** (es público): solo
      en Cloudflare, paso 3.

## 1. Su copia, sin historial

- [ ] En su cuenta, **New repository** → `lasadcum`, vacío (sin README ni licencia). Puede ser
      **privado**: lo publica Cloudflare, no Pages.
- [ ] Desde esta carpeta:
      ```bash
      rm -rf /tmp/lasadcum && mkdir /tmp/lasadcum && git archive HEAD | tar -x -C /tmp/lasadcum
      cd /tmp/lasadcum && rm -r CLAUDE.md TRASPASO.md manus
      git init -b main && git add -A && git commit -m "La web de laSADCUM"
      git push https://github.com/<su-usuario>/lasadcum.git main
      ```
      (si pide permiso, que nos añada antes como colaboradores, paso 5). Nada de `push --mirror`.
- [ ] En su copia no van `CLAUDE.md`, `TRASPASO.md` ni `manus/` (son nuestros). `GUIA.md` y
      `README.md` sí.

## 2. Workers Builds, en su Cloudflare

- [ ] *Workers & Pages* → *Create* → *Import a repository* → su `lasadcum`. Lo que sale por
      defecto vale; **Project name: `lasadcum`** (el `name` de `wrangler.jsonc`: si ponen otro,
      falla).
- [ ] **Antes del primer deploy, el bucket de R2**: *R2 Object Storage* → *Create bucket* →
      `lasadcum-blog`. Wrangler no lo crea (lasadcum, 2026-11-05: falló con "R2 bucket not
      found"); D1 sí, solo, con el primer deploy.
- [ ] Sale en `lasadcum.<su-subdominio>.workers.dev`, con `noindex` (todavía sin `url`).

## 3. La contraseña del blog

- [ ] *Workers* → **lasadcum** → *Settings* → *Variables and Secrets* → *Add* → tipo **Secret**,
      nombre `PASSWORD`, valor: la suya. La escriben ellos. **No en *Build → Variables and
      secrets*** (eso solo lo ve el build) **ni como *Text*** (el siguiente deploy lo borra):
      lasadcum, 2026-11-05. Si falta, `/api/login` lo dice.
- [ ] En `…workers.dev/admin/`: entra con la contraseña y **sortir** cierra la sesión.

## 4. El dominio

- [ ] *Workers* → **lasadcum** → *Settings* → *Domains & Routes* → *Add* → *Custom domain*:
      `lasadcum.com`, y otro con `www.lasadcum.com`. Si el dominio apuntaba a Cargo, quitar antes
      esos registros DNS.
- [ ] En su copia, `data/site.json` → `"url": "https://lasadcum.com"`, commit y push (lo hacen
      ellos, como en la GUIA: es su primer cambio). Desde aquí se indexa.

## 5. Que nos dejen entrar

- [ ] GitHub, su repo: *Settings* → *Collaborators* → `meowrhino`, con **Write**.
- [ ] Cloudflare: *Manage account* → *Members* → nuestro correo, para ver los builds y los logs
      del Worker.

## 6. Comprobar en lasadcum.com

- [ ] La portada, `/trabajos/`, un proyecto, `/calendario/`, `/about/` y lo mismo en `/es/` y `/en/`.
- [ ] `view-source:`: `canonical` y `og:url` con `lasadcum.com`, y **sin** `noindex`.
      `/robots.txt` dice `Allow`; `/sitemap.xml`, con su dominio.
- [ ] Compartir un proyecto por WhatsApp: sale su foto.
- [ ] **El blog, desde su móvil**: `/admin/`, la contraseña, un post de prueba con una foto de la
      cámara → sale en `/blog/` y su foto en el about. Luego **esborrar**, y ya no sale.
- [ ] En `/about/`, la firma `web: meowrhino.studio`.

## 7. En su ordenador

Con ellos delante, siguiendo [GUIA.md](GUIA.md) (punto 0):

- [ ] Clonan **su** repo, en una carpeta **fuera de Google Drive** (ni iCloud ni Dropbox).
- [ ] Su nombre para git, en la terminal de VS Code **de su ordenador**: `git config --global
      user.name "…"` y `git config --global user.email "…"` (el de su cuenta de GitHub).
- [ ] Live Server: **Go Live** y ve la vista previa (si otra web ya tiene el puerto 5500, pararla).
- [ ] El cambio del `url` (paso 4), Commit → Sync, y en GitHub la bolita verde de Cloudflare.

## 8. Al acabar

- [ ] **Pendiente: el dominio está en camino** (2026-11-05). Hasta entonces la web va en
      `lasadcum.lasadcum.workers.dev` con `noindex`, y Google no ve nada. Al llegar, el paso 4 y,
      con él, esto.
- [ ] Search Console con su cuenta de Google: dar de alta `lasadcum.com` como **propiedad de
      dominio** (el TXT, en su DNS de Cloudflare) y, en *Sitemaps*, enviar
      `https://lasadcum.com/sitemap.xml`. En *Inspección de URLs*, `https://lasadcum.com/blog/` →
      *Solicitar indexación*: así entran antes los posts y sus fotos (llevan `alt` con el texto
      del post, para Google Imágenes). Que salgan al buscar «lasadcum» tarda semanas.
- [ ] Fila de lasadcum en `JAMstack/inventario.md` con las dos direcciones.
- [ ] Nuestra copia sigue en github.io con `noindex` y los posts de ejemplo: no compite en Google.
