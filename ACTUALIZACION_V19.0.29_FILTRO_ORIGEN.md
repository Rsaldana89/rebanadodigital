# ACTUALIZACION V19.0.29 · Filtro por origen de vale

## Cambio
Se agregó un segundo filtro visual al tablero **Gestión de vales** para separar rápidamente los vales por su origen, sin cambiar la forma en que se generan los folios.

Opciones disponibles:

- **Todos**: muestra todos los vales visibles para la fecha.
- **Siclik**: muestra los vales sincronizados por CORONELBOT / Siclik.
- **Manuales**: muestra los vales capturados manualmente en Rebanado Digital.
- **Otros**: aparece únicamente cuando existen vales con otro origen (por ejemplo, Excel).

El filtro se combina con los filtros existentes de estado y con el buscador. Por ejemplo, es posible consultar únicamente **Pendientes + Siclik** o **Listos + Manuales**.

## Persistencia operativa
El origen seleccionado se conserva al:

- Cambiar el estado de un vale.
- Abrir el detalle y regresar al tablero.
- Cambiar la fecha desde el selector de entrega.

Si se regresa a un vale que ya no coincide con el filtro seleccionado, el tablero ajusta temporalmente estado y origen para mantener visible el vale y no perder el contexto de operación.

## Base de datos
No requiere migraciones ni cambios en la estructura de la base de datos.

## Caché / PWA
Se incrementó la versión principal de recursos a **v19.0.29** para que navegadores y la PWA reciban el JavaScript y estilos del nuevo filtro.
