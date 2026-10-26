import { useEffect, useRef, useState } from "react";

const botonBase = {
  border: 0,
  fontWeight: 700,
  fontSize: 12.5,
  padding: "9px 14px",
  borderRadius: 12,
  cursor: "pointer",
  minHeight: 40,
};

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
      if (ok === false) trazoRef.current = true; // no se guardó: el trazo sigue en el recuadro
      else setRehaciendo(false);
    }, "image/png");
  };

  const cancelar = () => {
    marcarTrazo(false);
    setRehaciendo(false);
  };

  if (mostrarImagen) {
    return (
      <div>
        <div style={{ height: 100, border: "1.5px solid var(--violet-300)", borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={firma.url} alt="Firma" style={{ maxWidth: "100%", maxHeight: "100%" }} />
        </div>
        <button onClick={() => setRehaciendo(true)} style={{ ...botonBase, marginTop: 8, background: "var(--violet-50)", color: "var(--violet-800)" }}>
          Firmar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        style={{
          width: "100%",
          height: 100,
          border: "1.5px dashed var(--violet-300)",
          borderRadius: 14,
          background: "#fff",
          touchAction: "none",
          cursor: "crosshair",
          display: "block",
        }}
      />
      {hayTrazo ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn-fg)", background: "var(--warn-bg)", borderRadius: 10, padding: "6px 10px", marginTop: 8 }}>
          Todavía no está guardada: tocá "Guardar firma" para que quede en el informe.
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 6 }}>Firmá dentro del recuadro y tocá "Guardar firma"</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={limpiar} disabled={!hayTrazo || guardando} style={{ ...botonBase, background: "var(--neutral-bg)", color: "var(--neutral-fg)", opacity: hayTrazo ? 1 : 0.5 }}>
          Borrar
        </button>
        <button
          onClick={guardar}
          disabled={!hayTrazo || guardando}
          style={{ ...botonBase, background: "var(--active-bg)", color: "var(--on-active)", opacity: hayTrazo && !guardando ? 1 : 0.5 }}
        >
          {guardando ? "Guardando…" : "Guardar firma"}
        </button>
        {rehaciendo ? (
          <button onClick={cancelar} disabled={guardando} style={{ ...botonBase, background: "transparent", color: "var(--muted)" }}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
