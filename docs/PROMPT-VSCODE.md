# Instalar la app completa en tu PC con Claude Code (VS Code)

## Antes (5 minutos, una sola vez)
1. Descarga de tu Drive `OpoIndustriales/English/SLP-data-private.zip` y déjalo en tu carpeta **Descargas**. No lo descomprimas.
2. Crea una carpeta vacía, por ejemplo `Documentos/SLP`, y ábrela en VS Code con *Archivo → Abrir carpeta*.
3. Abre el panel de Claude Code y pega el prompt de abajo.

## Prompt

```text
Instala en ESTA carpeta (vacía) mi app de inglés C1/SLP 3 en modo local completo. Hazlo todo tú y pregúntame solo si algo falla:

1. Comprueba que tengo Node.js >= 20 y Git (node -v, git --version). Si falta alguno, instálalo (Windows: winget install OpenJS.NodeJS.LTS / Git.Git; macOS: brew o el instalador oficial) y dime si tengo que reiniciar VS Code.
2. Clona https://github.com/FMIC23/SLP.git en la carpeta actual (git clone https://github.com/FMIC23/SLP.git .).
3. Busca SLP-data-private.zip en mi carpeta de Descargas (Windows: %USERPROFILE%\Downloads; macOS/Linux: ~/Downloads) y descomprímelo dentro de data/ para que quede data/private/... (debe contener reading/, useofenglish/, listening/, writing/ y vocabulary/). No subas nunca nada de data/private ni de material/ a git (ya están en .gitignore; compruébalo con git status).
4. Busca mi carpeta de Google Drive para escritorio "OpoIndustriales/English" (Windows: suele estar en G:\Mi unidad\OpoIndustriales\English o en la letra que use Drive; macOS: ~/Library/CloudStorage/GoogleDrive-*/Mi unidad/OpoIndustriales/English). Si existe, copia su contenido dentro de material/, manteniendo subcarpetas y excluyendo vídeos .mkv/.mp4 y archivos .rar/.zip. Si no tengo Drive para escritorio, sáltate este paso y dímelo al final.
5. Ejecuta npm install, npm test y npm run local. Comprueba que se abre http://localhost:4173, que arriba aparecen los perfiles Fran y Mayka y que en Reading/Use of English/Listening hay ejercicios marcados como "privado" (Sample Paper 1).
6. Crea en mi escritorio un acceso directo llamado "Inglés C1-SLP" que ejecute iniciar-windows.bat (Windows) o iniciar-mac-linux.command (macOS) de esta carpeta.
7. Resúmeme en 5 líneas qué has hecho y cómo abrir la app a partir de ahora.
```

## Después
- Para abrir la app: doble clic en el acceso directo «Inglés C1-SLP». En Chrome o Edge puedes pulsar además «Instalar app».
- Para cambiar cosas: abre esta carpeta en VS Code y pídeselo a Claude Code, por ejemplo «añade un simulacro de…». Si quieres publicar el cambio en la web pública, dile también que haga commit y push a `main`.
- Para actualizar con lo último de GitHub: pide a Claude Code «actualiza la app con git pull y vuelve a abrirla».
