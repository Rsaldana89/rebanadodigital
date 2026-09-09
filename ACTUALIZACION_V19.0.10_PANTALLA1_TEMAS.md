# CHC Rebanado Digital v19.0.10 - Pantalla informativa principal con temas

## Cambios

- `/pantalla` ahora es la vista principal de **4 columnas**: Entregados, Listos, Rebanando y Pendientes.
- Las cuatro franjas conservan el scroll automatico vertical en un solo sentido.
- Tema **claro por defecto**.
- Nuevo boton para cambiar entre **Tema claro** y **Tema oscuro**.
- La preferencia se guarda en `localStorage` con la clave `chc-pantalla-informativa-theme`, por lo que se conserva despues de recargar, cerrar y volver a abrir el navegador/PWA en ese equipo.
- El cambio de tema aplica **solo a la nueva pantalla informativa `/pantalla`**.
- `/pantalla2` conserva la vista anterior por secciones para poder comparar ambas alternativas.
- La PWA de pantalla abre `/pantalla` y usa colores claros por defecto.
- Se incremento la version del cache de la PWA para evitar que quede CSS anterior almacenado.

No requiere cambios de base de datos.
