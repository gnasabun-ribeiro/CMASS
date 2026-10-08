// Roles y qué puede hacer cada uno. Salen del relevamiento con los usuarios; las reglas
// que de verdad protegen los datos están en supabase/roles_y_permisos.sql (RLS). Esto solo
// decide qué botones y pantallas se muestran.
export const ROLES = [
  { value: "administrador", label: "Administrador", desc: "Gestiona usuarios y puede corregir o borrar inspecciones enviadas." },
  { value: "supervisor", label: "Supervisor", desc: "Ve todas las inspecciones, inspecciona y cierra hallazgos." },
  { value: "inspector", label: "Inspector", desc: "Carga inspecciones y cierra hallazgos. Ve las de todos." },
  { value: "lectura", label: "Solo lectura", desc: "Ve inspecciones y hallazgos sin poder cargar ni modificar." },
];

export const ROL_POR_DEFECTO = "inspector";

const TODOS = ["administrador", "supervisor", "inspector", "lectura"];
const INSPECCIONAN = ["administrador", "supervisor", "inspector"];

const PERMISOS = {
  crearInspecciones: INSPECCIONAN,
  verTodasLasInspecciones: TODOS,
  editarEnviadas: ["administrador"], // corregir una inspección enviada (vuelve a borrador)
  borrarInspecciones: ["administrador"],
  cerrarHallazgos: INSPECCIONAN,
  descargarPdf: INSPECCIONAN,
  verPanel: TODOS,
  gestionarUsuarios: ["administrador"],
};

export const puede = (rol, accion) => (PERMISOS[accion] ?? []).includes(rol);

export const etiquetaRol = (rol) => ROLES.find((r) => r.value === rol)?.label ?? rol;
