# Rebanado Digital 19.0.7

## Aplicaciones instalables

La misma implementación de Railway ofrece dos instalaciones distintas en Chrome:

1. **CHC Rebanado Digital**
   - Se instala desde el inicio de sesión o desde el botón `Instalar app` del menú.
   - Abre en `/login` y conserva el flujo normal de autenticación y permisos.
   - Usa el icono vino de Rebanado Digital.

2. **Pantalla Rebanado CHC**
   - Se instala directamente desde `/pantalla` con el botón `Instalar pantalla`.
   - Abre la pantalla informativa en modo independiente y orientación horizontal.
   - Usa un icono propio con forma de monitor.

## Consideraciones

- Railway ya proporciona HTTPS, requisito para la instalación PWA.
- Chrome muestra los botones sólo cuando la instalación está disponible y los oculta si la aplicación ya está instalada.
- El sistema principal no permite capturar cambios sin conexión; muestra un aviso y conserva la seguridad de la sesión.
- La pantalla informativa guarda su última vista correcta como respaldo temporal si pierde la red.
- Las dos instalaciones comparten la misma aplicación, base de datos y despliegue.

Esta actualización no requiere cambios de base de datos.
