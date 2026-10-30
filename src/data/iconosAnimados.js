// Íconos animados de las cards de Inicio y de la pantalla Inspecciones (las sub-cards, como las 10
// Reglas de Oro, siguen con los íconos de línea de Icon.jsx). Son de Flaticon, autor Magnific, estilo
// "Basic Accent Outline"; la licencia gratuita pide atribución (está al pie del Login).
// Los GIF originales (640 px, ~0,5–3 MB cada uno) se achicaron a 128 px, 16 colores y 25 cuadros por
// segundo; `fijo` es el primer cuadro (lo que se ve cuando no se anima) y `ms` lo que dura una vuelta.
// Para cambiar uno hay que regenerar los dos archivos con las mismas medidas.
import ambiente from "../assets/iconos/ambiente.gif";
import ambienteFijo from "../assets/iconos/ambiente-fijo.png";
import inspecciones from "../assets/iconos/inspecciones.gif";
import inspeccionesFijo from "../assets/iconos/inspecciones-fijo.png";
import obra from "../assets/iconos/obra.gif";
import obraFijo from "../assets/iconos/obra-fijo.png";
import panel from "../assets/iconos/panel.gif";
import panelFijo from "../assets/iconos/panel-fijo.png";
import pendientes from "../assets/iconos/pendientes.gif";
import pendientesFijo from "../assets/iconos/pendientes-fijo.png";
import reglas from "../assets/iconos/reglas.gif";
import reglasFijo from "../assets/iconos/reglas-fijo.png";
import registros from "../assets/iconos/registros.gif";
import registrosFijo from "../assets/iconos/registros-fijo.png";
import servicio from "../assets/iconos/servicio.gif";
import servicioFijo from "../assets/iconos/servicio-fijo.png";
import simulacro from "../assets/iconos/simulacro.gif";
import simulacroFijo from "../assets/iconos/simulacro-fijo.png";
import top from "../assets/iconos/top.gif";
import topFijo from "../assets/iconos/top-fijo.png";
import trailers from "../assets/iconos/trailers.gif";
import trailersFijo from "../assets/iconos/trailers-fijo.png";

// Clave: id del módulo (o del grupo) en data/modulos.js. "visita" todavía no tiene: usa el de Icon.jsx.
export const ICONOS_ANIMADOS = {
  // Inicio
  inspecciones: { animado: inspecciones, fijo: inspeccionesFijo, ms: 2420 },
  simulacro: { animado: simulacro, fijo: simulacroFijo, ms: 2420 },
  top: { animado: top, fijo: topFijo, ms: 3160 },
  registros: { animado: registros, fijo: registrosFijo, ms: 2000 },
  pendientes: { animado: pendientes, fijo: pendientesFijo, ms: 3600 },
  panel: { animado: panel, fijo: panelFijo, ms: 2000 },
  // Pantalla Inspecciones
  obra: { animado: obra, fijo: obraFijo, ms: 1670 },
  servicio: { animado: servicio, fijo: servicioFijo, ms: 2000 },
  trailers: { animado: trailers, fijo: trailersFijo, ms: 3200 },
  reglas: { animado: reglas, fijo: reglasFijo, ms: 3600 },
  ambiente: { animado: ambiente, fijo: ambienteFijo, ms: 3000 },
};
