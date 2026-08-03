# CHC Rebanado Digital v18.2.1

## Corrección crítica del tablero de vales

Se corrigió un conflicto entre el nuevo diseño y las reglas CSS heredadas de versiones anteriores.

### Problema corregido
- El vale conservaba una cuadrícula antigua de dos columnas.
- El bloque del cliente quedaba comprimido y el nombre se mostraba letra por letra.
- Los artículos y las acciones se desplazaban hacia la parte inferior.
- Las tarjetas adquirían una altura excesiva.

### Solución aplicada
- Las nuevas tarjetas dejaron de utilizar las clases visuales heredadas `op-vale-card` y `op-vale-operator`.
- El filtro del tablero ahora identifica los vales mediante `data-vale-id`.
- Se fuerza un flujo vertical independiente para encabezado, cliente, artículos, observaciones y acciones.
- Se eliminó la altura heredada de las tarjetas.
- Se mantiene el enfoque automático después de actualizar un vale.

No requiere cambios en la base de datos.
