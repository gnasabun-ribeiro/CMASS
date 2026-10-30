// Íconos animados de las cards de Inicio y de la pantalla Inspecciones (las sub-cards, como las 10
// Reglas de Oro, siguen con los íconos de línea de Icon.jsx). Son de Flaticon, autor Magnific, estilo
// "Basic Accent Outline"; la licencia gratuita pide atribución (está al pie del Login).
// Los GIF originales (640 px, ~0,5–3 MB cada uno, en originales/iconos/animados/ con el nombre de
// Flaticon, anotado al lado de cada uno) se achicaron a 128 px, 16 colores y 25 cuadros por segundo;
// `fijo` es el primer cuadro (lo que se ve cuando no se anima) y `ms` lo que dura una vuelta.
// Para cambiar uno hay que regenerar los dos archivos con las mismas medidas.
import ambiente from "../assets/iconos/animados/ambiente.gif";
import ambienteFijo from "../assets/iconos/animados/ambiente-fijo.png";
import inspecciones from "../assets/iconos/animados/inspecciones.gif";
import inspeccionesFijo from "../assets/iconos/animados/inspecciones-fijo.png";
import obra from "../assets/iconos/animados/obra.gif";
import obraFijo from "../assets/iconos/animados/obra-fijo.png";
import panel from "../assets/iconos/animados/panel.gif";
import panelFijo from "../assets/iconos/animados/panel-fijo.png";
import pendientes from "../assets/iconos/animados/pendientes.gif";
import pendientesFijo from "../assets/iconos/animados/pendientes-fijo.png";
import reglas from "../assets/iconos/animados/reglas.gif";
import reglasFijo from "../assets/iconos/animados/reglas-fijo.png";
import registros from "../assets/iconos/animados/registros.gif";
import registrosFijo from "../assets/iconos/animados/registros-fijo.png";
import servicio from "../assets/iconos/animados/servicio.gif";
import servicioFijo from "../assets/iconos/animados/servicio-fijo.png";
import simulacro from "../assets/iconos/animados/simulacro.gif";
import simulacroFijo from "../assets/iconos/animados/simulacro-fijo.png";
import top from "../assets/iconos/animados/top.gif";
import topFijo from "../assets/iconos/animados/top-fijo.png";
import trailers from "../assets/iconos/animados/trailers.gif";
import trailersFijo from "../assets/iconos/animados/trailers-fijo.png";
import visita from "../assets/iconos/animados/visita.gif";
import visitaFijo from "../assets/iconos/animados/visita-fijo.png";

// Clave: id del módulo (o del grupo) en data/modulos.js.
export const ICONOS_ANIMADOS = {
  // Inicio
  inspecciones: { animado: inspecciones, fijo: inspeccionesFijo, ms: 2420 }, // labor-safety.gif
  simulacro: { animado: simulacro, fijo: simulacroFijo, ms: 2420 }, // emergencia.gif
  visita: { animado: visita, fijo: visitaFijo, ms: 3160 }, // obrero.gif
  top: { animado: top, fijo: topFijo, ms: 3000 }, // id-card.gif
  registros: { animado: registros, fijo: registrosFijo, ms: 2000 }, // folder.gif
  pendientes: { animado: pendientes, fijo: pendientesFijo, ms: 3600 }, // load-time.gif
  panel: { animado: panel, fijo: panelFijo, ms: 2000 }, // copywriting.gif
  // Pantalla Inspecciones
  obra: { animado: obra, fijo: obraFijo, ms: 1670 }, // cavador.gif
  servicio: { animado: servicio, fijo: servicioFijo, ms: 2000 }, // oil-pump.gif
  trailers: { animado: trailers, fijo: trailersFijo, ms: 3200 }, // trailer.gif
  reglas: { animado: reglas, fijo: reglasFijo, ms: 3600 }, // lista-de-verificacion.gif
  ambiente: { animado: ambiente, fijo: ambienteFijo, ms: 3000 }, // eco.gif
};
