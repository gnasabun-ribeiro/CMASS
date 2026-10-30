import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.jsx";
import { usePresencia } from "./usePresencia.js";
import { CONSULTA_CELULAR } from "../../lib/breakpoints.js";

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mientras haya una hoja abierta el resto de la app queda inerte (sin foco, sin clics y fuera
// del alcance de los lectores de pantalla) y la página no se desplaza por detrás.
let abiertas = 0;
function bloquearFondo() {
  abiertas += 1;
  const raiz = document.getElementById("root");
  if (abiertas === 1) {
    if (raiz) raiz.inert = true;
    document.documentElement.style.overflow = "hidden";
  }
  return () => {
    abiertas -= 1;
    if (abiertas === 0) {
      if (raiz) raiz.inert = false;
      document.documentElement.style.overflow = "";
    }
  };
}

// Hoja modal: en el celular sale desde abajo (se cierra arrastrándola hacia abajo, tocando el
// fondo o con Escape); desde 640 px es un diálogo centrado. Encierra el foco y lo devuelve al
// cerrar. Uso:
//   <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Notificaciones"
//          pie={<Button variant="solid" onClick={...}>Listo</Button>}>
//     ...contenido con scroll propio...
//   </Sheet>
// Props: role ("dialog" | "alertdialog"), descripcion, encabezado (debajo del título, fijo:
// ej. un buscador), ancho (CSS, solo diálogo), alto (ocupa casi toda la pantalla),
// focoInicial (ref; si no, el panel), cerrarConFondo, conCerrar (botón ×), cuerpoClassName.
export default function Sheet({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  encabezado,
  children,
  pie,
  role = "dialog",
  ancho,
  alto = false,
  focoInicial,
  cerrarConFondo = true,
  conCerrar = true,
  cuerpoClassName = "",
  className = "",
  "aria-label": ariaLabel,
}) {
  const { montado, estado } = usePresencia(abierto, 280);
  const panelRef = useRef(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idDescripcion = `${id}-descripcion`;
  const [arrastre, setArrastre] = useState(0);
  const arrastreRef = useRef(null);

  useEffect(() => {
    if (abierto) setArrastre(0);
  }, [abierto]);

  // Fondo inerte + foco adentro mientras está montada; al desmontarse el foco vuelve.
  useEffect(() => {
    if (!montado) return undefined;
    const anterior = document.activeElement;
    const liberar = bloquearFondo();
    const cuadro = requestAnimationFrame(() => {
      const destino = focoInicial?.current || panelRef.current;
      destino?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(cuadro);
      liberar();
      if (anterior && document.contains(anterior)) anterior.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado]);

  if (!montado) return null;

  const alTeclear = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCerrarRef.current?.();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    const lista = [...panel.querySelectorAll(FOCUSABLES)].filter((el) => el.getClientRects().length > 0);
    if (!lista.length) {
      e.preventDefault();
      return;
    }
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  // Arrastrar hacia abajo para cerrar (solo la hoja del celular, desde el asa o el título).
  const empezarArrastre = (e) => {
    if (!window.matchMedia(CONSULTA_CELULAR).matches || e.target.closest("button, a, input, textarea, select")) return;
    arrastreRef.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moverArrastre = (e) => {
    if (arrastreRef.current) setArrastre(Math.max(0, e.clientY - arrastreRef.current.y));
  };
  const terminarArrastre = (e) => {
    const inicio = arrastreRef.current;
    if (!inicio) return;
    arrastreRef.current = null;
    const dy = Math.max(0, e.clientY - inicio.y);
    const velocidad = dy / Math.max(1, performance.now() - inicio.t);
    if (dy > 90 || velocidad > 0.6) onCerrarRef.current?.();
    else setArrastre(0);
  };
  const arrastrable = { onPointerDown: empezarArrastre, onPointerMove: moverArrastre, onPointerUp: terminarArrastre, onPointerCancel: terminarArrastre };

  return createPortal(
    <>
      <div className="sheet-overlay" data-estado={estado} aria-hidden="true" onClick={cerrarConFondo ? () => onCerrarRef.current?.() : undefined} />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        aria-label={titulo ? undefined : ariaLabel}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
        className={`sheet${alto ? " sheet--alto" : ""} ${className}`}
        data-estado={estado}
        data-arrastrando={arrastreRef.current ? "true" : undefined}
        style={{ "--arrastre": `${arrastre}px`, "--sheet-ancho": ancho }}
        onKeyDown={alTeclear}
      >
        <div className="sheet__agarre" aria-hidden="true" {...arrastrable}>
          <span className="sheet__asa" />
        </div>
        {titulo || conCerrar ? (
          <div className="sheet__cabecera" {...arrastrable}>
            <div className="sheet__titulos">
              {titulo ? (
                <h2 id={idTitulo} className="sheet__titulo">
                  {titulo}
                </h2>
              ) : null}
              {descripcion ? (
                <p id={idDescripcion} className="sheet__descripcion">
                  {descripcion}
                </p>
              ) : null}
            </div>
            {conCerrar ? <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={() => onCerrarRef.current?.()} /> : null}
          </div>
        ) : null}
        {encabezado}
        {children != null && children !== false ? <div className={`sheet__cuerpo ${cuerpoClassName}`}>{children}</div> : null}
        {pie ? <div className="sheet__pie">{pie}</div> : null}
      </div>
    </>,
    document.body
  );
}
