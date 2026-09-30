import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient.js";

// Lee public.colaboradores (sincronizada desde el DW de Finnegans por la Edge
// Function DW_COLABORADORES). Se copia en el dispositivo para que el selector
// de responsables funcione sin conexión (mismo criterio que centrosDeCostos.js).
const CACHE_KEY = "cmass:colaboradores";

function leerCache() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarCache(lista) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(lista));
  } catch {
    // sin espacio o almacenamiento bloqueado: se sigue sin copia local
  }
}

const PAGINA = 1000; // tope de filas por consulta de Supabase: la tabla tiene más (activos e inactivos)

async function bajarColaboradores() {
  const data = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data: pagina, error } = await supabase
      .from("colaboradores")
      .select("nombre_completo, correo")
      .eq("data->>estado", "Activo") // los dados de baja no pueden ser responsables
      .order("id")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    data.push(...pagina);
    if (pagina.length < PAGINA) break;
  }

  return data
    .filter((c) => c.nombre_completo)
    .map((c) => ({
      correo: c.correo || "",
      // Es lo que se muestra y se guarda como texto en hallazgos / firma.
      etiqueta: c.nombre_completo,
    }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
}

export async function listarColaboradores() {
  if (!supabaseConfigured) return [];
  const copia = leerCache();
  if (!navigator.onLine && copia) return copia;
  try {
    const lista = await bajarColaboradores();
    guardarCache(lista);
    return lista;
  } catch (err) {
    if (copia) return copia;
    throw err;
  }
}

const normalizar = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Sugerencias: todas las palabras escritas tienen que estar en "nombre apellido"
// (en cualquier orden, sin tildes). Si el texto es exactamente una persona, no sugiere.
export function filtrarColaboradores(lista, texto) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  if (lista.some((c) => normalizar(c.etiqueta) === normalizar(texto))) return [];
  return lista.filter((c) => {
    const base = normalizar(c.etiqueta);
    return palabras.every((p) => base.includes(p));
  });
}

// Correo asociado a un "Nombre Apellido" escrito/elegido en el formulario. Solo si
// coincide con una única persona (con dos homónimos no se adivina); "" si no hay.
export function correoDe(lista, texto) {
  const buscado = normalizar(texto);
  if (!buscado) return "";
  const coinciden = lista.filter((c) => c.correo && normalizar(c.etiqueta) === buscado);
  const correos = new Set(coinciden.map((c) => c.correo.toLowerCase()));
  return correos.size === 1 ? [...correos][0] : "";
}

// Devuelve la lista de colaboradores; si falla, queda vacía y el campo
// sigue siendo de texto libre.
export function useColaboradores() {
  const [colaboradores, setColaboradores] = useState(() => leerCache() || []);
  useEffect(() => {
    let cancelado = false;
    listarColaboradores()
      .then((lista) => !cancelado && setColaboradores(lista))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);
  return colaboradores;
}
