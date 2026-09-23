# ACTUALIZACION V19.0.26 · Respaldo de base de datos

## Objetivo
Agregar un respaldo manual completo de MySQL disponible únicamente para el rol **administrador**.

## Interfaz
- Se agregó una tarjeta **Respaldo de base de datos** dentro de **Permisos y configuración**.
- La tarjeta y el botón sólo se renderizan cuando el usuario tiene el rol `administrador`.
- Antes de descargar se solicita confirmación.

## Seguridad
- La ruta `/admin/respaldo-base-datos` exige sesión iniciada y valida nuevamente el rol `administrador` en backend.
- No basta con ocultar el botón: CEDIS, Almacén y Rebanado no pueden descargar el respaldo aunque conozcan la URL.
- La respuesta se marca como `no-store` para evitar cachear el SQL.

## Contenido del respaldo
- Estructura de tablas.
- Datos de todas las tablas.
- Vistas, si existen.
- Triggers, si existen y el usuario MySQL tiene permiso para consultarlos.
- Desactiva temporalmente validaciones de llaves foráneas durante una restauración.

## Archivo
Nombre de ejemplo: `respaldo_rebanado_2026-09-23_12-55-00.sql`.
