# ACTUALIZACION V19.0.28 · Campanita al llegar un vale nuevo

## Cambio
La campanita de la pantalla de almacén ahora se activa en dos situaciones:

1. Cuando un vale existente cambia de estado.
2. Cuando aparece un vale nuevo que no existía en la actualización anterior.

La primera carga de la pantalla no genera sonido por todos los vales existentes. Se guarda un snapshot inicial y, a partir de la siguiente actualización automática, únicamente se avisa por altas nuevas o cambios reales.

## Pantalla TV
La pantalla continúa recargándose automáticamente cada 30 segundos. Si durante ese intervalo entra un vale nuevo, al refrescarse el tablero sonará la misma alerta fuerte configurada para almacén.

## Caché
Se incrementó la versión de recursos y Service Worker a v19.0.28 para evitar que Fully Kiosk conserve el JavaScript anterior.
