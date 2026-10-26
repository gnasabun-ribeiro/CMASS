import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const botonBase = {
  border: 0,
  fontWeight: 700,
  fontSize: 13.5,
  padding: "11px 16px",
  borderRadius: 14,
  cursor: "pointer",
  minHeight: 44,
};

// Pregunta antes de una acción que no se deshace. Uso:
//   const [confirmar, dialogo] = useConfirmacion();
//   if (!(await confirmar({ titulo, mensaje, aceptar: "Eliminar" }))) return;
// y se renderiza {dialogo} en el componente. No usa window.confirm: en la app instalada
// en el celular se ve como un cartel del sistema y bloquea la pestaña. Se dibuja en <body>
// (portal): dentro de la TabBar, su backdrop-filter lo dejaba encerrado en la barra.
export function useConfirmacion() {
  const [pedido, setPedido] = useState(null);
  const pedidoRef = useRef(null);
  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        pedidoRef.current?.resolver(false); // si había otra pregunta abierta, queda como "no"
        pedidoRef.current = { ...opciones, resolver };
        setPedido(pedidoRef.current);
      }),
    []
  );
  const responder = useCallback((si) => {
    pedidoRef.current?.resolver(si);
    pedidoRef.current = null;
    setPedido(null);
  }, []);
  const dialogo = pedido ? createPortal(<Dialogo {...pedido} onResponder={responder} />, document.body) : null;
  return [confirmar, dialogo];
}

// `peligro` (por defecto) pinta el botón de aceptar en rojo: borrar, dar de baja, etc.
function Dialogo({ titulo, mensaje, aceptar = "Aceptar", cancelar = "Cancelar", peligro = true, onResponder }) {
  const cancelarRef = useRef(null);

  useEffect(() => {
    cancelarRef.current?.focus(); // con Enter no se confirma sin querer
    const alTeclear = (e) => e.key === "Escape" && onResponder(false);
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onResponder]);

  return (
    <div
      onClick={() => onResponder(false)}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,35,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        aria-describedby={mensaje ? "confirmacion-mensaje" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", color: "var(--ink)", borderRadius: 20, padding: 18, width: "min(420px, 100%)", boxShadow: "var(--shadow-float)" }}
      >
        <div id="confirmacion-titulo" className="heading" style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          {titulo}
        </div>
        {mensaje ? (
          <div id="confirmacion-mensaje" style={{ fontSize: 13.5, color: "var(--muted-4)", lineHeight: 1.45 }}>
            {mensaje}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
          <button ref={cancelarRef} onClick={() => onResponder(false)} style={{ ...botonBase, background: "var(--violet-50)", color: "var(--violet-800)" }}>
            {cancelar}
          </button>
          <button
            onClick={() => onResponder(true)}
            style={{ ...botonBase, ...(peligro ? { background: "var(--danger-fg)", color: "#fff" } : { background: "var(--active-bg)", color: "var(--on-active)" }) }}
          >
            {aceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
