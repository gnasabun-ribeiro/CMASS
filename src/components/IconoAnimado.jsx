import { useEffect, useRef, useState } from "react";

// Color del detalle de los GIF de Magnific ("Basic Accent Outline"); en todos sus píxeles verde = azul.
const TURQUESA = [48, 204, 204];

// Matriz de <feColorMatrix> que lleva el negro a `lineas`, el blanco a `fondo` y el TURQUESA a
// `detalle`. Es afín, así que los bordes suavizados (mezclas de esos tres colores) también quedan bien.
function matrizColores(lineas, fondo, detalle) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [n, b, d] = [rgb(lineas), rgb(fondo), rgb(detalle)];
  const [tr, tg] = [TURQUESA[0] / 255, TURQUESA[1] / 255];
  const filas = n.map((nk, k) => {
    const haciaFondo = b[k] - nk;
    const haciaDetalle = d[k] - nk;
    const r = (haciaDetalle - tg * haciaFondo) / (tr - tg);
    const gb = (tr * haciaFondo - haciaDetalle) / 2 / (tr - tg);
    return [r, gb, gb, 0, nk];
  });
  return [...filas, [0, 0, 0, 1, 0]].map((f) => f.map((v) => +v.toFixed(4)).join(" ")).join("  ");
}

// [líneas, fondo, detalle] por tema. Copias de los colores de index.css: un filtro SVG no lee
// variables CSS. El fondo es blanco donde el ícono se mezcla con `multiply` y negro con `screen`.
const FILTROS = {
  "icono-default": ["#4e0f6b", "#ffffff", "#b45fd8"], // --violet-900 / --violet-400
  "icono-ribeiro": ["#f3efe6", "#000000", "#f4cf47"], // blanco cálido / amarillo Ribeiro
  "icono-ribeiro-destacado": ["#1c1b19", "#ffffff", "#6b5a1a"], // sobre el recuadro amarillo sólido
  // Modo oscuro (card oscura, se mezcla con `screen` como Ribeiro): líneas claras.
  "icono-default-oscuro": ["#f3e8fa", "#000000", "#c98ce6"], // lila claro / --violet-400 aclarado
  "icono-turquesa-oscuro": ["#e9f7f6", "#000000", "#45c4c0"], // blanco verdoso / --violet-400
};

// Se dibuja una vez en cada pantalla que usa IconoAnimado (Home, Inspecciones); index.css los aplica según el tema.
export function FiltrosIconos() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      {Object.entries(FILTROS).map(([id, colores]) => (
        <filter key={id} id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrizColores(...colores)} />
        </filter>
      ))}
    </svg>
  );
}

// El GIF se baja una sola vez por ícono; cada vez que se anima se le da una URL de blob nueva,
// porque con la misma URL el navegador sigue la animación donde iba en vez de empezarla de cero.
const blobs = new Map();

function cargarBlob(url) {
  if (!blobs.has(url)) {
    const promesa = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((blob) => {
        if (!blob) blobs.delete(url); // sin conexión y sin service worker: se reintenta la próxima vez
        return blob;
      });
    blobs.set(url, promesa);
  }
  return blobs.get(url);
}

// Ronda: mientras haya íconos a la vista, cada RONDA_MS se anima uno, por turno y de arriba hacia
// abajo (de a uno: todos juntos cada tantos segundos distraía). Con la pestaña oculta no corre.
const RONDA_MS = 5000;
const aLaVista = new Map(); // <img> → función que lo anima
let ronda = null;
let ultimo = null;

function siguienteTurno() {
  if (document.hidden || !aLaVista.size) return;
  const orden = [...aLaVista.keys()].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  // El que sigue al último animado (aunque ese ya no esté a la vista); al llegar al final, vuelve arriba.
  const despues =
    ultimo?.isConnected && orden.find((el) => ultimo.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  ultimo = despues || orden[0];
  aLaVista.get(ultimo)();
}

function sumarALaRonda(el, animar) {
  aLaVista.set(el, animar);
  if (!ronda) ronda = setInterval(siguienteTurno, RONDA_MS);
}

function sacarDeLaRonda(el) {
  aLaVista.delete(el);
  if (!aLaVista.size) {
    clearInterval(ronda);
    ronda = null;
  }
}

// Ícono de data/iconosAnimados.js: muestra el cuadro quieto y da una sola vuelta de la animación
// - cada vez que aparece en pantalla (la primera, a los `demora` ms: después de la entrada de la card),
// - cuando le toca en la ronda,
// - cada vez que cambia `reproducir` (ModuleCard lo sube al pasar el mouse).
// Si ya se está animando, no la corta. Con "reducir movimiento" no se anima.
export default function IconoAnimado({ icono, reproducir, demora = 0 }) {
  const [src, setSrc] = useState(null); // URL de blob mientras se anima; null = cuadro quieto
  const imgRef = useRef(null);
  const actual = useRef({ url: null, timer: null, cargando: false, montado: false });

  // En un ref para que el observer y la ronda llamen siempre a la versión actual.
  const animar = useRef(null);
  animar.current = async () => {
    const a = actual.current;
    if (a.url || a.cargando || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    a.cargando = true;
    const blob = await cargarBlob(icono.animado);
    let url = null;
    if (blob && a.montado) {
      url = URL.createObjectURL(blob);
      // Decodificado antes de mostrarlo: si no, al cambiar del cuadro quieto parpadea en blanco.
      const img = new Image();
      img.src = url;
      await img.decode().catch(() => {});
    }
    a.cargando = false;
    if (!url) return;
    if (!a.montado) {
      URL.revokeObjectURL(url);
      return;
    }
    a.url = url;
    setSrc(url);
    a.timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      a.url = null;
      setSrc(null);
    }, icono.ms);
  };

  useEffect(() => {
    const a = actual.current;
    a.montado = true;
    return () => {
      a.montado = false;
      clearTimeout(a.timer);
      if (a.url) URL.revokeObjectURL(a.url);
      a.url = null;
    };
  }, []);

  useEffect(() => {
    if (reproducir) animar.current();
  }, [reproducir]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const montadoEn = performance.now();
    let espera;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        clearTimeout(espera);
        if (!entrada.isIntersecting) {
          sacarDeLaRonda(el);
          return;
        }
        sumarALaRonda(el, () => animar.current());
        // Recién abierta la pantalla, `demora` (la cascada); si aparece más tarde (al bajar), enseguida.
        const alAbrir = performance.now() - montadoEn < 1000;
        espera = setTimeout(() => animar.current(), alAbrir ? demora : 150);
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(espera);
      sacarDeLaRonda(el);
    };
  }, [demora]);

  // `icono-animado`: index.css borra el fondo blanco del GIF y lo lleva a los colores del tema.
  return (
    <img
      ref={imgRef}
      src={src || icono.fijo}
      alt=""
      draggable={false}
      className="icono-animado"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
