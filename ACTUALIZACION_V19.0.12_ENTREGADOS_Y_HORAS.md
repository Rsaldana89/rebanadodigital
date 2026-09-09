# Rebanado Digital v19.0.12 · Entregados visibles y horas de estado

## Objetivo
Alinear el tablero operativo de vales con la pantalla informativa para que un vale no desaparezca del trabajo del día al marcarse como **Entregado**, aunque su fecha/rango original de entrega corresponda a un día anterior.

## Cambios principales
- `/vales/tablero` conserva visibles los vales **Entregados durante la fecha seleccionada**, usando la fecha real del cambio de estado registrada en `vale_history`.
- Los vales activos (`Pendiente`, `Rebanando`, `Listo`) mantienen la lógica actual: fecha/rango seleccionado + atrasados activos.
- Los `Cancelado` del día también se consultan por la fecha real del cambio de estado para mantener consistencia.
- El filtro **Entregado** del tablero ahora cuenta y muestra esos vales del día aunque su fecha de entrega original sea anterior.
- El dashboard utiliza la misma lógica, por lo que el indicador **Entregados** deja de quedarse en cero cuando las comandas entregadas provenían de días anteriores.

## Horas visibles
Se reutiliza `vale_history`; no se agregan columnas ni cambios de base de datos.

- Un vale en `Listo` muestra discretamente: `Listo HH:mm`.
- Un vale `Entregado` muestra: `Listo HH:mm` y `Entregado HH:mm` cuando ambos eventos existen.
- Las horas se muestran en zona horaria `America/Mexico_City`.
- Los horarios aparecen tanto en el tablero operativo como en las tarjetas de las pantallas informativas.

## Compatibilidad
- Sin migración SQL.
- No modifica el flujo de permisos ni las transiciones de estado.
- Se actualizan los cachés PWA a v19.0.12 para refrescar los estilos.
