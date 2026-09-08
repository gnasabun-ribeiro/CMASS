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
    badge: "4 abiertas",
    cta: "Nueva inspección",
    form: true,
  },
  {
    id: "servicio",
    title: "Inspecciones para Servicio",
    desc: "Talleres, transporte y servicios contratados.",
    icon: "truck",
    badge: "2 abiertas",
    cta: "Nueva inspección",
    form: true,
  },
  {
    id: "simulacro",
    title: "Informe de Simulacro",
    desc: "Evaluación por roles, tiempos y observaciones.",
    icon: "alert",
    badge: "1 programado",
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
    badge: "12 nuevas",
    cta: "Nueva tarjeta",
    form: true,
  },
  {
    id: "reglas",
    title: "Reglas de Oro",
    desc: "Los 10 controles críticos de la industria petrolera.",
    icon: "shield",
    badge: "3 vencidas",
    cta: "Abrir",
    subs: withSlugs([
      { title: "Permisos de trabajo", meta: "18 este mes", icon: "doc" },
      { title: "Gestión del cambio", meta: "4 este mes", icon: "refresh" },
      { title: "Excavaciones", meta: "7 este mes", icon: "pin" },
      { title: "Espacios confinados", meta: "5 este mes", icon: "box" },
      {
        title: "Área de proyección y contactos",
        meta: "9 este mes",
        icon: "alert",
      },
      { title: "Aislamiento de energías", meta: "11 este mes", icon: "bolt" },
      {
        title: "Izaje y cargas suspendidas",
        meta: "6 este mes",
        icon: "wrench",
      },
      { title: "Trabajos en altura", meta: "8 este mes", icon: "layers" },
      { title: "Seguridad vial", meta: "14 este mes", icon: "road" },
      { title: "Compromiso compartido", meta: "3 este mes", icon: "users" },
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
        meta: "Checklist 24 ítems",
        icon: "leaf",
      },
      {
        title: "Manifiesto de residuos",
        meta: "Trazabilidad y transporte",
        icon: "truck",
      },
      {
        title: "Derrames y contingencias",
        meta: "Registro y remediación",
        icon: "drop",
      },
      {
        title: "Consumos de agua y energía",
        meta: "Carga mensual",
        icon: "bolt",
      },
      {
        title: "Monitoreos y mediciones",
        meta: "Efluentes, aire, ruido",
        icon: "chart",
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
    badge: "7 en cola",
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
