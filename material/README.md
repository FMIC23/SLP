# material/ — tu material personal (NO se publica)

Todo lo que pongas aquí está en `.gitignore`. Copia (o sincroniza con Google Drive para escritorio / rclone)
el contenido de tu carpeta de Drive `OpoIndustriales/English` aquí, manteniendo las subcarpetas, y ejecuta:

```bash
npm run import:material
```

El importador genera, solo en local (`data/private/` y `public/private/`, también ignorados por git):
- `data/private/material-index.json`: inventario de archivos (visible en Recursos).
- `data/private/vocabulary/speaking-phrases.json`: tus apuntes `speaking top.docx` convertidos en flashcards por tema.
- `public/private/audio/*` + `data/private/audio-index.json`: tus audios, reproducibles en Listening.

Además, `data/private/*/sample-paper-1.json` contiene el Sample Paper 1 oficial del C1 Advanced estructurado
(Reading & Use of English, Listening con sus audios, Writing) como simulacro privado. Los audios se enlazan si
sincronizas la carpeta `Test de nivel` dentro de `material/`.
