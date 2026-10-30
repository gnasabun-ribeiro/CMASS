/* Avisos del navegador con la app cerrada (Web Push). vite-plugin-pwa lo suma al service
   worker generado (workbox.importScripts en vite.config.js). Lo que llega lo manda la Edge
   Function enviar-push: { id, tipo, titulo, descripcion, ruta }. */

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { titulo: event.data && event.data.text() };
  }
  event.waitUntil(
    (async () => {
      // Con la app a la vista no hace falta: la campana ya la muestra.
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (ventanas.some((v) => v.visibilityState === "visible")) return;
      await self.registration.showNotification(datos.titulo || "Inspecciones CMASS", {
        body: datos.descripcion || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: datos.id || undefined,
        lang: "es",
        data: { ruta: datos.ruta || "/" },
      });
    })()
  );
});

// Tocar el aviso abre la app en la pantalla correspondiente (o la trae al frente).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ruta = (event.notification.data && event.notification.data.ruta) || "/";
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ventana = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (ventana) {
        await ventana.focus();
        ventana.postMessage({ tipo: "abrir-ruta", ruta }); // la app navega sin recargar (NotificacionesDelServidor)
        return;
      }
      await self.clients.openWindow(ruta);
    })()
  );
});
