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

// Checklist de "Inspección Trailers y Obradores" (INSPECCION OBRADORES - TALLERES).
// Fuente: checklist trailers y obradores TRUE.xlsx. Los ítems con "*" son críticos:
// si falta alguno no se habilita el obrador (el asterisco se dejó en el texto).
// Los sub-ítems de la planilla (ej. fuentes de agua externa) se unieron a su pregunta.
const CATEGORIAS_TRAILERS = [
  {
    nombre: "Instalación General",
    items: [
      "Estado general del obrador / accesos",
      "¿La posición de los tráiler es adecuada y se respetan las distancias de seguridad?",
      "Orden y limpieza general",
      "¿Se encuentran delimitados y señalizados los sectores de acopios de materiales?",
      "¿Se ha delimitado un estacionamiento de vehículos en retroceso y señalizado los accesos y velocidades de circulación?",
      "¿Se dispone de elementos de primeros auxilios? (Botiquín, tabla rígida, inmovilizador, cuello de filadelfia, férulas, etc.) *",
      "¿Se encuentra publicado en espacios comunes: Plan de llamadas de emergencia de la unidad de negocio, Política de Excelencia Operacional, Taller de análisis de riesgos del proyecto y Lay out de obrador? *",
      "¿Cuenta con señalización general? (Punto de reunión, obligatoriedad, prohibición, información)",
      "¿Desinfección y control de plagas?",
    ],
  },
  {
    nombre: "Provisión de agua",
    items: [
      "Provisión de agua externa (acueducto / transporte / bidones)",
      "¿Se identifica correctamente la provisión de agua no apta para consumo humano?",
      "¿Se realiza análisis bacteriológico semestralmente?",
      "¿Se realiza análisis fisicoquímico anualmente?",
    ],
  },
  {
    nombre: "Locales sanitarios",
    items: [
      "Estado general",
      "Limpieza - Frecuencia",
      "¿Se dispone cada 15 personas de 1 inodoro - 1 mingitorio - 2 lavamanos? *",
      "Baños químicos: ¿se evidencia certificado de disposición final de los efluentes resultantes de la limpieza?",
      "Plantas de tratamiento: ¿existe un tratamiento de aguas grises y negras? ¿Los resultados de análisis están dentro de los límites admisibles? ¿El tendido se encuentra sin pérdidas?",
    ],
  },
  {
    nombre: "Residuos",
    items: [
      "¿Cuenta con recipientes clasificados por colores de acuerdo al Procedimiento de Gestión de Residuos YPF?",
      "¿Los recipientes se encuentran rotulados / señalizados?",
      "¿Se dispone de registros de generación y disposición?",
    ],
  },
  {
    nombre: "Prevención de incendios y Plan de contingencias",
    items: [
      "¿Se cuenta con el cálculo de carga de fuego? La cantidad, distribución y capacidad de los extintores portátiles, ¿coincide con lo establecido en el informe de cálculo de carga de fuego? *",
      "¿Los extintores portátiles se encuentran cargados y la carga dentro de la fecha de vencimiento? *",
      "¿Los extintores se encuentran señalizados y su ubicación permite un fácil acceso en caso de ser necesario? *",
      "¿La distancia entre generadores y depósitos de combustible es mayor a 7,5 metros? *",
      "¿Los módulos (oficinas, comedores, pañoles) se encuentran a más de 15 metros de distancia de generadores y depósitos de combustibles? *",
      "¿El rol de incendio y el plan de evacuación se encuentra publicado y difundido?",
      "¿El Programa de respuestas ante emergencias contempla incendios y uso de extintores?",
    ],
  },
  {
    nombre: "Depósitos de productos químicos, lubricantes y/o aceites",
    items: [
      "¿Cuentan con señalización y cartelería adecuada? (Prohibido fumar, Sistema Globalmente Armonizado Res. 801/15, etc.)",
      "¿Los depósitos de combustibles líquidos cuentan con bateas de contención con capacidad del 110% del volumen almacenado? *",
      "¿Los recipientes son los adecuados para el almacenamiento de estos? *",
      "¿Los productos se encuentran identificados / rotulados y cuentan con su ficha de seguridad?",
      "En caso de ser tambores de 200 litros: ¿existe bomba manual o automática para extracción? *",
      "¿Se dispone de extintor de fuego en el sector?",
    ],
  },
  {
    nombre: "Depósito de cilindros sometidos a presión",
    items: [
      "¿Los acopios de cilindros se encuentran al resguardo del sol, en lugar ventilado, teniendo en cuenta la incompatibilidad de gases, separando llenos de vacíos y con los rótulos correspondientes? *",
      "El sector de acopio, ¿cuenta con sistema de fijación de cilindros y los mismos se encuentran sujetados? *",
      "¿El sector se encuentra delimitado y con cartelería correspondiente?",
    ],
  },
  {
    nombre: "Derrame",
    items: [
      "Los equipos con motores de combustión interna, ¿poseen bandejas de contención de dimensiones apropiadas?",
      "¿Se dispone de kit antiderrames en sitios apropiados? (Pala de bronce, material absorbente, etc.)",
      "¿Se cuenta con plan de contingencia ante eventuales derrames? ¿Fue difundido al personal?",
    ],
  },
  {
    nombre: "Instalación eléctrica general",
    items: [
      "¿Los tableros eléctricos cuentan con llave térmica y disyuntor diferencial? *",
      "¿Las instalaciones cuentan con puesta a tierra? *",
      "¿El cableado general se encuentra soterrado / protegido?",
      "¿Se realizó medición de las puestas a tierra de las instalaciones? *",
      "¿Se cuenta con diagrama unifilar y cálculo de carga máxima admisible?",
      "¿Se cuenta con corte general? ¿Se encuentra señalizado? *",
    ],
  },
  {
    nombre: "Talleres de prefabricado",
    items: [
      "Apilado y almacenamiento de materiales * (caños, perfiles, chapas)",
      "Toldos / carpas: sujeción por viento, estructuras firmes",
      "Bancos de trabajo",
      "Trípodes / pórticos con estudios de carga",
      "Moto soldadoras con bandejas ecológicas y protecciones",
      "Herramientas eléctricas: inspeccionadas, con protecciones",
    ],
  },
  {
    nombre: "Instalación de gas",
    items: [
      "Instalación: con PH y habilitación por matriculado",
      "Sistema de fijación, ventilación, señalización de tubos / garrafas",
      "Estado de artefactos",
      "Llaves de paso individual *",
      "Rejillas de ventilación *",
    ],
  },
  {
    nombre: "Habilitación de tráiler (Especificación 00100399)",
    items: [
      "¿Cuenta con el cálculo de estabilidad y resistencia al vuelco por acción de vientos, según Resolución 247/2012 - CIRSOC 102, firmado por ingeniero en estructura matriculado? *",
      "Sistema de anclaje (según cálculo de resistencia) *",
      "¿Cuenta con habilitación de gas, según NAG 200, firmada por gasista matriculado?",
      "¿Cuenta con planos unifilares de instalación eléctrica y diagrama de carga, según AEA 90364/06 – ENRE N°225/11, firmada por ingeniero eléctrico matriculado?",
      "Habilitaciones pertinentes, según Ley 24449, para tráileres móviles / rodantes, incluye la provisión de frenos en el / los ejes rodantes.",
      "Extintor/es según informe de carga de fuego del tráiler, ubicado en lugar visible y de fácil acceso.",
      "¿Cuenta con luz de emergencia?",
      "Señalización de puertas de emergencia. Puerta con sistema antipánico.",
      "¿Cuenta con brazo hidráulico para cierre controlado de puerta de ingreso y abren hacia afuera?",
      "¿Cuenta con fuelle cubre bisagras en buen estado?",
      "¿Cuenta con sistema de detección de humo e incendio con doble fuente de alimentación de energía y sirena exterior? No se acepta la colocación de detectores que solo funcionen a baterías y/o pilas. Los detectores deben estar conectados a una sirena y baliza que sea audible y visible en el exterior.",
      "¿Tablero eléctrico estanco con disyuntor diferencial y termomagnético?",
      "Los tráileres oficina y/o capacitación deben contar con estudio de iluminación de acuerdo con Resolución 84/2012 de SRT.",
      "¿Cuenta con elementos para vincular al sistema de puesta a tierra, sea a PAT individual o anillo? ¿Se realiza medición según Resol. 900/2015 de SRT?",
      "¿Piso en buen estado?",
      "¿En talleres y depósitos hay almacenado nafta o solventes?",
      "¿Posee la calcomanía con las palabras “TRAILER Verificado y Validado” por Responsable de Seguridad de la Contratista?",
      "¿Posee instructivo de convivencia?",
      "¿Posee plan de mantenimiento preventivo que incluya el chequeo de la instalación anualmente, realizado por personal competente; trazable con fechas y responsables de ejecución?",
    ],
  },
];

export const CHECKLIST_TRAILERS = buildChecklist(CATEGORIAS_TRAILERS);

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

// Checklist de "Gestión Ambiental" (RG-34-01 Check list Plan de Gestión Ambiental).
// Fuente: checklist ambiental.xlsx. Los sub-ítems de la planilla (listas con guión,
// "Detalle...") se unieron al texto de su pregunta, porque el modelo es ok/no/na.
const CATEGORIAS_AMBIENTE = [
  {
    nombre: "Residuos",
    items: [
      "¿Se respeta la clasificación de residuos según: Verdes: asimilables a urbanos/húmedos; azul: reciclables / secos; rojos: contaminados?",
      "¿Se encuentran distribuidos los recipientes de residuos en oficinas, comedor, exteriores, taller, guardia, surtidor de combustible?",
      "¿Se gestionan ordenadamente los residuos de oficina?",
      "El acopio de residuo voluminoso reciclable o residuos secos ¿se encuentra en sitios habilitados, identificados / delimitados?",
      "¿Se encuentran visibles los carteles indicativos de residuos especiales indicando categorías Y, peligrosidad H y capacidad contenedores de residuos? (Detallar las categorías Y aplicables en observaciones)",
      "¿Los recipientes de residuos se encuentran delimitados, bajo techo y con medidas de contención cuando corresponda?",
      "¿Se realiza la separación de residuos en los contenedores en taller? (Especiales; asimilables a urbanos o húmedos a vertedero; secos / reciclables: cartones, metales, plásticos, otros)",
      "¿Es necesario realizar entrega inmediata de algún tipo de residuos?",
      "¿Se cuenta con un recinto de residuos especiales con contención, identificación, cartelería y acceso restringido?",
      "¿Hay contenedores (tipo 1m3 / 5m3) para acopio transitorio de residuos especiales? ¿Y asimilables a urbanos?",
      "Las baterías usadas ¿están acopiadas sobre bateas en recinto con la cartelería Y correspondiente?",
      "Residuos líquidos: ¿se clasifican separadamente y sus condiciones de acopio son óptimas? (agua con hidrocarburos, refrigerante, aceites)",
      "¿Se detecta almacenamiento de aceite usado que requiera acondicionar?",
      "¿Se detecta almacenamiento de filtros, envases, latas, baterías de automotor, pilas u otro material usado de características especiales que se requiera acondicionar?",
      "¿Se observan residuos dispersos en el predio?",
      "¿Existe un responsable de control y/o supervisión periódica?",
    ],
  },
  {
    nombre: "Documentación",
    items: [
      "Certificado / habilitación municipal ambiental",
      "¿Ha desarrollado nuevas actividades u obras que requieran presentación de PGA / informe ambiental o auditoría ambiental?",
      "En caso de contar con requisitos puntuales derivados de un documento ambiental específico, ¿los gestiona ordenadamente y cuenta con evidencia?",
      "¿La actividad desarrollada en el sitio es coincidente con el rubro habilitado en la licencia comercial?",
      "¿Cuenta con habilitación como generador de RE, transportista RE o REPSSA consultoría ambiental, según corresponda?",
      "¿Se realizó la DDJJ anual de residuos especiales?",
      "¿Se debe realizar renovación de inscripción en el RPGTyORE?",
      "¿Cuenta con el procedimiento de residuos en su última versión y/o plan de gestión ambiental?",
      "¿Realiza seguimiento y trazabilidad de los residuos generados según el procedimiento y sus registros?",
      "¿Se cuenta con manifiestos / guías de transporte correspondientes a los residuos generados en base?",
      "¿Se cuenta con el manifiesto de descarga firmado, o documento que evidencie el traslado de residuos asimilables urbanos a un sitio habilitado?",
      "¿Se cuenta con certificados de tratamiento correspondientes a los manifiestos? ¿Se debe realizar pedido de certificados / modificaciones?",
      "¿Se cuenta con comprobantes de disposición final de baterías automotor / pilas?",
      "En caso de contratar mantenimientos externos para situaciones o equipos especiales, ¿se cuenta con comprobante de disposición de aceites resultantes de mantenimientos u otros residuos?",
      "¿Se realizó alguna gestión que mejore la gestión de residuos (cambio de producto, reciclaje, donación, venta en la disposición de residuos)? ¿Se cuenta con comprobante de dicha operación?",
      "¿Cumple con el plan de capacitaciones establecido? ¿Cuenta con temáticas de economía circular, cambio climático, impactos ambientales, sustentabilidad, objetivos ambientales, gestión de residuos y requerimientos legales?",
      "¿Cuenta con auditorías a proveedores relacionados con aspectos ambientales (residuos, agua, efluentes, laboratorios, proveedor de áridos, entre otros)?",
      "¿Cuenta con la evaluación de aspectos e impactos y sus medidas preventivas? ¿Poseen un enfoque de ciclo de vida?",
      "¿Se cuenta con Plan de Gestión Ambiental que considere legislación aplicable, gestión de proveedores, residuos, efluentes y emisiones y permisos?",
      "¿Cuenta con plan ante situaciones de contingencia tanto en base como en operaciones en campo? ¿Están definidas las situaciones de emergencia, su gravedad y actuación claramente? ¿Considera emergencias derivadas de situaciones ambientales?",
      "¿Cuenta con los requisitos legales identificados? (transportista y tratador de residuos peligrosos, unidades, categorías y habilitaciones; habilitaciones de proveedores de agua potable / industrial, de tratamiento de efluentes y de áridos; otros)",
    ],
  },
  {
    nombre: "Combustible",
    items: [
      "¿Posee y está vigente la habilitación de expendio de combustible?",
      "¿Posee y está vigente la habilitación de tanques aéreos? ¿Se encuentran sin observaciones?",
      "¿Se encuentran limpias las canaletas perimetrales / en buen estado los bordes de contención?",
      "¿Se cuenta con cámara de acopio de efluentes de playa de descarga? ¿Se verifica su estado? ¿Se planifica su desagote?",
      "¿La cámara de acopio posee prueba de estanqueidad?",
      "¿Se encuentra limpia la superficie de contenedores o acopio de insumos?",
      "¿Hay disponible material absorbente, elementos de señalización, cartelería, conos, pala, balde?",
    ],
  },
  {
    nombre: "Emergencias",
    items: [
      "¿Se observan pérdidas en contenedores de productos?",
      "¿Se detectan derrames en playa? ¿Sobre suelo?",
      "¿Se observan equipos, productos o residuos acopiados sobre suelo natural?",
      "Derrames en suelo: ¿requieren atención inmediata?",
      "¿Se acopian aceites o combustibles? ¿Se observan pérdidas o derrames?",
      "¿Se observan derrames de equipos, máquinas, camionetas?",
      "¿Se detectan bateas de contención en buen estado para acopio y almacenamiento?",
      "¿Se encuentra completo el kit ante derrames y en los sitios definidos? Es obligatorio contar con material / medidas ante derrames en expendio / almacenamiento de combustible, almacenamiento y uso de aceites y productos líquidos",
      "El acopio de productos ¿posee bandejas, identificación y señalización adecuadas?",
      "¿Se aplican medidas mitigadoras frente a derrames?",
      "¿Se encuentran disponibles los roles ante emergencias?",
      "¿El personal conoce la actuación ante situaciones de emergencias?",
      "¿Se verifica kit, roles y actuaciones de personal en campo?",
      "¿Se han realizado simulacros o capacitaciones de actuación frente a derrames o situaciones de emergencia?",
    ],
  },
  {
    nombre: "Emisiones y Efluentes",
    items: [
      "¿Cuenta con sitios que presentan chimeneas o escapes hacia la atmósfera?",
      "¿Realiza mediciones periódicas de aire o emisiones, de fuentes fijas o móviles?",
      "¿Cuenta con pozos de control o freatímetros en el predio o sitios cercanos?",
      "¿Efectúa mediciones o controles a fuentes de emisiones móviles?",
      "¿Se cuenta con habilitación del sistema de tratamiento, comprobantes de retiro y disposición de efluentes cloacales?",
      "En caso de contar con sistema de tratamiento de efluentes, ¿efectúa análisis periódicos?",
      "¿Posee habilitado punto de vertido ante recursos hídricos / DPA o la autoridad provincial correspondiente que efectúa contralor / poder de policía de aguas superficiales y subterráneas?",
      "¿Se encuentran las instalaciones conectadas a la red cloacal?",
      "¿Usa baños químicos? ¿Poseen comprobantes del tratamiento de efluentes?",
      "¿Posee otro tipo de efluentes derivados de procesos de las instalaciones? ¿Tiene habilitación?",
      "¿Realiza controles o gestiones relacionadas al ralentí de unidades móviles? (detallar en observaciones)",
      "¿Cuenta con comprobantes que evidencien que el lavado de unidades y equipos se efectúa en sitios autorizados?",
      "¿Controla emisiones de aires acondicionados y cantidad de recargas anuales por unidades móviles? (detallar cantidad recargada y tipo de gas)",
      "¿Controla emisiones de aires acondicionados y cantidad de recargas anuales por unidades fijas? (detallar cantidad recargada y tipo de gas)",
      "¿Conoce la cantidad de extintores en unidades móviles y fijas?",
      "¿Conoce la cantidad de recargas anuales de los extintores en su área?",
      "¿Se requiere limpieza o desagote de conductos / bombas / sistemas de trasvase / cámaras que ante lluvias intensas puedan provocar derrames?",
      "¿El predio cuenta con drenaje perimetral que evite ingreso de agua desde el exterior?",
      "¿Cuenta con sistema pluvial interno que asegure la conducción de agua de lluvia?",
      "¿El sistema de drenaje pluvial requiere acondicionamientos?",
      "¿Se observan residuos o materia prima en puntos que interfieren con el drenaje pluvial?",
    ],
  },
];

export const CHECKLIST_AMBIENTE = buildChecklist(CATEGORIAS_AMBIENTE);

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
  trailers: CHECKLIST_TRAILERS,
  ambiente: CHECKLIST_AMBIENTE,
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

export function agruparPorCategoria(items) {
  const bloques = [];
  for (const item of items) {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.categoria === item.categoria) {
      ultimo.items.push(item);
    } else {
      bloques.push({ categoria: item.categoria, items: [item] });
    }
  }
  return bloques;
}

export const OPCIONES = [
  { value: "ok", label: "Cumple", bg: "var(--success-bg)", fg: "var(--success-fg)", border: "var(--success-border)" },
  { value: "no", label: "No cumple", bg: "var(--danger-bg)", fg: "var(--danger-fg)", border: "var(--danger-border)" },
  { value: "na", label: "N/A", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)", border: "var(--border)" },
];
