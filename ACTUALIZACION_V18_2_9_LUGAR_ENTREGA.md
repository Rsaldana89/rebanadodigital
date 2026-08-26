# Rebanado Digital V18.2.9 · Lugar de entrega

## Cambios principales

- La sincronización acepta `entrega.lugar` y `entrega.codigoLugar` desde CORONELBOT.
- Los payloads anteriores siguen siendo válidos; si no contienen esos campos, se guarda `NULL`.
- Una sincronización anterior nunca borra una ubicación que ya exista.
- Los vales avanzados solamente completan el lugar si todavía está vacío; no cambian estado ni productos.
- El lugar aparece en el tablero, detalle, reportes y pantalla informativa de almacén.
- Los vales manuales pueden capturar un lugar opcional.
- La pantalla de almacén muestra Listos, Rebanando y Pendientes en la zona principal, y Entregados/Cancelados en una columna con desplazamiento automático.

## Base de datos

La migración incluida es:

`database/migrations/2026-08-26_lugar_entrega.sql`

Las dos columnas son opcionales:

- `lugar_entrega VARCHAR(255) NULL`
- `codigo_lugar_entrega VARCHAR(100) NULL`

## Contrato de sincronización

```json
{
  "entrega": {
    "lugar": "Alfonso Obregon 2 Guanatos GDL, 44332, JAL MX",
    "codigoLugar": "03B2D87A-F9C0-4DC6-ABB9-C50CF33F7D42"
  }
}
```

Ambos campos son opcionales para mantener compatibilidad con versiones anteriores de CORONELBOT.
