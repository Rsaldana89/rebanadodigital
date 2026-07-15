# Arranque tolerante a MySQL en Railway

Esta versión inicia el servidor web aunque MySQL todavía no esté configurado o disponible.

## Comportamiento

- Railway mantiene el servicio activo porque `app.listen()` se ejecuta inmediatamente.
- El módulo de permisos intenta conectarse en segundo plano.
- Si MySQL falla, la aplicación no ejecuta `process.exit(1)`.
- Los reintentos se realizan a los 10, 20, 40 y posteriormente cada 60 segundos.
- Cuando la base vuelve a estar disponible, las tablas de permisos se inicializan automáticamente.
- `GET /health` devuelve HTTP 200 y muestra si la base está conectada o temporalmente no disponible.

## Importante

La aplicación puede permanecer desplegada sin MySQL, pero las funciones que consultan datos no funcionarán hasta definir correctamente:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

En Railway, el estado `degraded` de `/health` significa que el servidor está activo, pero la base aún no está disponible.
