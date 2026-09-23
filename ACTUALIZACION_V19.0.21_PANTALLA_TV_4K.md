# CHC Rebanado Digital v19.0.21 · Pantalla TV/4K

- Se conserva una sola pantalla informativa de almacén: `/pantalla`.
- La URL anterior `/pantalla2` redirige a `/pantalla`.
- La pantalla usa un lienzo lógico de 1920 px para que Google TV/WebView mantenga el layout de escritorio en paneles 1080p y 4K.
- Las cuatro columnas conservan las proporciones de escritorio: Entregados más angosta; Listos, Rebanando y Pendientes con mayor espacio.
- Se anulan en orientación horizontal los breakpoints que convertían el tablero a 2 o 1 columnas.
- Se incrementó ligeramente la tipografía del cliente y del lugar de entrega para mejorar lectura a distancia.
- Se actualizaron versiones de caché/PWA a v19.0.21 para evitar que Fully Kiosk conserve CSS anterior.
