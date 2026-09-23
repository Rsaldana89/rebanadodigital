# CHC Rebanado Digital v19.0.22 · Logo y sonido TV

Fecha: 23/09/2026

## Cambios

- Se reemplazó el monograma cuadrado `CHC` de la cabecera de `/pantalla` por una versión local del logotipo **Hermanos Coronel Cremería**, integrada en una tarjeta vino con bordes suaves/redondeados.
- El logotipo se incluye como SVG local para no depender de una imagen externa y se almacena también en la caché de la PWA de la pantalla.
- Se incrementó de forma importante la presencia del aviso sonoro cuando un vale cambia de estado en la pantalla de almacén.
- El aviso para TV ahora usa varias notas en frecuencias medias, armónicos y compresión dinámica para escucharse mejor en bocinas pequeñas de televisión.
- El volumen del aviso de la pantalla de almacén es mayor que el del tablero operativo.
- Se mantienen intactas las proporciones TV/4K, las cuatro columnas, el tema y la actualización automática de v19.0.21.
- Se actualizó la versión de caché/PWA a v19.0.22 para evitar que Fully Kiosk conserve CSS o JavaScript anterior.

## Prueba rápida recomendada en TV

1. Publicar la versión en Railway.
2. Abrir `/pantalla` en Fully Kiosk y recargar una vez.
3. Pulsar una vez el botón **Sonido** para escuchar la vista previa y desbloquear audio si el WebView lo requiere.
4. Cambiar un vale de estado desde otra sesión y confirmar que la alerta se escucha en la TV.
