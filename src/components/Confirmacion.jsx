import { useCallback, useRef, useState } from "react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";

// Pregunta antes de una acción que no se deshace. Uso:
//   const [confirmar, dialogo] = useConfirmacion();
//   if (!(await confirmar({ titulo, mensaje, aceptar: "Eliminar" }))) return;
// y se renderiza {dialogo} en el componente. No usa window.confirm: en la app instalada
// en el celular se ve como un cartel del sistema y bloquea la pestaña. Es una hoja (Sheet):
// desde abajo en el celular, centrada en pantallas grandes; se dibuja en <body> (portal).
// `peligro` (por defecto) pinta el botón de aceptar en rojo: borrar, dar de baja, etc.
export function useConfirmacion() {
  const [pedido, setPedido] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const pedidoRef = useRef(null);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        pedidoRef.current?.resolver(false); // si había otra pregunta abierta, queda como "no"
        pedidoRef.current = { ...opciones, resolver };
        setPedido(pedidoRef.current);
        setAbierto(true);
      }),
    []
  );

  const responder = useCallback((si) => {
    pedidoRef.current?.resolver(si);
    pedidoRef.current = null;
    setAbierto(false); // el contenido se queda hasta que termina la animación de salida
  }, []);

  const dialogo = <Dialogo {...pedido} abierto={abierto} onResponder={responder} />;
  return [confirmar, dialogo];
}

function Dialogo({ abierto, titulo, mensaje, aceptar = "Aceptar", cancelar = "Cancelar", peligro = true, onResponder }) {
  const cancelarRef = useRef(null); // con Enter no se confirma sin querer

  return (
    <Sheet
      abierto={abierto}
      onCerrar={() => onResponder(false)}
      role="alertdialog"
      titulo={titulo}
      descripcion={mensaje}
      conCerrar={false}
      focoInicial={cancelarRef}
      ancho="420px"
      pie={
        <>
          <Button ref={cancelarRef} variant="secondary" onClick={() => onResponder(false)}>
            {cancelar}
          </Button>
          <Button variant={peligro ? "danger" : "solid"} onClick={() => onResponder(true)}>
            {aceptar}
          </Button>
        </>
      }
    />
  );
}
