# Actualización v18.2.7 — Vales manuales corregidos

## Corrección

- Se corrigió la captura de productos al crear o editar vales manuales.
- El servidor ahora reconoce tanto los campos `sku[]`, `producto[]`, `cantidad[]`, etc., como sus equivalentes sin corchetes.
- Funciona con uno o varios productos en la misma comanda.
- Se conserva intacta la sincronización de pedidos provenientes de Siclik.

## Base de datos

Esta revisión no requiere scripts ni cambios en la base de datos.

## Prueba recomendada

1. Crear un vale manual con un solo producto.
2. Crear otro vale manual con dos productos.
3. Confirmar que ambos aparecen en el tablero y que el detalle muestra todos sus productos.
