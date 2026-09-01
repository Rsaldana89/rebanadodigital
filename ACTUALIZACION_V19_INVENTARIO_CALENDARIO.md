# CHC Rebanado Digital V19.0

## Orden de instalación

1. Realizar respaldo de la base de datos.
2. Ejecutar `database/migrations/2026-09-01_inventario_catalogo_calendario_v19.sql` en la base local.
3. Ejecutar el mismo script en la base de Railway.
4. Sustituir el proyecto por esta versión conservando el archivo `.env` de cada instalación.
5. Ejecutar `npm ci` y después `npm test`.
6. Iniciar con `npm start`.

La migración no elimina `inventario_rebanado`, vales, productos de vales ni historiales existentes.

## Pruebas rápidas

- `/inventario`: visible para todos los perfiles autenticados.
- CEDIS/Administrador: cargar producto sin rebanar, registrar merma y dar de alta un SKU.
- Rebanado: entrar a `/inventario/cierre` y guardar cuánto rebanado queda.
- Crear un vale manual con un SKU del catálogo y comprobar la sugerencia de descripción.
- Entregar un vale y verificar la salida en Inventario → Movimientos.
- Reabrir el vale y verificar la reversión.
- Abrir el calendario del tablero y confirmar que los días con vales estén resaltados.

## Reglas implementadas

- Existencia real = sin rebanar + rebanado que queda.
- Rebanado es historial, no existencia.
- Al entregar se usa primero lo rebanado que queda y luego lo que está sin rebanar.
- El cierre es corregible y no duplica cantidades.
- El inventario sin rebanar puede quedar negativo y nunca bloquea un vale.
- Las descripciones pueden variar; todos los movimientos se consolidan estrictamente por SKU.
- Siclik conserva su descripción original y no sobrescribe la descripción sugerida del catálogo.

