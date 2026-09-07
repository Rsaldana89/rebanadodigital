# CHC Rebanado Digital 19.0.1

## Horarios de cambio de estado

- En el detalle del vale, cada estado muestra la fecha y hora más reciente en que la comanda entró a ese estado.
- Los estados que todavía no han sido recorridos muestran `Sin registrar`.
- Si la comanda regresa a un estado anterior, se muestra el cambio más reciente y el historial completo se conserva.
- El historial inferior ahora presenta sus fechas y horas en la zona `America/Mexico_City`.
- No requiere migración: la información proviene de `vale_history.created_at`, que ya existe.

Formato mostrado:

```text
07/09/2026 · 11:13
```
