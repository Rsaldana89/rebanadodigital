# CHC Rebanado Digital v19.0.24

Ajustes de Pantalla informativa para Google TV / Fully Kiosk y pantallas 1080p/4K.

## Cambios

- Se mantiene la vista de cuatro columnas y las proporciones de escritorio.
- Se cambia el viewport de la pantalla a `device-width` para evitar el escalado forzado de 1920 px que provocaba texto comprimido en algunos WebView de Android TV.
- La cabecera ahora tiene altura controlada y no crece aunque el navegador reporte un ancho logico menor.
- En viewports tipicos de Google TV se compactan automaticamente los controles de tema, sonido, reloj y CORONELBOT.
- El texto secundario del reloj se abrevia en pantallas con menor ancho logico.
- La linea de entrega del encabezado se simplifica para evitar saltos de linea.
- Se incrementa la legibilidad de folio, cliente, lugar de entrega, productos, cantidades, tipo de rebanado, fechas y estados sin aumentar el padding de los vales.
- Cliente y lugar de entrega se mantienen en una sola linea con elipsis cuando no caben, evitando que crezca el alto de las tarjetas.
- Los iconos de `/pantalla` dejan de depender de Bootstrap Icons/CDN. Ahora son SVG incluidos dentro de la propia vista, para que se vean tambien en Fully Kiosk y aunque falle la carga de fuentes externas.
- Se elimina la dependencia de Bootstrap CDN en la pantalla informativa.
- Cache de PWA actualizado a v19.0.24.

## Compatibilidad

Los cambios se limitan a la pantalla informativa y sus parciales. No se modifica la conexion a base de datos, reglas de negocio, inventario, sincronizacion ni configuracion de Railway.
