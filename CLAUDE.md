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
- **Offline-first (Obra Pública):** el formulario ya no escribe directo en Supabase. Todo se guarda primero en IndexedDB del dispositivo (`src/lib/localDb.js`, lib `idb`; fotos y firmas como Blob) y se encola para subir. `src/lib/inspeccionesLocal.js` es la API que usa `Formulario/index.jsx` (cada inspección se crea con `crypto.randomUUID()` en el dispositivo; solo se sube cuando hay algo que subir, así no quedan borradores vacíos). `src/lib/sync.js` vacía la cola (`iniciarSync()` en `App.jsx`): al volver la conexión (`online`), al abrir la app, cada 30 s si hay pendientes y con "Sincronizar ahora". Orden: crear → datos → fotos/firmas → enviar. Es repetible (upserts con ids del dispositivo, rutas de storage fijas, 409 tolerado); un corte de red no es error, un error real (ej. RLS) se muestra y se reintenta. `useSync()` expone `{pendientes, sincronizando, ultimaSync, errores, online}` (badge del Header y pantalla Pendientes). **Todavía sin hacer:** PWA/service worker (la app tiene que estar ya cargada para trabajar sin conexión), copia local de `centros_de_costos`, y que Registros muestre también lo local aún no enviado. Los bullets de arriba describen el guardado original directo a Supabase; las funciones de `inspeccionesObra.js` siguen siendo las que ejecuta `sync.js`.
- **Hallazgos (Paso 3):** `supabase/inspecciones_obra_hallazgos.sql` (tabla `inspecciones_obra_hallazgos`, RLS por inspector — **hay que ejecutarlo a mano** en el SQL Editor). Cada hallazgo se inserta al guardarlo y se borra con "Eliminar"; los colores de severidad salen de `src/data/severidades.js`.
- **Fotos del checklist:** bucket privado `checklist-fotos` (`supabase/storage_checklist_fotos.sql`, ya ejecutado). `src/lib/fotosChecklist.js` comprime a JPEG (máx. 1600 px), sube a `<inspeccion_id>/<codigo>/<timestamp>.jpg`, guarda la ruta en `inspecciones_obra_checklist.foto_url` y muestra con URLs firmadas (1 h). Una foto por ítem, y el ítem tiene que estar respondido antes (la fila del checklist debe existir). Van al PDF en una grilla al final.
- **Firmas (Paso 4):** `supabase/inspecciones_obra_firmas.sql` (ya ejecutado). `FirmaPad.jsx` (canvas) + `src/lib/firmasObra.js`: PNG en el mismo bucket (`<inspeccion_id>/firmas/<rol>-<ts>.png`), fila por (inspección, rol) con el nombre del firmante. El inspector usa el nombre del usuario logueado; el responsable escribe el suyo. "Cerrar y enviar" exige las dos firmas (solo en obra). Van al PDF al final.
- **Registros:** `Lista.jsx` lee `inspecciones_obra` (`listarInspeccionesObra`) en "Mis Registros" y en `/registros/obra`, con filtro por estado (Borrador/Enviado), búsqueda y fechas; oculta borradores vacíos. Tocar un registro abre `/form/obra?id=<uuid>`, que carga Generales, checklist y hallazgos (`cargarInspeccionObra`) para retomarla.
- **Sin implementar todavía:** y guardado del resto de los módulos (el formulario avisa con un banner que no guardan).
- El archivo `supabase/inspecciones_obra.sql` se creó en el repo pero **hay que ejecutarlo a mano** en Supabase Dashboard → SQL Editor si todavía no se corrió — sin esas tablas, el guardado falla silenciosamente en el indicador "Guardado" (queda en "Error al guardar").

### Tabla auxiliar: `centros_de_costos` (DW Finnegans)

- Trae `RIBEIRO_BD_CENTROS_DE_COSTOS` desde el Data Warehouse de Finnegans (`ribeiro.dw.finneg.com`, Postgres) a `public.centros_de_costos` en Supabase. La conexión al DW la hace una **Edge Function llamada `DW_FINNEGANS`** (`supabase/functions/DW_FINNEGANS/index.ts`, Deno), no Postgres directamente — las credenciales del DW viven como *secrets* de esa función (Dashboard → Edge Functions → `DW_FINNEGANS` → Manage secrets) y nunca tocan un archivo que se commitea.
- `supabase/centros_de_costos.sql` solo crea la tabla local (`public.centros_de_costos`) y programa un cron (`pg_cron` + `pg_net`) que invoca la función por HTTP todos los días.
- La tabla guarda cada fila del DW tal cual, en una columna `data jsonb`. En el DW la tabla se llama `public.ribeiro_bd_centros_de_costos` (**en minúsculas**, la función la consulta así). Estructura real (sincronizado el 2026-09-29, 180 filas): `centrocostoid`, `codigo`, `nombre`, `descripcion`, `activo` (texto `"true"`/`"false"`), `base` (ej. `FAF12_RIBEIRO`) — todo como texto. Si hace falta, se puede migrar a columnas tipadas o agregar una vista sobre `data`.
- No es incremental: cada corrida de la función borra y vuelve a insertar todo `public.centros_de_costos`. No editar filas a mano, se pierden en el próximo sync.
- RLS: cualquier usuario autenticado puede hacer `select`; nadie inserta/edita/borra desde el cliente (solo la Edge Function, que usa la service role key).
- **Secrets que hay que cargar a mano** en el Dashboard, uno por uno (no como un solo JSON — ver `supabase/functions/DW_FINNEGANS/secrets.example.env` para la lista): `DW_HOST`, `DW_PORT`, `DW_DATABASE`, `DW_USER`, `DW_PASSWORD`, `SYNC_SECRET` (token propio para autorizar la llamada del cron, no es ni el anon key ni la service role key) y opcionalmente `DW_SCHEMA` (default `public`). `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo.
- El bloque `cron.schedule` en `centros_de_costos.sql` tiene placeholders `<PROJECT_REF>` y `<SYNC_SECRET>` que se completan recién en el SQL Editor, no en el archivo.
- **Confirmado:** `ribeiro.dw.finneg.com` acepta conexiones desde la nube de Supabase. El DW es un Amazon Aurora (RDS); su certificado lo firma la CA de RDS, que Deno no trae, y está emitido para el host de RDS y no para el alias `ribeiro.dw.finneg.com`. Por eso la función necesita además los secrets `DW_CA_CERT` (bundle PEM oficial de RDS us-east-1) y `DW_TLS_SERVERNAME` (host de RDS del certificado). No usar `DW_SSL_INSECURE`: `postgres.js` en Deno ignora `rejectUnauthorized:false`. Si el error es "table does not exist" (42P01), la función devuelve en `candidatas` las tablas del DW con nombre parecido.
- Todavía no hay UI que consuma esta tabla — se agregó como tabla auxiliar para que otros módulos (ej. selects de "centro de costos" en el formulario) la puedan usar más adelante.
