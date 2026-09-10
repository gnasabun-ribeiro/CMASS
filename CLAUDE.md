# CMASS — Inspecciones

App de inspecciones de seguridad e higiene (React + Vite, backend en Supabase).

## Estructura

- `src/data/modulos.js` — catálogo de módulos del menú principal (Inspecciones de Obra Pública, Servicio, Simulacro, etc.) y los 4 pasos del formulario (`PASOS`).
- `src/data/checklist.js` — ítems del checklist de cada módulo. **Son estáticos, viven en el código**, no en la base de datos.
- `src/pages/Formulario/` — formulario de 4 pasos: Generales → Checklist → Hallazgos → Cierre.
- `supabase/*.sql` — schema de la base. No hay herramienta de migraciones: cada archivo se ejecuta a mano en Supabase Dashboard → SQL Editor (ver comentario al inicio de cada archivo).

## Alcance actual

Por ahora solo se está construyendo el módulo **Inspecciones de Obra Pública** (`moduloId: "obra"`). Los demás módulos con formulario de 4 pasos (`servicio`, `simulacro`, `visita`, `top`) siguen usando datos de placeholder hasta que se definan sus propios checklists.

## Checklist de Obra Pública

- Fuente: `Checklist_Seguridad_Higiene_Obra_Publica.xlsx` (35 ítems en 7 categorías: Documentación y Gestión, Condiciones Generales, Equipos y Herramientas, Emergencias, Higiene y Medio Ambiente, Personal y Conducta Segura, Capacitación y Comunicación).
- Está cargado en `src/data/checklist.js` como `CHECKLIST_OBRA`, agrupado por categoría con código `"<categoría>.<ítem>"` (ej. `"2.3"`).
- `getChecklist(moduloId)` devuelve el checklist correcto según el módulo; si el módulo no tiene uno propio, cae a `CHECKLIST_GENERICO` (placeholder).
- Si se necesita agregar/editar/quitar ítems del checklist de obra, se edita esa lista en el código — no hay tabla de "ítems maestros" en la base, por decisión explícita: los ítems son fijos, lo que varía (y se persiste) son las respuestas de cada inspección.

## Persistencia (Supabase)

- `supabase/profiles.sql` — perfil 1 a 1 con `auth.users` (ya en uso, ver `AuthContext.jsx`).
- `supabase/inspecciones_obra.sql` — creado para guardar las inspecciones de obra pública:
  - `inspecciones_obra`: cabecera con los campos del Paso 1 (Generales) — cliente, ubicación, grupo auditado, fecha/hora, tarea observada — más `estado` (`borrador`/`enviado`).
  - `inspecciones_obra_checklist`: una fila por ítem respondido en el Paso 2 (código, categoría, texto del ítem al momento de responder, valor `ok`/`no`/`na`, foto). El texto se copia en cada respuesta para que el historial no cambie si el checklist se edita después.
  - RLS: cada inspector solo ve/edita sus propias inspecciones (`auth.uid() = inspector_id`).

### Guardado ya conectado (Generales + Checklist)

- `src/lib/inspeccionesObra.js` — funciones de acceso a datos: `crearBorradorObra`, `guardarGeneralesObra`, `guardarRespuestaChecklist`, `marcarEnviadaObra`.
- `Formulario/index.jsx`, solo cuando `moduloId === "obra"` y Supabase está configurado (`supabaseConfigured`):
  - Al entrar al formulario crea una fila en `inspecciones_obra` (estado `borrador`) usando `userId` de `useAuth()` (agregado a `AuthContext` — antes solo exponía `email`/`nombre`). Se guarda una sola vez por sesión de formulario (guard con `useRef` para que StrictMode no duplique el insert).
  - Los campos de `PasoGenerales` (ahora controlado, recibe `valores`/`onCambiar`) se guardan con debounce de 800ms mientras se escribe.
  - Cada respuesta del checklist (Paso 2) se guarda al toque con `upsert` sobre `(inspeccion_id, codigo)`.
  - El botón "Borrador" fuerza un guardado inmediato de Generales antes de salir; "Cerrar y enviar" marca la inspección como `enviado`.
  - El indicador "Guardado" del resumen (Paso 4) muestra el tiempo real desde el último guardado exitoso, o "Error al guardar" si falló la última escritura.
- **Sin implementar todavía:** Hallazgos (Paso 3) y firmas (Paso 4) siguen siendo datos mockeados en memoria (`HALLAZGOS_INICIALES`, `FIRMAS` en `PasoCierre.jsx`) — no tienen tabla propia ni se pidió una. Tampoco hay manejo de reintentos/offline si falla el guardado (más allá de mostrar el error) — el módulo "Pendientes de sincronizar" del menú sugiere que eventualmente debería existir una cola offline, pero no se construyó acá.
- El archivo `supabase/inspecciones_obra.sql` se creó en el repo pero **hay que ejecutarlo a mano** en Supabase Dashboard → SQL Editor si todavía no se corrió — sin esas tablas, el guardado falla silenciosamente en el indicador "Guardado" (queda en "Error al guardar").
