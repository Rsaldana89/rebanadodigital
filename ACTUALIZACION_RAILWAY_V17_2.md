# Actualización de Rebanado Digital en Railway — v17.2

## 1. Respaldar

Antes de desplegar:

1. Generar un respaldo de la base MySQL de producción.
2. Conservar una copia del proyecto desplegado actualmente.
3. Confirmar que la tabla `rebanado_sync_runs` ya existe.

## 2. Ejecutar migraciones

La opción más sencilla y segura es ejecutar el script combinado:

```text
database/migrations/2026-07-29_actualizacion_completa_coronelbot_v17_2.sql
```

Ese archivo incluye la migración original de CORONELBOT y la configuración v17.2. Es tolerante a reejecuciones, por lo que sirve aunque algunos campos ya existan.

También se pueden ejecutar por separado, en este orden:

```text
database/migrations/2026-07-24_coronelbot_integration.sql
database/migrations/2026-07-29_rangos_entrega_y_configuracion.sql
```

Después puede ejecutarse, sólo como comprobación:

```text
database/migrations/2026-07-29_validacion_post_migracion.sql
```

## 3. Variables en Railway

En el servicio de Rebanado Digital, conservar las variables de base de datos y configurar:

```env
REBANADO_SYNC_TOKEN=EL_MISMO_TOKEN_DE_CORONELBOT
REBANADO_SYNC_ALERT_HOURS=6
REBANADO_SYNC_ALERT_GRACE_MINUTES=30
REBANADO_SYNC_BODY_LIMIT=2mb
```

Railway asigna `PORT` automáticamente. No es necesario fijar `PORT=3001` en Railway. El puerto 3001 es únicamente el valor local por defecto.

Después de aplicar la migración, las horas y el margen se pueden modificar desde **Permisos y configuración**. Las variables de entorno quedan como respaldo si la tabla de configuración no está disponible.

## 4. Desplegar código

Reemplazar el código del servicio por esta versión, conservar el `.env` fuera del repositorio y desplegar mediante el flujo habitual de GitHub/Railway.

Comando de inicio:

```text
npm start
```

Comprobar:

```text
GET /health
```

Debe responder `status: ok` cuando MySQL esté disponible.

## 5. Conectar CORONELBOT local con Railway

En CORONELBOT no utilizar `localhost:3001`, porque Rebanado Digital está en Internet y CORONELBOT está en la red local.

Configurar en la automatización:

```text
URL de Rebanado Digital:
https://TU-SERVICIO.up.railway.app
```

Token:

```text
El mismo valor de REBANADO_SYNC_TOKEN configurado en Railway.
```

El flujo es saliente desde CORONELBOT hacia Railway, por lo que no se necesita abrir un puerto de entrada en la red local.

## 6. Prueba controlada

1. En CORONELBOT abrir **Automatizaciones**.
2. Seleccionar **Sincronización Rebanado Digital**.
3. Configurar la URL pública de Railway y el token.
4. Mantener frecuencia de 4 horas.
5. Guardar y usar **Ejecutar ahora**.
6. Revisar en Rebanado Digital el indicador `CORONELBOT: OK`.
7. Consultar un día dentro de un rango Siclik y confirmar que el vale aparece con el rango completo visible.
8. Revisar **Permisos y configuración** como administrador.

## 7. Recuperación

El rollback de esta versión está en:

```text
database/migrations/2026-07-29_rangos_entrega_y_configuracion_rollback.sql
```

El rollback elimina solamente `app_settings` y el índice nuevo. No elimina vales, productos ni la integración CORONELBOT.
