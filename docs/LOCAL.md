# La app en tu PC (versión completa, con tu material)

La versión de GitHub Pages solo puede tener contenido público. En tu PC, la misma app incluye además **tu material con derechos** (apuntes de speaking, Sample Paper oficial con audios, tus MP3, inventario). Se ejecuta en `http://localhost:4173` y funciona sin conexión.

## 1. Instalación (una sola vez)

1. Instala **Node.js 20 LTS o superior**: <https://nodejs.org> (botón «LTS»).
2. Instala **Git**: <https://git-scm.com/downloads>.
3. Descarga el proyecto en una carpeta de tu PC, por ejemplo `Documentos/SLP`:

   ```bash
   git clone https://github.com/FMIC23/SLP.git
   ```

4. Copia tu material de Drive (`OpoIndustriales/English`, con sus subcarpetas) dentro de `SLP/material/`.
   - Lo más cómodo es instalar **Google Drive para escritorio** y copiar la carpeta, o crear un acceso directo/enlace simbólico.
   - `material/` está en `.gitignore`: **nunca se sube a GitHub**.
5. Copia también la carpeta `data/private/` que ya generé (el Sample Paper 1 estructurado y tus apuntes). Si no la tienes, el importador vuelve a crear los apuntes y los audios. Para el Sample Paper, pídemelo de nuevo en una sesión de Claude Code en tu PC.

## 2. Uso diario

- **Windows**: doble clic en `iniciar-windows.bat`.
- **macOS**: doble clic en `iniciar-mac-linux.command`. La primera vez: clic derecho → Abrir.
- **Terminal**:

  ```bash
  npm run local
  ```

El comando instala dependencias si faltan, importa tu material, valida, construye y abre el navegador en `http://localhost:4173`.

**Truco:** en Chrome o Edge, pulsa el icono «Instalar app» de la barra de direcciones. Tendrás un acceso directo en el escritorio que se abre en su propia ventana, como una app nativa.

## 3. Perfiles: Fran y Mayka

- Arriba a la izquierda hay un selector de perfil. Cada perfil tiene su propio progreso, tarjetas SM-2, plan semanal, redacciones y ajustes.
- **Fran** prioriza Speaking en las recomendaciones. **Mayka** empieza sin prioridad y la elige en *Ajustes → Destreza a priorizar*.
- En *Ajustes → Perfiles* puedes añadir, renombrar o borrar perfiles.
- El progreso se guarda en el navegador de ese PC, ligado a la dirección `http://localhost:4173`. Usa siempre el mismo navegador y el mismo puerto (los scripts ya lo hacen). Para cambiar de PC o hacer copia de seguridad: *Ajustes → Exportar progreso* (se exporta el perfil activo).

## 4. Hacer cambios en la app

1. Abre la carpeta `SLP` con **Claude Code** (escritorio o terminal: `claude` dentro de la carpeta) y pide los cambios. Claude Code en tu PC sí puede leer `material/` y `data/private/`.
2. Para verlos en vivo mientras editas:

   ```bash
   npm run dev
   ```

   Se abre en el mismo puerto 4173, así que el progreso es el mismo.
3. Antes de dar por bueno un cambio:

   ```bash
   npm test
   ```

4. Para publicar en la web pública:

   ```bash
   git add -A
   ```

   ```bash
   git commit -m "Describe el cambio"
   ```

   ```bash
   git push
   ```

   Si subes a `main`, GitHub Pages se actualiza solo. Tu material privado no se sube nunca porque está en `.gitignore`.
5. **Ojo:** la carpeta `dist/` de un build local **contiene tu material privado**. No la subas a ningún hosting público. Para la versión pública usa `npm run export:opo` (ver `docs/INTEGRACION-OPOINDUSTRIALES.md`) o deja que GitHub Actions construya.

## 5. ¿Y si quiero el material privado versionado?

Crea un repositorio **privado** (por ejemplo `FMIC23/SLP-privado`) solo para `material/` y `data/private/`, y clónalo dentro de `SLP/` en esas carpetas. Así el código sigue siendo público y tu material queda versionado sin publicarse. Otra opción es sincronizar esas dos carpetas con Google Drive.
