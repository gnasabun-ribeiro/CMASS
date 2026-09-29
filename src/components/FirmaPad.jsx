import { useEffect, useRef, useState } from "react";

const ANCHO = 600;
const ALTO = 200;

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
// (`firma.url`) la muestra y ofrece volver a firmar.
export default function FirmaPad({ firma, guardando, onGuardar }) {
  const canvasRef = useRef(null);
  const dibujandoRef = useRef(false);
  const [hayTrazo, setHayTrazo] = useState(false);
  const [rehaciendo, setRehaciendo] = useState(false);
  const mostrarImagen = Boolean(firma?.url) && !rehaciendo;

  const limpiar = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, ANCHO, ALTO);
    setHayTrazo(false);
  };

  useEffect(() => {
    if (!mostrarImagen) limpiar();
  }, [mostrarImagen]);

  const punto = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * ANCHO) / rect.width, y: ((e.clientY - rect.top) * ALTO) / rect.height };
  };

  const empezar = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = punto(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01); // un toque suelto deja un punto
    ctx.stroke();
    setHayTrazo(true);
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
      const ok = await onGuardar(blob);
      if (ok !== false) setRehaciendo(false);
    }, "image/png");
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
        width={ANCHO}
        height={ALTO}
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
          <button onClick={() => setRehaciendo(false)} disabled={guardando} style={{ ...botonBase, background: "transparent", color: "var(--muted)" }}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
