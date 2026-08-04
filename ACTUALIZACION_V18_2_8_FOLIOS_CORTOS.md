# Actualización v18.2.8 — Folios cortos por origen

Los vales nuevos ahora reciben un folio corto construido con su origen, el año,
el mes y el ID real del registro:

- Manual: `VM-AAMM-ID`, por ejemplo `VM-2608-0127`.
- Siclik: `VS-AAMM-ID`, por ejemplo `VS-2608-0128`.
- Excel: `VE-AAMM-ID`, reservado para cargas de ese origen.

El ID se muestra con un mínimo de cuatro dígitos. Si supera 9999 se conserva
completo, por lo que el folio sigue siendo único.

El número original de pedido de Siclik no se reemplaza: continúa guardado en
`numero_pedido` y aparece por separado en el tablero, detalle, pantalla y
reportes.

## Instalación

No requiere migración ni cambios en la base de datos. Los vales existentes
conservan su folio; la nueva nomenclatura se aplica a los vales creados a partir
de esta versión.
