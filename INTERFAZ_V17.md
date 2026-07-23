# Interfaz V17 · Comandas por pedido

## Decisión operativa

Cada vale corresponde a un cliente o pedido e incluye todos los productos que deben rebanarse, como una comanda de restaurante.

## Cambios de interfaz

- Nuevo formulario dinámico para agregar o quitar productos.
- Número de pedido opcional en la cabecera del vale.
- Tarjetas del tablero muestran cliente y lista compacta de productos.
- El detalle separa datos generales y productos de la comanda.
- La pantalla de almacén muestra todos los productos agrupados por vale.
- Los reportes conservan un renglón por vale en pantalla y exportan un renglón por producto en CSV.
- El estado sigue perteneciendo al vale completo para mantener un proceso simple.

## Permisos

Se agregó `vales.edit`:

- Administrador: permitido.
- CEDIS: permitido.
- Almacén: permitido.
- Rebanado: bloqueado por defecto.
