// Texto para comparar al buscar: sin tildes ni diéresis ("Ñandú" → "nandu"), en minúsculas
// y sin espacios en los bordes.
export const normalizar = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
