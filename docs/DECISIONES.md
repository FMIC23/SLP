# Decisiones del proyecto

| # | Decisión | Motivo |
|---|---|---|
| 1 | **Vite + TypeScript sin framework** (DOM con un helper `h()`), router por hash. | Mínimas dependencias (solo herramientas de desarrollo), build estático rápido, sin rupturas por actualizaciones de frameworks; TypeScript protege el esquema de contenido. |
| 2 | **Contenido en JSON** (`data/`) importado en el build con `import.meta.glob`. | Funciona sin servidor y sin conexión; el validador (`scripts/validate-data.mjs`) impide publicar ejercicios incoherentes. |
| 3 | **Capa privada** `material/` + `data/private/` + `public/private/` en `.gitignore`. | El repo `FMIC23/SLP` es público y el material de Drive tiene copyright. El usuario autorizó su uso personal: se usa en local, nunca se publica. |
| 4 | Los apuntes «speaking top» también van a la capa privada. | Proceden de clases (posible autoría de la profesora); por prudencia no se publican. |
| 5 | Contenido público = **original generado** (`generated: true`) + **enlaces** a recursos abiertos. | Reglas de licencia del encargo; no se reproducen preguntas oficiales. |
| 6 | Audio de Listening con **Web Speech API** y voces por hablante; audio real si existe (`audio`). | No hay audios abiertos con preguntas alineadas; la síntesis permite control de velocidad y transcripción. |
| 7 | **SM-2** clásico (calidad 1/3/4/5 para Otra vez/Difícil/Bien/Fácil). | Algoritmo estándar, sencillo y probado. |
| 8 | **Puntuación estimada**: Cambridge 60 % ≈ 180, 80 % ≈ 200 (interpolación lineal); SLP 3 ≥ 70 %, 2+ ≥ 55 %, 2 ≥ 40 %. | Cambridge no publica tablas fijas %→escala; el umbral del 70 % es el habitual en pruebas STANAG multinivel. Se muestra siempre como «aprox.». |
| 9 | Writing y Speaking se puntúan con **autoevaluación por rúbrica** + exportación a Markdown para corrección externa. | Sin backend no hay corrección automática fiable; se facilita usar Write & Improve, profesor o IA. |
| 10 | La recomendación da **+15 puntos de prioridad a Speaking**. | Debilidad declarada del usuario (B2, poca práctica oral). |
| 11 | Plan semanal por defecto con Speaking 5 días/semana. | Ídem. |
| 12 | **PWA básica**: `manifest` + service worker propio (red primero para navegación, caché primero para assets). | Offline sin dependencias extra. |
| 13 | **Gapped sentences** incluidas aunque ya no están en el C1 actual. | Pedido explícito; útiles para polisemia (charge, plant, file, warrant...). Se etiquetan como «formato antiguo». |
| 14 | Formato SLP: el encargo cita «3.3.3.3» y «3.3.3». Se usa el perfil completo L.S.R.W = 3.3.3.3. | STANAG 6001 evalúa 4 destrezas en ese orden; el perfil SLP de 4 cifras es el que exige la normativa española (BOE). Ver README. |
| 15 | Despliegue: GitHub Actions construye y prueba en todas las ramas y **despliega solo desde `main`**. | Pages despliega desde la rama por defecto; el trabajo se hizo en `claude/eager-shannon-puappe`. |
| 16 | Las rutas de audio de la capa privada usan el slug de la ruta relativa en `material/`. | Reproducible y sin espacios; el sample paper ya apunta a esos nombres. |
