# Actualización v18.2.3 - Filtros del tablero

Se corrigió un conflicto de CSS que impedía ocultar visualmente los vales que no coincidían con el filtro seleccionado.

## Causa

Las tarjetas del tablero usan `display: flex !important`. Esa regla podía imponerse sobre la clase utilitaria `d-none`, aunque el contador y el filtro interno sí cambiaran correctamente.

## Corrección

- Cada tarjeta ahora utiliza también el atributo HTML `hidden`.
- Se agregó una regla específica para asegurar que las tarjetas filtradas no se muestren.
- Se conserva `d-none` por compatibilidad.
- El enfoque automático de un vale actualizado reconoce también el atributo `hidden`.

No requiere cambios de base de datos.
