/**
 * Edición de la compilación:
 *  - 'personal' (por defecto): GitHub Pages y app local; perfiles Fran y Mayka; ámbitos industrial y policial.
 *  - 'opo': versión integrada en OpoIndustriales (npm run export:opo); perfil genérico y textos sin ámbito policial.
 */
export const EDITION: 'personal' | 'opo' = (import.meta.env?.VITE_EDITION as string) === 'opo' ? 'opo' : 'personal';
export const IS_OPO = EDITION === 'opo';
