# CHC Rebanado Digital v17.1 — Heartbeat de CORONELBOT

## Cambio principal

Se añadió un endpoint de heartbeat para distinguir entre:

- una app CORONELBOT apagada o sin comunicación;
- una consulta correcta que simplemente no encontró órdenes aplicables.

## Endpoint

```http
POST /api/integraciones/sap/rebanado/heartbeat
Authorization: Bearer REBANADO_SYNC_TOKEN
Content-Type: application/json
```

Ejemplo:

```json
{
  "source": "CORONELBOT",
  "syncRunId": "2026-07-28T12:00:00.000Z_HEARTBEAT",
  "checkedAt": "2026-07-28T12:00:00.000Z",
  "queriedRows": 7,
  "eligibleOrders": 0,
  "syncStatus": "success",
  "message": "Consulta completada sin órdenes aplicables."
}
```

El heartbeat usa la tabla existente `rebanado_sync_runs`; no requiere una migración adicional si la migración CORONELBOT original ya fue aplicada.

## Estado visual

El dashboard y el tablero ahora muestran:

- Último contacto de CORONELBOT.
- Última sincronización de datos exitosa.
- Resumen de creados, actualizados y omitidos.
- Último error de datos, si existe.

La alerta se calcula con el último contacto/heartbeat. El valor sugerido es:

```env
REBANADO_SYNC_ALERT_HOURS=6
```

Esto deja margen para una automatización que corre cada 4 horas.


Margen recomendado para retrasos normales del programador:

```env
REBANADO_SYNC_ALERT_GRACE_MINUTES=30
```
