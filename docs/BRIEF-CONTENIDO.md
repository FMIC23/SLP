# Brief para generar contenido original (para agentes/colaboradores)

Proyecto: entrenador web de inglés C1 Advanced (Cambridge CAE) + SLP 3 (STANAG 6001) para un opositor español
(ingeniería industrial/minas y Guardia Civil). Nivel actual del usuario: B2; debilidad principal: speaking.

## Esquema
- Tipos TypeScript: `src/core/types.ts` (Meta, Question, ReadingTask, UoeTask, ListeningTask, Deck, WritingTask, SpeakingCard...).
- Validador: `node scripts/validate-data.mjs` (debe terminar en "Datos válidos.").
- Referencias gramaticales disponibles para `grammarRef`: ids de `data/grammar.json`.
- Cada archivo JSON de `data/<carpeta>/` es un ARRAY de recursos.

## Reglas
1. Contenido 100% ORIGINAL escrito por ti. No reproduzcas textos ni preguntas de exámenes oficiales, libros o webs.
2. Inglés para el contenido; explicaciones (`explanation`, `tips`, `back` de flashcards) en ESPAÑOL de España.
3. Meta obligatoria en cada recurso: `{ id, skill, level, topic, domain, source, license, generated }`
   - `source`: "Generado para el proyecto (original)"; `license`: "CC BY 4.0"; `generated`: true.
   - `level`: "C1" (formato Cambridge), "SLP3" (estilo STANAG), "C1/SLP3" (sirve para ambos).
   - `domain`: reparte aprox. 40% "general", 30% "industrial", 30% "police".
   - Temas industriales: energía (renovables, red eléctrica, hidrógeno), procesos, calidad (ISO 9001, Six Sigma), seguridad laboral (ATEX, LOTO, ISO 45001),
     gestión de proyectos, normativa (marcado CE, directivas UE), medio ambiente (emisiones, residuos), minería (voladuras, rehabilitación, drenaje ácido).
   - Temas policiales: tráfico y seguridad vial, control de fronteras y migración, ciberdelincuencia, investigación criminal y cadena de custodia,
     policía de proximidad, cooperación internacional (Europol, Interpol, Frontex), terrorismo y radicalización, vigilancia marítima,
     delitos medioambientales, narcotráfico, misiones internacionales, derechos humanos y uso proporcionado de la fuerza.
   - No uses personas reales ni datos personales. Instituciones reales solo de forma genérica y fáctica.
4. Calidad C1: textos con vocabulario C1, estructuras complejas, matices; distractores plausibles pero inequívocamente incorrectos.
   Revisa cada respuesta dos veces: exactamente UNA opción correcta; en preguntas abiertas lista TODAS las variantes aceptables en `accepted` (minúsculas).
5. `explanation` breve (1-3 frases) que diga POR QUÉ es correcta y, si procede, por qué fallan los distractores.
6. `tag` de la pregunta: uno de detail, inference, gist, tone, purpose, attitude, reference, vocabulary, collocation, grammar, phrasal, linking,
   word-formation, fixed-expression, preposition, cohesion, paraphrase.
7. Ids únicos con el prefijo indicado (p. ej. `rd-ind-01`, preguntas `rd-ind-01-q1`).
8. Escribe solo en tu carpeta asignada. No hagas commits. Al terminar ejecuta el validador y corrige hasta que pase.
