# CHC Rebanado Digital v17.2 — Rangos Siclik y configuración

## Cambios principales

- El tablero, la pantalla de almacén, el dashboard y los reportes interpretan la entrega mediante:
  - `entrega_fecha_inicio`
  - `entrega_fecha_fin`
  - `entrega_dias_texto`
- Un vale con rango `28/07/2026 - 07/08/2026` aparece al consultar cualquiera de esos días.
- La tarjeta muestra el texto completo enviado por Siclik, no `DocDueDate`.
- El atraso comienza después de `entrega_fecha_fin`, no después del primer día del rango.
- Los vales manuales continúan usando `fecha_entrega` como una sola fecha.
- El menú **Permisos** ahora se llama **Permisos y configuración**.
- El administrador puede configurar las horas de tolerancia y el margen adicional de la alerta CORONELBOT.

## Migración nueva

Ejecutar después de las migraciones de v17 y CORONELBOT:

```text
database/migrations/2026-07-29_rangos_entrega_y_configuracion.sql
```

La migración crea `app_settings` y agrega un índice para búsquedas por rango. No elimina ni modifica vales existentes.

## Configuración de alerta

Ruta:

```text
Permisos y configuración > Alertas de sincronización CORONELBOT
```

Solo el perfil `administrador` puede guardar cambios.

Valores iniciales:

```text
Tolerancia: 6 horas
Margen adicional: 30 minutos
```

Para una sincronización cada 4 horas, estos valores evitan alertas por retrasos pequeños del programador.
