# CHC Rebanado Digital v19.0.13 · Reportes operativos y Excel

## Objetivo
Convertir el apartado **Reportes** en un pequeño centro de análisis operativo, manteniendo el diseño institucional de Rebanado Digital y sin agregar tablas ni columnas a la base de datos.

## Nuevos reportes

### 1. Vales del periodo
- Consulta por día o rango de fechas.
- Filtro adicional por estado.
- Los vales activos se consideran por su fecha/rango de entrega.
- Los vales Entregados y Cancelados se consideran por la fecha real del cambio de estado.
- Resumen por Pendiente, Rebanando, Listo y Entregado.
- Muestra horas de **Listo** y **Entregado** cuando existen en `vale_history`.
- Excel con dos hojas: **Vales** y **Detalle productos**.

### 2. Productos rebanados
- Se basa en vales realmente marcados como **Entregado** dentro del periodo.
- Ranking de cantidad surtida por SKU.
- Top 5 de productos más rebanados y Bottom 5 de los menos rebanados.
- Cantidad de vales y clientes/sucursales por producto.
- Tipo(s) de rebanado utilizado(s).
- Cuando existe inventario V19, separa **rebanado nuevo** de producto utilizado desde **rebanado disponible**.
- Excel con ranking completo.

### 3. Merma y rendimiento
- Se alimenta de `inventario_movimientos`.
- Separa merma capturada manualmente y merma proveniente del cierre.
- Calcula porcentaje de merma frente al rebanado registrado durante el periodo.
- Incluye auditoría de fecha, usuario, referencia y observaciones.
- Excel con dos hojas: **Merma por producto** y **Detalle merma**.

## Filtros rápidos
- Hoy.
- Últimos 7 días.
- Mes actual.
- Rango personalizado.

## Excel
La exportación ahora genera archivos **Excel reales `.xlsx`**, no CSV renombrado. Se implementó un generador OpenXML interno para no agregar dependencias nuevas al proyecto ni modificar el proceso de despliegue de Railway.

## Base de datos
**No requiere script SQL ni migración.** Utiliza las tablas existentes:
- `vales`
- `vale_productos`
- `vale_history`
- `inventario_movimientos`
- `productos_rebanables`

## Compatibilidad
- Mantiene el permiso existente `reportes.view`.
- No modifica conexión a MySQL.
- No modifica el flujo de vales, inventario, pantalla informativa ni sincronización con CORONELBOT.
