import { slugify } from "./slugify.js";

function withSlugs(subs) {
  return subs.map((s) => ({ ...s, id: slugify(s.title) }));
}

// `form: true` modules go straight to the 4-step form from the home card.
// Modules with `subs` open a submenu of cards instead.
// `nav` points a card straight at a top-level route (bypassing modulo/form).
export const MODULOS = [
  {
    id: "obra",
    title: "Inspecciones de Obra Pública",
    desc: "Checklist de obra, hallazgos y firma en el lugar.",
    icon: "hardhat",
    badge: "",
    cta: "Nueva inspección",
    form: true,
  },
  {
    id: "servicio",
    title: "Inspecciones de Servicios Petroleros",
    desc: "Talleres, transporte y servicios contratados.",
    icon: "truck",
    badge: "",
    cta: "Nueva inspección",
    form: true,
  },
  {
    id: "trailers",
    title: "Inspección Trailers y Obradores",
    desc: "Residuos, combustible, emergencias y efluentes del obrador.",
    icon: "box",
    badge: "",
    cta: "Nueva inspección",
    form: true,
  },
  {
    id: "simulacro",
    title: "Informe de Simulacro",
    desc: "Evaluación por roles, tiempos y observaciones.",
    icon: "alert",
    badge: "",
    cta: "Nuevo informe",
    form: true,
  },
  {
    id: "visita",
    title: "Visita Gerencial",
    desc: "Recorrida de liderazgo con compromisos asumidos.",
    icon: "users",
    badge: "",
    cta: "Nueva visita",
    form: true,
  },
  {
    id: "top",
    title: "Tarjetas TOP",
    desc: "Observación conductual: actos seguros y desvíos.",
    icon: "eye",
    badge: "",
    cta: "Nueva tarjeta",
    form: true,
  },
  {
    id: "reglas",
    title: "Reglas de Oro",
    desc: "Los 10 controles críticos de la industria petrolera.",
    icon: "shield",
    badge: "",
    cta: "Abrir",
    subs: withSlugs([
      { title: "Permisos de trabajo", meta: "", icon: "doc" },
      { title: "Gestión del cambio", meta: "", icon: "refresh" },
      { title: "Excavaciones", meta: "", icon: "pin" },
      { title: "Espacios confinados", meta: "", icon: "box" },
      {
        title: "Área de proyección y contactos",
        meta: "",
        icon: "alert",
      },
      { title: "Aislamiento de energías", meta: "", icon: "bolt" },
      {
        title: "Izaje y cargas suspendidas",
        meta: "",
        icon: "wrench",
      },
      { title: "Trabajos en altura", meta: "", icon: "layers" },
      { title: "Seguridad vial", meta: "", icon: "road" },
      { title: "Compromiso compartido", meta: "", icon: "users" },
    ]),
  },
  {
    id: "ambiente",
    title: "Gestión Ambiental",
    desc: "Residuos, derrames, consumos y monitoreos.",
    icon: "leaf",
    badge: "",
    cta: "Abrir",
    subs: withSlugs([
      {
        title: "Chequeo de gestión ambiental",
        meta: "",
        icon: "leaf",
      },
    ]),
  },
  {
    id: "registros",
    title: "Mis Registros",
    desc: "Todo lo cargado, con filtros por área y fecha.",
    icon: "book",
    badge: "",
    cta: "Ver todos",
    nav: "/registros",
  },
  {
    id: "pendientes",
    title: "Pendientes de sincronizar",
    desc: "Lo cargado sin señal, listo para enviar.",
    icon: "refresh",
    badge: "",
    cta: "Revisar",
    nav: "/pendientes",
  },
];

export function findModulo(id) {
  return MODULOS.find((m) => m.id === id);
}

export function findSub(moduloId, subId) {
  const mod = findModulo(moduloId);
  if (!mod || !mod.subs) return null;
  return mod.subs.find((s) => s.id === subId) || null;
}

export const PASOS = ["Generales", "Checklist", "Hallazgos", "Cierre"];

// Ruta del formulario de un módulo (nuevo, o retomando la inspección `id`).
export function rutaFormulario(moduloId, subId, id) {
  const base = subId ? `/modulos/${moduloId}/form/${subId}` : `/form/${moduloId}`;
  return id ? `${base}?id=${id}` : base;
}
