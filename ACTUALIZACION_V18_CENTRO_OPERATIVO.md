# CHC Rebanado Digital v18.0 - Centro operativo de vales

Esta versión reorganiza la pantalla principal de gestión de vales sin modificar la estructura de la base de datos.

## Cambios principales

- Nueva jerarquía visual para distinguir de inmediato:
  - número de vale;
  - orden o pedido;
  - cliente o sucursal;
  - estado, prioridad y atraso;
  - artículos incluidos;
  - entrega y origen del vale.
- Tarjetas con un fondo sutil y semitransparente según el estado:
  - Pendiente;
  - Rebanando;
  - Listo;
  - Entregado;
  - Cancelado.
- Lista de artículos reorganizada con número de renglón, producto, SKU, cantidad, presentación, tipo de corte e indicaciones.
- Botonera uniforme y alineada al pie de todas las tarjetas, incluso cuando los vales contienen distinta cantidad de artículos.
- Búsqueda más clara con botón para limpiar el texto.
- Filtros de estado con iconos y conteos visibles.
- Conservación del contexto operativo:
  - después de cambiar el estado, el sistema vuelve al mismo vale;
  - si el vale cambia de posición por el reordenamiento, la pantalla se desplaza hasta él;
  - el vale queda resaltado con la etiqueta `VALE ACTUALIZADO`;
  - también se conserva el filtro de estado y la búsqueda activa cuando se actualiza desde el tablero.
- Al entrar a Detalle o Editar desde el tablero, el botón Regresar vuelve a la fecha y al vale de origen.
- Al guardar una edición iniciada desde el tablero, se regresa directamente al vale enfocado.
- Al crear un vale, el tablero abre la fecha correspondiente y enfoca el vale recién creado.

## Base de datos

No requiere scripts ni cambios de tablas.

## Archivos principales modificados

- `views/vales/tablero.ejs`
- `views/vales/detalle.ejs`
- `views/vales/formulario.ejs`
- `public/css/institutional.css`
- `public/js/app.js`
- `controllers/valeController.js`

## Pruebas realizadas

- Validación de sintaxis de JavaScript.
- Renderizado de humo de las plantillas EJS modificadas con datos simulados.
- Pruebas existentes de rangos de entrega, configuración y sincronización.
