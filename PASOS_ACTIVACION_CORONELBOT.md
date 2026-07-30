# Pasos para activar la sincronización

1. En Rebanado Digital, aplique la migración `database/migrations/2026-07-24_coronelbot_integration.sql` si aún no fue ejecutada.
2. En el `.env` de Rebanado Digital configure:

```env
PORT=3001
REBANADO_SYNC_TOKEN=UN_TOKEN_LARGO_Y_PRIVADO
REBANADO_SYNC_ALERT_HOURS=6
REBANADO_SYNC_ALERT_GRACE_MINUTES=30
```

3. Inicie Rebanado Digital y confirme `http://localhost:3001/health`.
4. Inicie CORONELBOT en el puerto 3000.
5. Abra `CORONELBOT → Sincronización Rebanado Digital`.
6. Configure:
   - URL: `http://localhost:3001` si ambas apps corren en el mismo equipo.
   - Token: el mismo valor de `REBANADO_SYNC_TOKEN`.
   - Frecuencia: 4 horas.
7. Guarde sin activar y use **Ejecutar ahora** para la primera prueba.
8. Confirme que el resultado indique `Heartbeat registrado: sí`.
9. Revise en Rebanado Digital que aparezca `Último contacto` actualizado.
10. Active la automatización y guarde.

La tarea no envía correos. Si solo existen líneas `Barra`, no crea vales, pero sí registra el heartbeat.
