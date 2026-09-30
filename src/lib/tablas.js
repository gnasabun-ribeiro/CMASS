// Obra Pública tiene sus propias tablas; el resto de los módulos (Servicios, Simulacro,
// Visita, TOP, Reglas de Oro, Ambiente) comparten las genéricas, que distinguen el módulo
// con `modulo_id` / `sub_id`. Ver supabase/inspecciones_obra*.sql e inspecciones_generico.sql.
export const TABLAS_OBRA = {
  generico: false,
  cab: "inspecciones_obra",
  checklist: "inspecciones_obra_checklist",
  hallazgos: "inspecciones_obra_hallazgos",
  firmas: "inspecciones_obra_firmas",
  fotos: "inspecciones_obra_fotos",
};

export const TABLAS_GENERICAS = {
  generico: true,
  cab: "inspecciones",
  checklist: "inspecciones_checklist",
  hallazgos: "inspecciones_hallazgos",
  firmas: "inspecciones_firmas",
  fotos: "inspecciones_fotos",
};

export const tablasDe = (moduloId) => (!moduloId || moduloId === "obra" ? TABLAS_OBRA : TABLAS_GENERICAS);
