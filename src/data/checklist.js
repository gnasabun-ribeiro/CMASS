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

// Checklist de Seguridad e Higiene para "Inspecciones de Servicios Petroleros".
// Fuente: Checklist_Seguridad_Higiene_Servicios_Petroleros.xlsx
const CATEGORIAS_SERVICIO = [
  {
    nombre: "Documentación y Permisos",
    items: [
      "¿Se encuentra el Permiso de Trabajo vigente en el lugar, completo y firmado?",
      "¿Se dispone de analisi de riesgo vigente y correctamente confeccionado?",
      "¿Se realizó charla previa de seguridad antes de iniciar las tareas?",
      "¿Se dispone de plan de izaje y documentación correspondiente?",
      "¿La documentación del personal se encuentra vigente?",
      "¿La documentación de vehículos, equipos y maquinarias está vigente?",
    ],
  },
  {
    nombre: "Condiciones del Área",
    items: [
      "¿Existe orden y limpieza en el frente de trabajo?",
      "¿La señalización es adecuada y visible?",
      "¿La delimitación y vallado del área son correctos?",
      "¿Se encuentran controlados los accesos al área?",
      "¿Las condiciones climáticas permiten realizar la tarea?",
    ],
  },
  {
    nombre: "Vehículos y Equipos",
    items: [
      "¿Los vehículos cuentan con inspección vigente?",
      "¿Los operadores están habilitados?",
      "¿Se confeccionó checklist?",
      "¿Las herramientas están en condiciones?",
    ],
  },
  {
    nombre: "Emergencias",
    items: [
      "¿Los extintores poseen carga vigente?",
      "¿Existe equipamiento de emergencia disponible?",
      "¿Se dispone de botiquín completo?",
    ],
  },
  {
    nombre: "Medio Ambiente",
    items: [
      "¿La gestión de residuos es adecuada?",
      "¿Se dispone de kit para control de derrames?",
      "¿Los productos químicos poseen HDS/MSDS disponibles?",
      "¿No existen pérdidas o derrames de hidrocarburos?",
    ],
  },
  {
    nombre: "Personal",
    items: [
      "¿El personal conoce los riesgos de la tarea?",
      "¿Conoce la política Stop Work / Suspensión de Tareas?",
      "¿Utiliza correctamente los EPP requeridos?",
      "¿Ropa ignífuga cuando corresponde?",
      "¿Detector portátil de gases calibrado cuando corresponde?",
      "¿Se realizan observaciones preventivas (TOP)?",
      "¿Conoce el Plan de Emergencias?",
    ],
  },
];

export const CHECKLIST_SERVICIO = buildChecklist(CATEGORIAS_SERVICIO);

// Checklist de "Reglas de Oro" → sub "Seguridad vial".
// Fuente: planilla de verificación de vehículos (no tiene subcategorías).
const CATEGORIAS_SEGURIDAD_VIAL = [
  {
    nombre: "Seguridad Vial",
    items: [
      "¿Se cuenta con la documentación reglamentaria del vehículo y conductor? (Constancia de Manejo Defensivo, Licencia de conducir acorde a la categoría del vehículo, VTV y Seguro vigentes)",
      "¿El vehículo cuenta con Sistema de Control de Manejo en funcionamiento y el conductor cuenta con dispositivo de identificación de manejo individual? (PIN, tarjeta, etc.)",
      "¿El estado y equipamiento del vehículo se encuentra en buenas condiciones para circular? (Luces, cinturones, extintor, auxilios, tipo y estado de las cubiertas)",
      "¿El vehículo cuenta con identificación de la Empresa y N° de contrato?",
      "¿El conductor conoce las velocidades precautorias establecidas en la zona y las establecidas por YPF SA?",
      "¿Al momento de la inspección, el conductor y los pasajeros usan el cinturón de seguridad?",
      "¿Acorde al estado y tipo de camino, usa la doble tracción?",
      "¿Cuenta el vehículo con los elementos de seguridad necesarios? (Chalecos reflectivos, botiquín, lanza de remolque, balizas refractantes triangulares, etc.)",
      "¿Se dispone de medios de comunicación para el área donde se encuentra y/o transita? (Teléfono, celular, radio)",
      "¿El vehículo se encuentra estacionado en condición segura?",
      "¿Se registran elementos sueltos en el habitáculo y/o otros compartimentos del vehículo?",
      "¿El vehículo transporta herramientas o materiales dentro de la caja de carga y estos se encuentran sujetos con red de contención y/o fajas de sujeción acorde a la herramienta o material transportado?",
    ],
  },
];

export const CHECKLIST_SEGURIDAD_VIAL = buildChecklist(CATEGORIAS_SEGURIDAD_VIAL);

// Checklist de referencia para módulos que todavía no tienen su propia
// lista definitiva (simulacro, visita, top).
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
  servicio: CHECKLIST_SERVICIO,
};

// Checklists que varían por sub-módulo (ej. cada una de las Reglas de Oro
// tiene su propia lista, a diferencia de obra/servicio que son un módulo único).
const CHECKLISTS_POR_SUBMODULO = {
  reglas: {
    "seguridad-vial": CHECKLIST_SEGURIDAD_VIAL,
  },
};

export function getChecklist(moduloId, subId) {
  const porSub = CHECKLISTS_POR_SUBMODULO[moduloId]?.[subId];
  if (porSub) return porSub;
  return CHECKLISTS_POR_MODULO[moduloId] || CHECKLIST_GENERICO;
}

export const OPCIONES = [
  { value: "ok", label: "Cumple", bg: "var(--success-bg)", fg: "var(--success-fg)", border: "var(--success-border)" },
  { value: "no", label: "No cumple", bg: "var(--danger-bg)", fg: "var(--danger-fg)", border: "var(--danger-border)" },
  { value: "na", label: "N/A", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)", border: "var(--border)" },
];
