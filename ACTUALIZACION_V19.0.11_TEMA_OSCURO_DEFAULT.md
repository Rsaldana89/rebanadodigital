# Rebanado Digital v19.0.11 · Tema de Pantalla informativa

## Cambio solicitado

- La nueva Pantalla informativa de cuatro columnas (`/pantalla`) inicia en **modo oscuro** por defecto.
- El usuario puede cambiarla a **modo claro**.
- Solo la preferencia clara se guarda en `localStorage` con la llave `chc-pantalla-informativa-theme`.
- Al volver a modo oscuro se elimina la preferencia guardada y se regresa al valor predeterminado.
- El cambio de tema afecta ahora a **toda la pantalla**: fondo, cuatro columnas, encabezados, tarjetas, lugar de entrega, productos, contadores, reloj y controles.
- Se agregó una clase de respaldo al `body` para evitar conflictos de especificidad.
- Los CSS de `/pantalla` llevan versión `v=19.0.11` para invalidar caché anterior.
- El Service Worker de la PWA sube a caché `v19.0.11` y usa estrategia *network-first* para CSS/JS, evitando que estilos antiguos se queden pegados.

## Alcance

El selector de tema se mantiene únicamente en la nueva pantalla informativa `/pantalla`. No modifica las demás pantallas del sistema.

No requiere cambios de base de datos.
