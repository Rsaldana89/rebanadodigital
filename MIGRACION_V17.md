# Migración a V17: varios productos por vale

## Orden recomendado

1. Genera un respaldo de la base de datos.
2. Detén temporalmente o pausa el servicio de la aplicación.
3. Ejecuta en MySQL Workbench:

```text
database/migrations/2026-07-23_multi_producto_por_vale.sql
```

4. Confirma que el resultado final muestre `vales_sin_productos = 0`.
5. Sube y despliega el código V17.
6. Inicia sesión como Administrador y revisa `/permisos` para confirmar el permiso **Editar vales**.
7. Abre varios vales anteriores: cada uno debe conservar su producto original como primer producto de la comanda.

## Verificación manual

```sql
SELECT COUNT(*) AS total_vales FROM vales;
SELECT COUNT(*) AS total_productos FROM vale_productos;

SELECT
  v.id,
  v.folio,
  v.numero_pedido,
  v.cliente,
  COUNT(vp.id) AS productos
FROM vales v
LEFT JOIN vale_productos vp ON vp.vale_id = v.id
GROUP BY v.id, v.folio, v.numero_pedido, v.cliente
ORDER BY v.id DESC;
```

El número total de productos debe ser, como mínimo, igual al número de vales existentes antes de la migración, porque cada vale anterior tenía un producto.
