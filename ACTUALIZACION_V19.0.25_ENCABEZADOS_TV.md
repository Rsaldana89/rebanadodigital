# ACTUALIZACION V19.0.25 · Encabezados TV

## Objetivo
Corregir el recorte del encabezado de la columna **Entregados** en pantallas Google TV / Fully Kiosk sin alterar el layout general de 4 columnas que ya quedó aprobado.

## Cambios realizados
- Se añadió adaptación específica para el encabezado de la columna **Entregados**.
- El icono del estado en esa columna se hace más compacto.
- El texto del título y subtítulo ahora reduce tamaño de manera controlada para no recortarse.
- El contador del número de vales entregados también se compacta ligeramente.
- Se reforzó `min-width: 0` y el truncado por elipsis para que todos los títulos de columnas se adapten mejor al ancho disponible en TV.
- Se actualizó la caché/PWA a **v19.0.25** para forzar refresco visual en Fully Kiosk.

## Resultado esperado
- El título **Entregados** y su subtítulo ya no deben verse cortados en la TV.
- El resto de columnas mantiene el estilo y legibilidad alcanzados en la revisión anterior.
