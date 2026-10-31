# Integrar el Entrenador de inglés en la plataforma OpoIndustriales

Lo que sigue se basa en `FMIC23/OpoIndustriales`: **Next.js 15 (App Router) + Tailwind 4 + Supabase + Vercel**, con campus en `/campus` protegido por `middleware.ts` y menú en `src/components/campus/MenuCampus.tsx`.

El Entrenador es una web estática con rutas relativas (`base: './'` y router por `#`), así que funciona en cualquier subcarpeta sin cambios.

## Opción recomendada: copiarlo dentro de OpoIndustriales y mostrarlo en el campus

Mismo dominio, sin depender de GitHub Pages, y el progreso queda en el dominio de la academia.

### Paso 1. Exportar la versión pública

Con los dos repos clonados uno al lado del otro (`SLP/` y `opoindustriales/`):

```bash
cd SLP
```

```bash
npm run export:opo -- ../opoindustriales
```

Esto construye **sin** `data/private` (lo aparta temporalmente) y copia el resultado en `opoindustriales/public/ingles/`. La app queda servida en `/ingles/index.html`. Repite el comando cada vez que actualices el entrenador.

### Paso 2. Página del campus `src/app/campus/ingles/page.tsx`

```tsx
import { Encabezado } from "@/components/campus/Encabezado";

export const metadata = { title: "Inglés C1 / SLP 3" };

export default function PaginaIngles() {
  return (
    <>
      <Encabezado
        titulo="Inglés C1 · SLP 3"
        texto="Reading, Use of English, Listening, Writing, Speaking, vocabulario técnico y simulacros. Tu progreso se guarda en este navegador."
      />
      <iframe
        src="/ingles/index.html"
        title="Entrenador de inglés C1 y SLP 3"
        className="h-[calc(100vh-11rem)] w-full rounded-xl border border-line bg-white"
        allow="microphone; autoplay; clipboard-write"
      />
      <p className="mt-2 text-sm text-muted">
        <a href="/ingles/index.html" target="_blank" rel="noopener" className="underline">Abrir a pantalla completa</a>
      </p>
    </>
  );
}
```

`allow="microphone"` hace falta para grabar en Speaking dentro del iframe. Ajusta las clases de color (`border-line`, `text-muted`) a las de tu `globals.css`.

### Paso 3. Entrada en el menú (`MenuCampus.tsx`)

Añade a `ENLACES`, por ejemplo antes de «Mi cuenta»:

```ts
{ href: "/campus/ingles", texto: "Inglés C1 / SLP", icono: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5" },
```

Como no está en `SOLO_TEST`, aparecerá en todas las oposiciones. Hazlo también en la demo (`/demo/ingles`) duplicando la página, si quieres enseñarlo.

### Paso 4 (opcional). Que `/ingles` solo lo vean alumnos con sesión

En `src/middleware.ts`, amplía la condición y el `matcher`:

```ts
if (!user && (ruta.startsWith("/campus") || ruta.startsWith("/admin") || ruta.startsWith("/ingles"))) { … }

export const config = {
  matcher: ["/campus/:path*", "/admin/:path*", "/ingles/:path*", "/acceso", "/auth/:path*"],
};
```

Si prefieres usarlo como **gancho comercial**, déjalo público. El contenido es CC BY 4.0, así que basta con citar la fuente. Puedes añadir una tarjeta en la portada o en `/plataforma` que enlace a `/ingles/index.html`.

## Alternativa rápida: enlazar la versión de GitHub Pages

Sin copiar nada: crea la misma página del Paso 2 con `src="https://fmic23.github.io/SLP/"`, o solo un enlace en el menú.

- **Ventaja:** cero mantenimiento; se actualiza con cada push a `SLP/main`.
- **Inconvenientes:** otro dominio (el progreso queda en `fmic23.github.io`), y depende de GitHub Pages.

## Evolución futura: progreso en Supabase por alumno

Para que el progreso siga al alumno entre dispositivos:

1. Crea una tabla `ingles_progreso (user_id uuid references auth.users, perfil text, datos jsonb, actualizado timestamptz, primary key (user_id, perfil))` con RLS `user_id = auth.uid()`.
2. Comunica el iframe y la página del campus con `postMessage`:
   - El entrenador emite `{tipo: 'progreso', perfil, datos}` en cada guardado (se engancharía en `store.onChange`).
   - La página padre lo guarda en Supabase y, al cargar, envía los datos al iframe.
3. En el entrenador, añadir un modo «integrado» (por ejemplo `?embed=1`) que oculte el selector de perfiles y la barra superior.

Son unos 100-150 líneas entre ambos repos. Pídelo cuando quieras dar el paso.

## Resumen

| Opción | Esfuerzo | Progreso | Recomendado para |
|---|---|---|---|
| Copia en `public/ingles` + página con iframe | Bajo (un comando + 2 archivos) | Navegador, dominio de la academia | **Ahora** |
| Enlace o iframe a GitHub Pages | Mínimo | Navegador, dominio github.io | Pruebas rápidas |
| Sincronización con Supabase | Medio | Cuenta del alumno, multidispositivo | Cuando haya alumnos de pago usándolo |
