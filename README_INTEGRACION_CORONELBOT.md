# Integración CORONELBOT con CHC Rebanado Digital V17

## 1. Objetivo

Esta integración permite que **CORONELBOT**, ejecutándose dentro de la red de CHC, consulte SAP / Retail One / HANA / Siclik y envíe únicamente la información operativa necesaria a CHC Rebanado Digital.

Rebanado Digital continúa siendo la aplicación principal para:

- Crear vales manualmente.
- Editar vales y productos.
- Operar comandas multiproducto.
- Cambiar estados.
- Consultar el tablero y la pantalla de almacén.

CORONELBOT funciona solamente como puente de sincronización. No reemplaza el flujo manual.

## 2. Estructura existente revisada

El proyecto usa **MySQL** mediante `mysql2/promise`.

### Tabla `vales` antes de esta integración

Campos operativos existentes:

- `id`
- `folio`
- `origen`: `Manual`, `Siclik` o `Excel`
- `numero_pedido`
- `cliente`
- `fecha_entrega`
- `prioridad`
- `observaciones`
- `estado`: `Pendiente`, `Rebanando`, `Listo`, `Entregado` o `Cancelado`
- `created_by`, `updated_by`, `created_at`, `updated_at`

### Tabla `vale_productos` antes de esta integración

- `id`
- `vale_id`
- `sku`
- `producto`
- `cantidad`
- `presentacion`
- `tipo_rebanado`
- `observaciones`
- `orden`
- `created_at`, `updated_at`

La integración reutiliza `sku`, `producto`, `cantidad`, `presentacion`, `tipo_rebanado` y `observaciones`; no crea columnas duplicadas.

## 3. Campos agregados

### En `vales`

- `sap_docentry`
- `sap_docnum`
- `external_key`
- `cliente_codigo`
- `fecha_pedido`
- `entrega_dias_texto`
- `entrega_fecha_inicio`
- `entrega_fecha_fin`
- `entrega_horario`
- `entrega_nombre`
- `entrega_epp`
- `comentario_entrega`
- `numero_traslado`
- `siclik_usuario_nombre`
- `siclik_usuario_correo`
- `last_synced_at`

`external_key` tiene índice único. Los vales manuales usan `NULL`, y MySQL permite múltiples valores `NULL` en un índice único.

### En `vale_productos`

- `sap_line_num`
- `external_line_key`
- `almacen`
- `last_synced_at`

`external_line_key` tiene índice único. Las líneas manuales conservan `NULL` y no son administradas por CORONELBOT.

También se amplía:

- `presentacion` a `VARCHAR(100)`.
- `tipo_rebanado` a `VARCHAR(80)` para conservar valores como `Corte fino` sin reducirlos forzosamente a un ENUM.

### Tabla nueva `rebanado_sync_runs`

Registra cada ejecución con:

- Fuente y `sync_run_id`.
- Inicio, fin y estado.
- Órdenes recibidas, creadas, actualizadas y omitidas.
- Productos creados, actualizados y omitidos.
- Último error.
- Detalle resumido por orden en `details_json`.

No guarda el JSON completo de SAP en cada vale.

## 4. Migración de base de datos

Ejecutar primero un respaldo. Puede usarse el archivo combinado:

```sql
SOURCE database/migrations/2026-07-24_coronelbot_integration.sql;
```

O ejecutar por separado, en este orden:

```text
database/migrations/2026-07-24_coronelbot_01_campos_indices.sql
database/migrations/2026-07-24_coronelbot_02_sync_runs.sql
```

En MySQL Workbench puede abrirse y ejecutarse directamente el archivo:

```text
database/migrations/2026-07-24_coronelbot_integration.sql
```

Rollback disponible:

```text
database/migrations/2026-07-24_coronelbot_integration_rollback.sql
```

El rollback elimina metadatos y bitácora de integración, pero no elimina vales ni productos operativos ya creados.

## 5. Variables de entorno

Agregar al archivo `.env`:

```env
REBANADO_SYNC_TOKEN=un_token_largo_privado_y_seguro
REBANADO_SYNC_ALERT_HOURS=4
REBANADO_PRODUCT_INCLUDE_TERMS=Rebanada,Rebanado,Estándar,Grueso,Corte
REBANADO_PRODUCT_EXCLUDE_TERMS=Barra
REBANADO_SYNC_BODY_LIMIT=2mb
```

### `REBANADO_SYNC_TOKEN`

Token compartido entre CORONELBOT y Rebanado Digital. Debe enviarse como:

```http
Authorization: Bearer TOKEN_PRIVADO
```

### Reglas configurables de productos

La decisión se concentra en:

```text
services/rebanadoRules.js
```

Por defecto una línea aplica cuando `presentacion` o `tipoRebanado` contiene alguno de:

- Rebanada
- Rebanado
- Estándar
- Grueso
- Corte

No aplica si contiene:

- Barra

La comparación ignora mayúsculas y acentos. Los términos pueden cambiarse en `.env` sin modificar la API.

## 6. Endpoint de sincronización

```http
POST /api/integraciones/sap/rebanado
```

Todos los endpoints de integración requieren Bearer token.

### Payload

```json
{
  "source": "SAP_SICLIK",
  "syncRunId": "2026-07-24T14:00:00",
  "orders": [
    {
      "sapDocEntry": 42088,
      "sapDocNum": 237220,
      "cardCode": "CAK318",
      "cardName": "COMEDORES INDUSTRIALES ZITRON",
      "docDate": "2026-07-24",
      "comments": "",
      "entrega": {
        "diasTexto": "28/07/2026 - 07/08/2026",
        "horario": "8:00 - 12:00",
        "nombre": "José Rivera",
        "epp": "Chaleco reflejante",
        "comentario": "Entrega en entrada",
        "numeroTraslado": "126766"
      },
      "siclik": {
        "usuarioNombre": "Rodrigo Velasco",
        "usuarioCorreo": "rvelasco@tesselar.mx"
      },
      "productos": [
        {
          "sapLineNum": 2,
          "sku": "1101001",
          "producto": "Jamon de Pavo y Cerdo Americano AROOS",
          "cantidad": 1.42,
          "almacen": "1",
          "presentacion": "Rebanada Estándar",
          "tipoRebanado": "Estándar",
          "observaciones": ""
        }
      ]
    }
  ]
}
```

### Campos obligatorios por orden nueva o pendiente

- `sapDocEntry`: entero positivo.
- `cardName`: cliente.
- `entrega.diasTexto`: al menos una fecha válida `DD/MM/AAAA`.
- Al menos un producto que pase el filtro de rebanado.

### Campos obligatorios por producto aplicable

- `sapLineNum`
- `sku`
- `producto`
- `cantidad` mayor a cero
- `presentacion`
- `tipoRebanado`

## 7. Interpretación de `ENTREGA_DIAS`

Se soportan:

```text
29/07/2026
28/07/2026 - 07/08/2026
28/07/2026-
07/08/2026
```

Se guarda:

- Texto original en `entrega_dias_texto`.
- Primera fecha en `entrega_fecha_inicio`.
- Segunda fecha en `entrega_fecha_fin`.
- Cuando solo existe una fecha, inicio y fin son iguales.

Para conservar el tablero actual, `fecha_entrega` se establece en `entrega_fecha_inicio`. Esto crea un solo vale, no uno por cada día. Si continúa activo después de esa fecha, el tablero actual lo muestra como atrasado hasta concluirlo.

## 8. Reglas de duplicados

Por orden:

```text
external_key = SAP_ORDR_<DocEntry>
```

Por línea:

```text
external_line_key = SAP_ORDR_<DocEntry>_LINE_<LineNum>
```

### Si el vale no existe

- Crea un vale en `Pendiente`.
- Crea únicamente las líneas aplicables a rebanado.
- Usa `origen = Siclik`.
- No crea un vale por cada fecha del rango.

### Si existe y está `Pendiente`

- Actualiza datos seguros de cabecera.
- Conserva `observaciones` generales si un usuario las modificó manualmente; los comentarios SAP solo se usan al crear el vale.
- Actualiza las líneas SAP que tengan la misma `external_line_key`.
- Agrega líneas SAP nuevas.
- No elimina automáticamente una línea que no venga en el payload.
- No modifica productos manuales con `external_line_key = NULL`.

### Si existe y está `Rebanando`, `Listo`, `Entregado` o `Cancelado`

- No crea otro vale.
- No modifica cantidades.
- No modifica productos.
- Solo actualiza `last_synced_at` y registra la orden como omitida en la corrida.

Por lo tanto, un vale entregado no vuelve a aparecer ni se recrea aunque el rango de Siclik siga vigente.

## 9. Respuestas

### Éxito

```json
{
  "ok": true,
  "status": "success",
  "syncRunId": "2026-07-24T14:00:00",
  "received": 1,
  "created": 1,
  "updated": 0,
  "skipped": 0,
  "productsCreated": 1,
  "productsUpdated": 0,
  "productsSkipped": 0,
  "errors": []
}
```

### Error parcial

Las órdenes se procesan en transacciones independientes. Una orden inválida no revierte las órdenes correctas de la misma corrida.

```json
{
  "ok": false,
  "status": "partial_error",
  "syncRunId": "2026-07-24T14:00:00",
  "received": 2,
  "created": 1,
  "updated": 0,
  "skipped": 0,
  "productsCreated": 1,
  "productsUpdated": 0,
  "productsSkipped": 0,
  "errors": [
    {
      "sapDocEntry": 42088,
      "message": "Falta cliente o productos válidos aplicables a rebanado."
    }
  ]
}
```

## 10. Estado de sincronización

```http
GET /api/integraciones/sap/rebanado/status
Authorization: Bearer TOKEN_PRIVADO
```

Ejemplo:

```json
{
  "ok": true,
  "lastSuccessAt": "2026-07-24T20:00:00.000Z",
  "lastRunAt": "2026-07-24T22:00:00.000Z",
  "lastStatus": "success",
  "minutesSinceLastSuccess": 42,
  "alertHours": 4,
  "stale": false,
  "lastError": null,
  "lastSummary": {
    "created": 4,
    "updated": 2,
    "skipped": 1,
    "productsCreated": 8,
    "productsUpdated": 3,
    "productsSkipped": 2
  }
}
```

`stale` se vuelve `true` cuando no existe sincronización exitosa o cuando supera `REBANADO_SYNC_ALERT_HOURS`.

## 11. Historial de ejecuciones

```http
GET /api/integraciones/sap/rebanado/runs?limit=25
Authorization: Bearer TOKEN_PRIVADO
```

El límite permitido es de 1 a 100 registros.

## 12. Prueba con curl

### Windows PowerShell

```powershell
$headers = @{
  Authorization = "Bearer un_token_seguro"
  "Content-Type" = "application/json"
}

$body = Get-Content -Raw .\payload-coronelbot.json
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/integraciones/sap/rebanado" `
  -Headers $headers `
  -Body $body
```

### curl

```bash
curl -X POST "http://localhost:3001/api/integraciones/sap/rebanado" \
  -H "Authorization: Bearer un_token_seguro" \
  -H "Content-Type: application/json" \
  --data-binary @payload-coronelbot.json
```

Estado:

```bash
curl "http://localhost:3001/api/integraciones/sap/rebanado/status" \
  -H "Authorization: Bearer un_token_seguro"
```

## 13. Prueba con Postman

1. Método `POST`.
2. URL `http://localhost:3001/api/integraciones/sap/rebanado`.
3. En Authorization seleccione `Bearer Token`.
4. Pegue el valor de `REBANADO_SYNC_TOKEN`.
5. En Body seleccione `raw` y `JSON`.
6. Pegue el payload de ejemplo.
7. Envíe dos veces el mismo `sapDocEntry`.

Resultado esperado:

- Primera llamada: `created = 1`.
- Segunda llamada mientras está pendiente: `updated = 1`.
- Después de marcar el vale como entregado: `skipped = 1`.
- Nunca debe aparecer un segundo vale con el mismo `external_key`.

## 14. Indicador en la interfaz

El dashboard y el tablero muestran un indicador discreto a usuarios con rol:

- `administrador`
- `cedis`

Muestra:

- Estado OK o ALERTA.
- Última sincronización exitosa.
- Vales creados, actualizados y omitidos.
- Último error.
- Alerta por falta de sincronización.

## 15. Archivos principales agregados

```text
controllers/integrationController.js
routes/integrationRoutes.js
middleware/syncToken.js
services/rebanadoSyncService.js
services/rebanadoRules.js
services/deliveryDateService.js
database/migrations/2026-07-24_coronelbot_01_campos_indices.sql
database/migrations/2026-07-24_coronelbot_02_sync_runs.sql
database/migrations/2026-07-24_coronelbot_integration.sql
database/migrations/2026-07-24_coronelbot_integration_rollback.sql
docs/payload-coronelbot-ejemplo.json
README_INTEGRACION_CORONELBOT.md
```

## 16. Heartbeat de CORONELBOT

La versión v17.1 agrega un endpoint para registrar que CORONELBOT sí terminó su consulta, incluso cuando no encontró órdenes aplicables:

```http
POST /api/integraciones/sap/rebanado/heartbeat
Authorization: Bearer TOKEN_PRIVADO
Content-Type: application/json
```

Payload:

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

Respuesta:

```json
{
  "ok": true,
  "status": "success",
  "heartbeat": true,
  "source": "CORONELBOT_HEARTBEAT"
}
```

El endpoint `GET /status` ahora incluye:

```text
lastContactAt
lastHeartbeatAt
minutesSinceLastContact
```

La propiedad `stale` se calcula con el último contacto válido, no únicamente con la última orden creada. Esto evita alertas falsas cuando CORONELBOT consultó SAP pero no encontró líneas de rebanado.

Para una automatización cada cuatro horas se recomienda:

```env
REBANADO_SYNC_ALERT_HOURS=6
```


Margen recomendado para retrasos normales del programador:

```env
REBANADO_SYNC_ALERT_GRACE_MINUTES=30
```

## Cambios v17.2: rango operativo de entrega

Rebanado Digital usa `entrega.diasTexto` como fuente de la fecha operativa Siclik.

- Una fecha simple se guarda con inicio y fin iguales.
- Un rango aparece en cada día comprendido entre inicio y fin.
- El texto completo se muestra en la tarjeta y pantalla de almacén.
- El atraso se calcula después del final del rango.
- `DocDueDate` no debe ser enviado como `entrega.diasTexto`.

La tolerancia de la alerta se administra desde **Permisos y configuración** por el perfil administrador.
