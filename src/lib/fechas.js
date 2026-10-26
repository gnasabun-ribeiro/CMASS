// Fechas en hora local. `new Date("2026-10-30")` toma ese día como UTC y en Argentina
// (UTC-3) lo muestra como el 29; y `toISOString()` da el día UTC, que desde las 21 h ya
// es el de mañana.

const dos = (n) => String(n).padStart(2, "0");

// Hoy como "AAAA-MM-DD" (el formato de `vence`), en hora local.
export function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// dd/mm/aaaa. Acepta un día suelto ("2026-10-30", como `vence`) o una fecha con hora.
export function formatearFecha(valor) {
  if (!valor) return "—";
  const dia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (dia) return `${dia[3]}/${dia[2]}/${dia[1]}`;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}
