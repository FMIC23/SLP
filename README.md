# Entrenador C1 · SLP 3

Herramienta web de estudio para preparar el **Cambridge C1 Advanced (CAE)** y el **SLP 3.3.3.3 (STANAG 6001)**. Cubre las cuatro destrezas, más Use of English y vocabulario, y da peso al vocabulario técnico **industrial/minero** (oposiciones de ingeniería) y **policial** (Guardia Civil). Sirve también para APTIS u otros certificados C1 válidos en la AGE.

- **Web:** https://fmic23.github.io/SLP/ (cuando GitHub Pages esté activado, ver «Despliegue»)
- **Sin backend:** todo el progreso se guarda en tu navegador (con exportación e importación en JSON). Funciona sin conexión (PWA).
- **Interfaz en español, contenidos en inglés.** Es responsive y accesible: se usa con teclado, tiene etiquetas ARIA, buen contraste y modo oscuro automático.

## Qué incluye

| Sección | Contenido | Funciones |
|---|---|---|
| **Reading** | 14 textos (8 con formato C1: Parts 5-8; 6 de estilo SLP 3 sobre normativa UE, informe de incidente, evaluación de amenaza, op-ed de fronteras, memo técnico y nota de prensa) | Corrección automática, explicación de cada respuesta y temporizador |
| **Use of English** | 18 tareas: MC cloze, open cloze, word formation, key word transformations (puntuación 0-2 parcial) y gapped sentences | Explicaciones y enlaces a 24 fichas de gramática según tus errores |
| **Listening** | 13 tareas (Parts 1-4 y 5 de SLP 3: noticiario, briefing, llamada de emergencia, podcast, conferencia) | Síntesis de voz con varias voces, velocidad de 0.75× a 1.25×, transcripción oculta o visible y contador de escuchas. Si existe audio real, se reproduce |
| **Writing** | 20 tareas (essay, report, proposal, email/letter, review, informe técnico, resumen ejecutivo, correo formal, memorando SLP) con respuesta modelo | Editor con contador de palabras, temporizador y autoguardado, checklist, rúbrica de Cambridge (4 criterios) y **exportación en Markdown** con petición de corrección. Banco de 17 grupos de frases |
| **Speaking** | 45 tarjetas (Parts 1-4, presentaciones técnicas, entrevista/briefing/role-play SLP) y 12 bloques de preguntas de debate | Preparación y turno cronometrados, **grabación local** (MediaRecorder), transcripción opcional (SpeechRecognition), análisis de palabras/minuto, muletillas y frases útiles, y rúbrica de 5 escalas |
| **Vocabulario** | 23 mazos con 810 tarjetas: general C1, 8 temas industriales, 8 policiales, collocations, phrasal verbs, idioms, false friends y conectores | Flashcards con **SM-2**, modo inverso y atajos de teclado |
| **Simulacros** | C1 por prueba o completo, y SLP por destreza o completo | Cronometrados, con puntuación aproximada en la **escala Cambridge** y en **niveles SLP** (perfil L.S.R.W) |
| **Progreso** | Estadísticas por destreza, ámbito, tema y tipo de error | Racha, historial, **plan semanal configurable** y recomendación del siguiente ejercicio (prioriza tus puntos débiles y, sobre todo, speaking) |

## Perfiles
Hay un selector de perfil en la barra superior, con dos perfiles por defecto: **Fran** (prioriza Speaking) y **Mayka**. Cada perfil tiene su propio progreso, tarjetas, plan, redacciones y ajustes. Puedes añadir más en *Ajustes → Perfiles*.

## App local completa (con tu material)
Para usar la app en tu PC con todo tu material, haz doble clic en `iniciar-windows.bat` o `iniciar-mac-linux.command`, o ejecuta `npm run local`. Guía paso a paso: [`docs/LOCAL.md`](docs/LOCAL.md).

## Integración en OpoIndustriales
Ejecuta `npm run export:opo -- ../opoindustriales` y crea una página en el campus. Guía: [`docs/INTEGRACION-OPOINDUSTRIALES.md`](docs/INTEGRACION-OPOINDUSTRIALES.md).

## Uso

```bash
npm install
npm run dev        # http://localhost:4173 (mismo puerto que la app local)
npm test           # pruebas de corrección, SM-2, puntuaciones, importador y datos
npm run build      # valida datos + build en dist/
```

### Tu material personal (solo en local)
1. Copia o sincroniza tu carpeta de Drive `OpoIndustriales/English` dentro de `material/` (con Google Drive para escritorio o `rclone`).
2. Ejecuta `npm run import:material`.
3. Arranca con `npm run dev`. Aparecerán tus apuntes de speaking (1 552 tarjetas en 37 temas), tus audios en Listening, el inventario en Recursos y el **Sample Paper 1 oficial** como ejercicios marcados «privado».

`material/`, `data/private/` y `public/private/` están en `.gitignore`: **nunca se publican**. No subas a un sitio público un build hecho en tu equipo, porque incluiría ese material. Inventario del material: [`docs/INVENTARIO-MATERIAL.md`](docs/INVENTARIO-MATERIAL.md).

### Añadir contenido
Consulta [`docs/CONTENIDO.md`](docs/CONTENIDO.md) (esquema JSON) y [`docs/BRIEF-CONTENIDO.md`](docs/BRIEF-CONTENIDO.md) (reglas de calidad y licencias). `npm run validate` comprueba ids únicos, respuestas dentro de rango, huecos `[[n]]` coherentes, referencias gramaticales existentes y extensión de los modelos.

## Correspondencia entre destrezas, C1 y SLP 3

| Destreza SLP (orden L.S.R.W) | Nivel 3 STANAG 6001 (resumen) | Prueba C1 Advanced | Sección de la app |
|---|---|---|---|
| **L** Comprensión auditiva | Entender casi todo el discurso formal e informal sobre temas profesionales y del propio campo; inferir actitud y tono | Listening (4 partes, ≈ 40 min) | Listening, simulacros |
| **S** Expresión oral | Conversar con eficacia sobre temas profesionales y abstractos, defender opiniones e hipotetizar | Speaking (4 partes, 15 min) | Speaking (entrevista, briefing, role-play, presentación) |
| **R** Comprensión lectora | Leer con casi total comprensión textos auténticos profesionales; captar intención y tono | Reading and Use of English (8 partes, 90 min) | Reading y Use of English |
| **W** Expresión escrita | Redactar correspondencia, informes y memorandos profesionales con argumentación | Writing (2 tareas, 90 min) | Writing |

- **Cambridge English Scale:** 180-199 = C1; 200-210 = C2; 160-179 = B2.
- **SLP:** se escribe Listening.Speaking.Reading.Writing. La normativa española (BOE) fija perfiles SLP de 4 dígitos. El encargo citaba «3.3.3.3» y «3.3.3»; la app trabaja con el perfil completo 3.3.3.3.
- **Formato SLP en España (nota):** las pruebas de Defensa/Guardia Civil suelen ser **multinivel**. Comprensión auditiva y lectora se hacen con opción múltiple sobre textos de dificultad creciente, la expresión escrita con tareas por nivel y la oral con una entrevista ante evaluadores. No encontré una descripción oficial pública y detallada del examen de la Guardia Civil, así que **prevalece lo que diga tu convocatoria**. Si difiere de lo descrito aquí, anótalo en este apartado.
- **APTIS / AGE:** las tareas de la app cubren las de Aptis General/Advanced (gramática y vocabulario, las 4 destrezas). Comprueba en cada convocatoria qué certificados admite.

Más detalle en la sección **Guía C1/SLP** de la app.

## Plan de estudio sugerido de 12 semanas (de B2 a C1/SLP 3)

Unas 6-7 h por semana: 45 min de lunes a viernes, 60 min el sábado y 20 min el domingo. **Speaking aparece 5 días por semana** porque es tu punto débil. Ajústalo en *Progreso → Plan semanal*.

| Semana | Objetivo | Tareas clave |
|---|---|---|
| 1 | Diagnóstico | Simulacro C1 de Reading & UoE y de Listening. 1 tarjeta de speaking al día (Part 1). Empieza los mazos «C1 academic» y «Connectors» |
| 2 | Base de speaking | Part 2 (long turn) 4 días: grábate y escúchate. UoE Part 1 y 2. Vocabulario industrial: energía y calidad |
| 3 | Use of English | Parts 3-4 (word formation y KWT) y fichas de gramática de tus errores. Speaking Part 3 con preguntas de debate |
| 4 | Writing C1 | 2 essays con el modelo, exportados para corrección externa. Banco de frases. Vocabulario policial: investigación y tráfico |
| 5 | Reading C1 | Parts 5-8 cronometradas. Presentaciones técnicas de 2-3 min (2 por semana) |
| 6 | Listening | Parts 1-4 a 1.0× y luego a 1.1×; shadowing de 6 Minute English. **Simulacro de speaking C1** |
| 7 | Bloque SLP | Lectura y audios SLP 3. Entrevista SLP y briefing. Memorando SLP |
| 8 | Profesional | Informe técnico y correo formal. Role-plays SLP. Mazos de seguridad, normativa y minería |
| 9 | Consolidar | **Simulacro C1 completo** (sábado). Repasa los 5 tipos de error más frecuentes |
| 10 | Puntos débiles | Sigue la «recomendación» de la app a diario. Speaking: repite las tarjetas con peor nota |
| 11 | **Simulacro SLP 3.3.3.3 completo** | Writing de Part 2 en los géneros menos practicados. Debate diario de 2 min |
| 12 | Puesta a punto | Un simulacro por destreza. Solo repasos SM-2 y nada de mazos nuevos. Descanso el día anterior al examen |

**Rutina diaria de speaking (15 min):** 1 pregunta de debate al azar de 2 min, después 1 tarjeta con grabación y escucha. Termina anotando 3 frases que te faltaron y añádelas a tu repaso.

## Despliegue

GitHub Actions (`.github/workflows/deploy.yml`) instala, ejecuta las pruebas y construye en cada push y PR, y **despliega en Pages desde `main`**. Para activarlo:
1. Fusiona la rama de trabajo en `main`.
2. En GitHub, ve a *Settings → Pages → Build and deployment → Source* y elige **GitHub Actions**.

El build de CI no contiene material privado porque no está en el repositorio.

## Estructura

```
src/core      lógica: corrección, SM-2, puntuaciones, recomendación, almacenamiento, contenido
src/views     pantallas (reading, uoe, listening, writing, speaking, vocab, simulacros, progreso...)
src/ui        helpers de DOM, ejercicio interactivo, síntesis de voz, estilos
data/         contenido JSON (público) · data/private/ (local, ignorado)
material/     tu material original (local, ignorado)
scripts/      validate-data.mjs, import-material.mjs
tests/        pruebas con Vitest
docs/         decisiones, licencias, contenido, inventario
```

## Licencias
Código MIT. El contenido original es CC BY 4.0 y los recursos de terceros se enlazan con su licencia. Ver [`docs/LICENSES.md`](docs/LICENSES.md) y [`docs/DECISIONES.md`](docs/DECISIONES.md).
