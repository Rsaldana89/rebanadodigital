# ACTUALIZACION V19.0.27 · CORONELBOT compacto en TV

## Objetivo
Hacer legible el indicador de CORONELBOT en Google TV / Fully Kiosk sin modificar su presentación completa en escritorio.

## Cambios
- En escritorio se conserva el indicador completo: CORONELBOT, último contacto y estado.
- En TV horizontal (viewport lógico de hasta 1500 px) se muestra únicamente el icono y un estado grande y útil:
  - `ONLINE` cuando CORONELBOT está saludable.
  - `ALERTA` cuando no está saludable.
  - `SIN DATOS` cuando el estado no está disponible.
- Se elimina en TV el texto truncado `CORONELB...` y el detalle de minutos/horas, liberando espacio de la cabecera.
- Se conservan colores de estado en tema oscuro y claro.
- Caché de la pantalla actualizada a v19.0.27.
