import { cloneElement, forwardRef, isValidElement, useId } from "react";

// Campo con etiqueta, ayuda y error, todo asociado por id (lectores de pantalla). Uso:
//   <Field label="Ubicación" hint="Sector o batería" error={falta && "Completá la ubicación"}>
//     <Input value={v} onChange={...} />
//   </Field>
// Field le pasa al control id, aria-describedby y aria-invalid. Sirve con Input, Textarea,
// Select, Combobox y MultiSelect.
export function Field({ label, hint, error, children, className = "", style, id: idPropio }) {
  const auto = useId();
  const id = idPropio || children?.props?.id || `campo-${auto}`;
  const idHint = hint ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const describedBy = [children?.props?.["aria-describedby"], idHint, idError].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : children.props["aria-invalid"] })
    : children;

  return (
    <div className={className} style={{ minWidth: 0, ...style }}>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      ) : null}
      {control}
      {hint && !error ? (
        <div id={idHint} className="field-hint">
          {hint}
        </div>
      ) : null}
      {error ? (
        <div id={idError} className="field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

const claseCampo = (size, variant, className) =>
  ["field", size && size !== "md" && `field--${size}`, variant && `field--${variant}`, className].filter(Boolean).join(" ");

// size: sm | md | lg. variant: "papel" (renglón de la Tarjeta TOP).
export const Input = forwardRef(function Input({ size, variant, className, ...props }, ref) {
  return <input ref={ref} className={claseCampo(size, variant, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ size, variant, className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={claseCampo(size, variant, className)} {...props} />;
});
