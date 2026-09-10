// Checklist de Seguridad e Higiene para "Inspecciones de Obra Pública".
// Fuente: Checklist_Seguridad_Higiene_Obra_Publica.xlsx
const CATEGORIAS_OBRA = [
  {
    nombre: "Documentación y Gestión",
    items: [
      "¿Se dispone de autorización vigente para la ejecución de la tarea?",
      "¿Se encuentra disponible la Evaluación/Análisis de Riesgos?",
      "¿El personal fue informado y participó de la revisión del análisis de riesgo?",
      "¿Se dispone de permisos específicos para tareas críticas?",
      "¿Existe plan de izaje aprobado cuando corresponda?",
      "¿La documentación del personal está vigente?",
      "¿La documentación de vehículos y equipos se encuentra vigente?",
    ],
  },
  {
    nombre: "Condiciones Generales",
    items: [
      "¿El frente de trabajo presenta adecuado orden y limpieza?",
      "¿Los accesos y vías de circulación son seguros?",
      "¿La señalización es adecuada?",
      "¿El vallado perimetral es correcto?",
      "¿Existen desvíos vehiculares y peatonales señalizados?",
      "¿Las condiciones climáticas permiten trabajar?",
      "¿Las instalaciones temporales están en condiciones?",
      "¿Existe iluminación adecuada?",
    ],
  },
  {
    nombre: "Equipos y Herramientas",
    items: [
      "¿Las herramientas manuales están en condiciones?",
      "¿Las herramientas eléctricas están en condiciones?",
      "¿Los equipos poseen inspección preoperacional?",
      "¿Los dispositivos de seguridad están operativos?",
      "¿Los operadores están habilitados?",
    ],
  },
  {
    nombre: "Emergencias",
    items: [
      "¿Se dispone de equipamiento de emergencia?",
      "¿Los extintores son adecuados y vigentes?",
      "¿Existe botiquín completo y accesible?",
    ],
  },
  {
    nombre: "Higiene y Medio Ambiente",
    items: [
      "¿Existe provisión suficiente de agua potable?",
      "¿La gestión de residuos es correcta?",
      "¿Se dispone de HDS/MSDS?",
      "¿Se cuenta con kit para derrames?",
    ],
  },
  {
    nombre: "Personal y Conducta Segura",
    items: [
      "¿El personal conoce los riesgos?",
      "¿Conoce el procedimiento para reportar desvíos?",
      "¿Conoce el Plan de Emergencias?",
      "¿Utiliza correctamente los EPP?",
      "¿Se realizan observaciones preventivas (TOP)?",
    ],
  },
  {
    nombre: "Capacitación y Comunicación",
    items: [
      "¿El personal recibió inducción de seguridad?",
      "¿Se realizaron charlas de seguridad previas?",
      "¿Se difundieron alertas de seguridad?",
    ],
  },
];

function buildChecklist(categorias) {
  return categorias.flatMap((cat, ci) =>
    cat.items.map((texto, ii) => ({
      codigo: `${ci + 1}.${ii + 1}`,
      categoria: cat.nombre,
      texto,
    }))
  );
}

export const CHECKLIST_OBRA = buildChecklist(CATEGORIAS_OBRA);

// Checklist de referencia para módulos que todavía no tienen su propia
// lista definitiva (servicio, simulacro, visita, top).
export const CHECKLIST_GENERICO = buildChecklist([
  {
    nombre: "General",
    items: [
      "El permiso de trabajo está vigente, firmado y en el lugar de la tarea.",
      "El personal usa el EPP requerido y está en buen estado.",
      "Las energías peligrosas están aisladas y bloqueadas (LOTO).",
      "El área de proyección está delimitada y libre de personal ajeno.",
      "Los equipos tienen la verificación de preuso del día.",
      "Los residuos se segregan en los contenedores correspondientes.",
    ],
  },
]);

const CHECKLISTS_POR_MODULO = {
  obra: CHECKLIST_OBRA,
};

export function getChecklist(moduloId) {
  return CHECKLISTS_POR_MODULO[moduloId] || CHECKLIST_GENERICO;
}

export const OPCIONES = [
  { value: "ok", label: "Cumple", bg: "var(--success-bg)", fg: "var(--success-fg)", border: "var(--success-border)" },
  { value: "no", label: "No cumple", bg: "var(--danger-bg)", fg: "var(--danger-fg)", border: "var(--danger-border)" },
  { value: "na", label: "N/A", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)", border: "var(--border)" },
];
