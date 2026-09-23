# CMASS — Inspecciones

App de inspecciones de seguridad e higiene (React + Vite, backend en Supabase).

## Estructura

- `src/data/modulos.js` — catálogo de módulos del menú principal (Inspecciones de Obra Pública, Servicio, Simulacro, etc.) y los 4 pasos del formulario (`PASOS`).
- `src/data/checklist.js` — ítems del checklist de cada módulo. **Son estáticos, viven en el código**, no en la base de datos.
- `src/pages/Formulario/` — formulario de 4 pasos: Generales → Checklist → Hallazgos → Cierre.
- `supabase/*.sql` — schema de la base. No hay herramienta de migraciones: cada archivo se ejecuta a mano en Supabase Dashboard → SQL Editor (ver comentario al inicio de cada archivo).

## Temas (Default / Ribeiro)

- `src/index.css` define la paleta como variables CSS (`--violet-900`...`--violet-25`, `--ink`, `--muted-*`, `--border`, `--shadow-*`, `--app-gradient`, `--brand-gradient`, etc.) en `:root`. Los ~20 componentes que pintan color leen esas variables con `var(--...)` en sus `style` inline — no hay CSS-in-JS ni Tailwind.
- Segundo tema bajo `[data-tema="ribeiro"]` en el mismo archivo: redefine las mismas variables (no las renombra) con la paleta negro cálido + amarillo del portal real de Ribeiro (`C:\Users\Geraldine Nasabun\SICER\ribeiro-app\src\styles\variables.css` — proyecto hermano, no forma parte de este repo). El atributo `data-tema` se setea en `<html>` desde `src/context/ThemeContext.jsx` (mismo patrón que `AuthContext`), persistido en `localStorage` (`cmass:tema`) y también actualiza el `<meta name="theme-color">`. Selector visible en `Home.jsx`.
- Los colores semánticos (`--success-*`, `--warn-*`, `--danger-*`, `--neutral-*`, severidad de hallazgos) **no cambian entre temas** — decisión ya tomada para el tema violeta original (el color comunica riesgo, no marca) y se mantuvo igual para Ribeiro.
- Las cards (`ModuleCard.jsx`, `SubItemCard.jsx`) usan variables propias `--card-bg`/`--card-border`/`--card-title`/`--card-desc`/`--card-accent`/`--card-accent-bg` en vez de blanco fijo — en Default son blancas (como siempre), en Ribeiro son oscuras con ícono en círculo, calcado del grid de módulos del portal real. El estado hover/pressed "destacado" (borde + ícono + título en amarillo sólido) está en `src/index.css` bajo `[data-tema="ribeiro"] .card-tap:hover`/`.card-lift:hover`, apuntando a las clases `card-icon`/`card-title` que hay que mantener en cualquier card nueva que se agregue si se quiere el mismo efecto.
- `--violet-700`/`--violet-800` sirven de doble rol (texto/ícono sobre fondo claro Y, antes, fondo sólido con texto blanco encima) — el segundo rol se separó a variables propias `--active-bg`/`--on-active` (estado activo de pills/botones: fondo amarillo + texto oscuro en Ribeiro, calcado del patrón real `.rb-nav-item.is-active`/`.rb-btn--primary` del portal) y `--cta-gradient`/`--on-cta` (CTAs principales: Login, "Siguiente/Cerrar" del formulario). Si se agrega un nuevo botón "fill + texto blanco", hay que usar `--active-bg`/`--on-active` (o `--cta-gradient`/`--on-cta` si es un CTA de gradiente), no `--violet-700` + `#fff` a mano, o se rompe en Ribeiro.
- Quedaron sin tematizar (a propósito, bajo impacto visual): las sombras de tarjetas genéricas que usan `rgba(36,18,70,X)` hardcodeado inline en vez de las variables `--shadow-*` (Pendientes, Login, Lista, ModuleCard, Formulario), y el tinte rosado de las tarjetas de hallazgos en `PasoHallazgos.jsx` (`#fff8fb`/`#f7dce7`, no es color de marca).

## Alcance actual

Por ahora solo se está construyendo el módulo **Inspecciones de Obra Pública** (`moduloId: "obra"`) a nivel de persistencia/Supabase. Los demás módulos con formulario de 4 pasos (`servicio`, `simulacro`, `visita`, `top`) todavía no tienen guardado conectado; `servicio` ya tiene su propio checklist real (ver abajo), el resto sigue con `CHECKLIST_GENERICO` (placeholder) hasta que se definan.

`reglas` (Reglas de Oro) es distinto: no es `form: true`, tiene `subs` (una por cada una de las 10 reglas) que abren el mismo formulario de 4 pasos vía `/modulos/reglas/form/:subId`. Cada sub puede tener su propio checklist — por ahora solo **Seguridad vial** (`subId: "seguridad-vial"`) tiene uno real, el resto de las reglas sigue con `CHECKLIST_GENERICO` hasta que se definan. Tampoco tiene persistencia en Supabase conectada (mismo estado que `servicio`).

## Checklist de Obra Pública

- Fuente: `Checklist_Seguridad_Higiene_Obra_Publica.xlsx` (35 ítems en 7 categorías: Documentación y Gestión, Condiciones Generales, Equipos y Herramientas, Emergencias, Higiene y Medio Ambiente, Personal y Conducta Segura, Capacitación y Comunicación).
- Está cargado en `src/data/checklist.js` como `CHECKLIST_OBRA`, agrupado por categoría con código `"<categoría>.<ítem>"` (ej. `"2.3"`).
- `getChecklist(moduloId)` devuelve el checklist correcto según el módulo; si el módulo no tiene uno propio, cae a `CHECKLIST_GENERICO` (placeholder).
- Si se necesita agregar/editar/quitar ítems del checklist de obra, se edita esa lista en el código — no hay tabla de "ítems maestros" en la base, por decisión explícita: los ítems son fijos, lo que varía (y se persiste) son las respuestas de cada inspección.

## Checklist de Servicios Petroleros

- Fuente: `Checklist_Seguridad_Higiene_Servicios_Petroleros.xlsx` (29 ítems en 6 categorías: Documentación y Permisos, Condiciones del Área, Vehículos y Equipos, Emergencias, Medio Ambiente, Personal).
- Está cargado en `src/data/checklist.js` como `CHECKLIST_SERVICIO` y registrado en `CHECKLISTS_POR_MODULO` bajo `servicio`, con el mismo formato que el de obra (misma función `buildChecklist`, mismo código `"<categoría>.<ítem>"`).
- A diferencia de `obra`, este módulo todavía **no tiene persistencia en Supabase**: las respuestas del Paso 2 quedan solo en memoria (`respuestas` en `Formulario/index.jsx`) porque `persisteEnSupabase` solo se activa para `moduloId === "obra"`. Si se pide conectar el guardado, hay que generalizar `inspeccionesObra.js`/las tablas SQL o crear su equivalente para servicio.

## Checklist de Reglas de Oro → Seguridad Vial

- Fuente: planilla de verificación de vehículos (no viene de un xlsx como los otros dos, se cargó a partir de una captura de pantalla). 12 preguntas, una sola categoría ("Seguridad Vial", sin subcategorías).
- Está cargado en `src/data/checklist.js` como `CHECKLIST_SEGURIDAD_VIAL`.
- A diferencia de `obra`/`servicio` (un checklist fijo por módulo), acá el checklist depende del **sub-módulo**, no solo del módulo: `getChecklist(moduloId, subId)` primero busca en `CHECKLISTS_POR_SUBMODULO[moduloId]?.[subId]` y si no hay nada cae a `CHECKLISTS_POR_MODULO[moduloId] || CHECKLIST_GENERICO`. Está registrado bajo `CHECKLISTS_POR_SUBMODULO.reglas["seguridad-vial"]`. `Formulario/index.jsx` ya pasa `subId` a `getChecklist`.
- La planilla original también tenía datos de identificación del vehículo (tipo de vehículo, dominio/patente, liviano/pesado/otros, si el viaje es rutinario) que **no se cargaron** como ítems del checklist porque no son preguntas de sí/no/n-a — no encajan en el modelo `OPCIONES` (ok/no/na) que usa `PasoChecklist`. Quedan pendientes de definir dónde van (¿campos propios en Generales para este sub-módulo? ¿otro paso?) si se piden.
- Sin persistencia en Supabase, igual que el resto de `reglas` (ver arriba).

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

### Tabla auxiliar: `centros_de_costos` (DW Finnegans)

- Trae `RIBEIRO_BD_CENTROS_DE_COSTOS` desde el Data Warehouse de Finnegans (`ribeiro.dw.finneg.com`, Postgres) a `public.centros_de_costos` en Supabase. La conexión al DW la hace una **Edge Function llamada `DW_FINNEGANS`** (`supabase/functions/DW_FINNEGANS/index.ts`, Deno), no Postgres directamente — las credenciales del DW viven como *secrets* de esa función (Dashboard → Edge Functions → `DW_FINNEGANS` → Manage secrets) y nunca tocan un archivo que se commitea.
- `supabase/centros_de_costos.sql` solo crea la tabla local (`public.centros_de_costos`) y programa un cron (`pg_cron` + `pg_net`) que invoca la función por HTTP todos los días.
- La tabla guarda cada fila del DW tal cual, en una columna `data jsonb` — **no conocemos todavía la estructura real de `RIBEIRO_BD_CENTROS_DE_COSTOS`**, así que se evitó adivinar columnas. Cuando se vea la forma de los datos reales, se puede migrar a columnas tipadas (o agregar una vista sobre `data`).
- No es incremental: cada corrida de la función borra y vuelve a insertar todo `public.centros_de_costos`. No editar filas a mano, se pierden en el próximo sync.
- RLS: cualquier usuario autenticado puede hacer `select`; nadie inserta/edita/borra desde el cliente (solo la Edge Function, que usa la service role key).
- **Secrets que hay que cargar a mano** en el Dashboard, uno por uno (no como un solo JSON — ver `supabase/functions/DW_FINNEGANS/secrets.example.env` para la lista): `DW_HOST`, `DW_PORT`, `DW_DATABASE`, `DW_USER`, `DW_PASSWORD`, `SYNC_SECRET` (token propio para autorizar la llamada del cron, no es ni el anon key ni la service role key) y opcionalmente `DW_SCHEMA` (default `public`). `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo.
- El bloque `cron.schedule` en `centros_de_costos.sql` tiene placeholders `<PROJECT_REF>` y `<SYNC_SECRET>` que se completan recién en el SQL Editor, no en el archivo.
- **Supuesto sin confirmar:** que `ribeiro.dw.finneg.com` acepta conexiones entrantes desde la infraestructura de Supabase (las Edge Functions corren en la nube de Supabase, no en la red del usuario). Si el DW solo es accesible desde una VPN/red interna, esto no va a poder conectarse y hay que pedirle a IT que habilite el acceso, o cambiar de enfoque (algo corriendo dentro de la red del DW que empuje los datos a Supabase).
- Todavía no hay UI que consuma esta tabla — se agregó como tabla auxiliar para que otros módulos (ej. selects de "centro de costos" en el formulario) la puedan usar más adelante.
