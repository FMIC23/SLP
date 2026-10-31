# Cómo añadir contenido

Cada archivo de `data/<carpeta>/` es un **array JSON**. Los tipos exactos están en `src/core/types.ts`. Tras editar, ejecuta:

```bash
npm run validate
```

## Metadatos obligatorios (`meta`)
```json
{ "id": "rd-ind-07", "skill": "reading", "level": "C1", "topic": "hydrogen storage",
  "domain": "industrial", "source": "Generado para el proyecto (original)", "license": "CC BY 4.0",
  "generated": true, "sourceUrl": "opcional", "private": false }
```
- `level`: `C1`, `SLP3` o `C1/SLP3`. `domain`: `general`, `industrial` o `police`.
- Material propio con derechos: ponlo en `data/private/...` con `"private": true` (no se publica).

## Preguntas
```json
{ "id": "rd-ind-07-q1", "kind": "choice", "prompt": "...", "options": ["A", "B", "C", "D"], "answer": 2,
  "explanation": "Por qué (en español)", "tag": "inference", "grammarRef": "inversion" }
{ "id": "uoe-x-q3", "kind": "text", "accepted": ["although", "though"], "explanation": "...", "tag": "linking" }
```
- Key word transformation: añade `original`, `keyword`, `prompt` con `_____`, `points: 2` y `parts` (dos listas de tramos para puntuación parcial).
- Word formation: añade `stem` (palabra base en mayúsculas).
- Huecos en texto: `[[1]]`, `[[2]]`... en el mismo orden que las preguntas.

## Por carpeta
| Carpeta | Tipo | Campos clave |
|---|---|---|
| `reading/` | `ReadingTask` | `format` (`multiple-choice`, `gapped-text`, `multiple-matching`, `cross-text`, `stanag`), `text` o `sections` |
| `useofenglish/` | `UoeTask` | `part` (`mc-cloze`, `open-cloze`, `word-formation`, `kwt`, `gapped-sentences`) |
| `listening/` | `ListeningTask` | `part`, `script` (líneas `{speaker, text}`), `speakers` (`male`/`female`), `audio` opcional |
| `vocabulary/` | `Deck` | `category`, `cards` (`id`, `front`, `back`, `example`, `note`) |
| `writing/tasks*.json` | `WritingTask` | `genre`, `prompt`, `notes`, `minWords`, `maxWords`, `timeMinutes`, `tips`, `model` |
| `writing/phrase-bank.json` | `PhraseGroup` | `title`, `use`, `phrases` |
| `speaking/cards*.json` | `SpeakingCard` | `part`, `prompt`, `points`, `prepSeconds`, `speakSeconds`, `usefulLanguage`, `followUp` |
| `speaking/debate-questions.json` | `{topic, domain, questions}` | |

Las reglas de estilo para generar contenido nuevo (también con IA) están en `docs/BRIEF-CONTENIDO.md`.
