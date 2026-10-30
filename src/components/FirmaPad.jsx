import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button.jsx";
import Banner from "./ui/Banner.jsx";
import { toast } from "./ui/Toast.jsx";

// Recuadro de papel: blanco en cualquier tema o modo.
const papel = { height: 112, borderRadius: "var(--radius-lg)", background: "var(--paper)" };

// Recuadro para firmar con el dedo o el mouse. Si ya hay una firma guardada
// (`firma.url`) la muestra y ofrece volver a firmar. Un trazo sin guardar se entrega
// con `onBorrador` al cerrarse el recuadro y vuelve con `borrador` (ver Formulario).
export default function FirmaPad({ firma, guardando, onGuardar, borrador, onBorrador }) {
  const canvasRef = useRef(null);
  const dibujandoRef = useRef(false);
  const trazoRef = useRef(false); // igual que hayTrazo, pero se puede leer al cerrar el recuadro
  const borradorRef = useRef(borrador);
  const onBorradorRef = useRef(onBorrador);
  onBorradorRef.current = onBorrador;
  const [hayTrazo, setHayTrazo] = useState(false);
  const [rehaciendo, setRehaciendo] = useState(false);
  const mostrarImagen = Boolean(firma?.url) && !rehaciendo;

  const marcarTrazo = (valor) => {
    trazoRef.current = valor;
    setHayTrazo(valor);
  };

  // El lienzo toma el tamaño con que se ve (y la densidad de píxeles de la pantalla):
  // con un tamaño fijo, la firma quedaba estirada al guardarla.
  const ajustarTamano = () => {
    const canvas = canvasRef.current;
    const escala = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * escala));
    canvas.height = Math.max(1, Math.round(height * escala));
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    marcarTrazo(false);
  };

  // Al abrir el recuadro: tamaño real y, si quedó uno, el trazo sin guardar.
  // Al cerrarlo: se entrega el trazo (o null si no hay) para recuperarlo después.
  useEffect(() => {
    if (mostrarImagen) return;
    const canvas = canvasRef.current;
    ajustarTamano();
    marcarTrazo(false);
    let pendiente = borradorRef.current; // hasta que se dibuja, el borrador sigue siendo el que llegó
    if (pendiente) {
      const img = new Image();
      img.onload = () => {
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        borradorRef.current = pendiente = null;
        marcarTrazo(true);
      };
      img.src = pendiente;
    }
    return () => onBorradorRef.current?.(pendiente ?? (trazoRef.current ? canvas.toDataURL("image/png") : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarImagen]);

  const punto = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * canvas.width) / rect.width, y: ((e.clientY - rect.top) * canvas.height) / rect.height };
  };

  const empezar = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!trazoRef.current) ajustarTamano(); // por si cambió de tamaño (ej. se giró el celular)
    canvas.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    const ctx = canvas.getContext("2d");
    const { x, y } = punto(e);
    ctx.lineWidth = (2.5 * canvas.width) / canvas.getBoundingClientRect().width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01); // un toque suelto deja un punto
    ctx.stroke();
    marcarTrazo(true);
  };

  const mover = (e) => {
    if (!dibujandoRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminar = () => {
    dibujandoRef.current = false;
  };

  const guardar = () => {
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      trazoRef.current = false; // guardada deja de ser borrador
      const ok = await onGuardar(blob);
      if (ok === false) trazoRef.current = true; // no se guardó: el trazo sigue en el recuadro (el error se ve arriba)
      else {
        setRehaciendo(false);
        toast.success("Firma guardada");
      }
    }, "image/png");
  };

  const cancelar = () => {
    marcarTrazo(false);
    setRehaciendo(false);
  };

  if (mostrarImagen) {
    return (
      <div>
        <div style={{ ...papel, border: "1.5px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={firma.url} alt="Firma guardada" style={{ maxWidth: "100%", maxHeight: "100%" }} />
        </div>
        <Button size="sm" onClick={() => setRehaciendo(true)} style={{ marginTop: "var(--space-2)" }}>
          Firmar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Papel blanco en cualquier tema o modo: la firma se guarda con trazo negro. */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Recuadro para firmar con el dedo o el mouse"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        style={{ ...papel, width: "100%", border: "1.5px dashed var(--accent-border-strong)", touchAction: "none", cursor: "crosshair", display: "block" }}
      />
      {hayTrazo ? (
        <Banner tono="warning" style={{ marginTop: "var(--space-2)" }}>
          Todavía no está guardada: tocá "Guardar firma" para que quede en el informe.
        </Banner>
      ) : (
        <div className="field-hint">Firmá dentro del recuadro y tocá "Guardar firma"</div>
      )}
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="neutral" size="sm" onClick={limpiar} disabled={!hayTrazo || guardando}>
          Borrar
        </Button>
        <Button variant="solid" size="sm" onClick={guardar} disabled={!hayTrazo} loading={guardando}>
          {guardando ? "Guardando…" : "Guardar firma"}
        </Button>
        {rehaciendo ? (
          <Button variant="ghost" size="sm" onClick={cancelar} disabled={guardando}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
