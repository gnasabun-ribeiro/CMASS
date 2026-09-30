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

async function bajarColaboradores() {
  const { data, error } = await supabase.from("colaboradores").select("nombre, apellido, correo");
  if (error) throw error;

  return (data || [])
    .filter((c) => c.nombre || c.apellido)
    .map((c) => ({
      nombre: c.nombre || "",
      apellido: c.apellido || "",
      correo: c.correo || "",
      // Es lo que se muestra y se guarda como texto en hallazgos / firma.
      etiqueta: [c.nombre, c.apellido].filter(Boolean).join(" "),
    }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es"));
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

// Devuelve la lista para armar un <datalist>; si falla, queda vacía y el campo
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
