# CHC Rebanado Digital v19.0.20 · Campanita de cambio de estado

## Cambios

- Pantalla de Almacén (`/pantalla` y `/pantalla2`) emite una campanita breve cuando un vale visible cambia de estado.
- Tablero operativo de Vales también detecta cambios de estado y emite la misma campanita.
- La detección combina snapshot entre recargas y polling ligero cada 8 segundos de los IDs visibles.
- Los vales nuevos no generan sonido: sólo un cambio de estado de un vale ya conocido.
- Botón **Sonido** para activar/desactivar la campanita. La preferencia queda guardada en `localStorage`.
- Si el navegador bloquea el audio automático, el botón muestra **Activar sonido**; basta pulsarlo una vez para habilitarlo.
- No se agregó ningún archivo MP3/WAV: el tono se genera con Web Audio API.
- No requiere cambios de base de datos.

## PWA

- Cachés actualizados a v19.0.20.
- `state-chime.js` se incluye en las dos PWAs.
