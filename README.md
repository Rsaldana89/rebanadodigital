# CHC Rebanado Digital

**CHC Rebanado Digital** es una aplicación web diseñada para apoyar al área de Rebanado y CEDIS en la creación, seguimiento y cierre de vales digitales de rebanado.  Se ha puesto un énfasis especial en el diseño visual para que la interfaz sea clara, atractiva y operativa desde computadoras de escritorio, tablets y pantallas de TV.

## Versión institucional v1.2.0

Esta revisión incorpora una interfaz visual inspirada en la identidad de Cremería Hermanos Coronel, con paleta vino, crema, dorado y carbón. El tablero mantiene controles táctiles, filtros por fecha y estado, vales atrasados visibles y una pantalla de almacén optimizada para monitor o TV.


## Tecnologías utilizadas

- Node.js con Express.js
- Motor de vistas EJS
- MySQL (utilizando el paquete `mysql2`)
- HTML5, CSS3 y JavaScript (vanilla)
- Bootstrap para algunos componentes de interfaz
- Sesiones con `express-session`
- Variables de entorno con `dotenv`

## Requisitos

- Node.js 18 o superior
- Servidor MySQL accesible (local o en la nube, compatible con Railway)

## Instalación local

1. **Clona o descarga** este repositorio. El proyecto se encuentra en el directorio `chc-rebanado-digital`.
2. Copia el archivo `.env.example` a `.env` y completa los datos de conexión a tu base de datos y la clave de sesión.
3. Instala las dependencias desde la raíz del proyecto:

   ```bash
   npm install
   ```

4. Crea una base de datos nueva con el nombre que definiste en tu `.env`.  Ejecuta el script `schema.sql` dentro de la carpeta `database/` para crear las tablas necesarias y `seed.sql` para cargar los datos iniciales.  Puedes hacerlo con tu cliente favorito o desde la línea de comandos:

   ```bash
   mysql -u usuario -p --host=host --port=puerto nombre_bd < database/schema.sql
   mysql -u usuario -p --host=host --port=puerto nombre_bd < database/seed.sql
   ```

5. Inicia la aplicación:

   ```bash
   npm start
   ```

6. Abre tu navegador en `http://localhost:3000` (o el puerto que hayas configurado). Deberías ver la pantalla de inicio de sesión.

## Uso de prueba

Se incluyen varios usuarios de ejemplo en el archivo `seed.sql` para facilitar las pruebas iniciales.  Todos ellos tienen contraseñas en texto plano (solo para esta versión piloto).  Los usuarios son:

| Rol         | Usuario   | Contraseña |
|-------------|-----------|------------|
| Administrador | admin     | admin123   |
| CEDIS       | cedis     | cedis123   |
| Rebanado    | rebanado  | rebanado123|
| Almacén     | almacen   | almacen123 |

## Despliegue en Railway

Esta aplicación está preparada para desplegarse en [Railway](https://railway.app).  Debes crear un proyecto en Railway, añadir un plugin de MySQL y configurar las variables de entorno del mismo modo que en tu entorno local. Las variables mínimas son:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- `PORT` (Railway asignará automáticamente un puerto; puedes usar la misma variable para que la aplicación lo detecte)
- `SESSION_SECRET`

Railway detectará el archivo `package.json` y ejecutará `npm start` por defecto. Asegúrate de que tu base de datos esté conectada y que hayas ejecutado los scripts `schema.sql` y `seed.sql` en la base de datos.

## Estructura del proyecto

```
chc-rebanado-digital/
├── app.js               # Archivo principal de la aplicación
├── package.json         # Definición de dependencias y scripts
├── .env.example         # Variables de entorno de ejemplo
├── config/              # Configuración de la base de datos
│   └── db.js
├── routes/              # Definición de rutas
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── valeRoutes.js
│   ├── inventarioRoutes.js
│   ├── reportRoutes.js
│   └── userRoutes.js
├── controllers/         # Lógica de negocio por ruta
│   ├── authController.js
│   ├── dashboardController.js
│   ├── valeController.js
│   ├── inventarioController.js
│   ├── reportController.js
│   └── userController.js
├── middleware/          # Middleware de autenticación y roles
│   ├── auth.js
│   └── roles.js
├── views/               # Plantillas EJS
│   ├── layout.ejs
│   ├── login.ejs
│   ├── dashboard.ejs
│   └── vales/           # Plantillas para vales
│       ├── tablero.ejs
│       ├── crear.ejs
│       └── detalle.ejs
│   ├── inventario/
│   │   └── registro.ejs
│   ├── reportes/
│   │   └── lista.ejs
│   └── usuarios/
│       ├── lista.ejs
│       ├── crear.ejs
│       └── editar.ejs
├── public/              # Archivos estáticos
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
└── database/
    ├── schema.sql       # Esquema de la base de datos
    └── seed.sql         # Datos de prueba
```

## Notas importantes

- **Seguridad**: esta primera versión se ha diseñado para pruebas internas y por ello **las contraseñas se almacenan en texto plano**. Para una versión productiva se recomienda implementar hashing (por ejemplo con bcrypt) y reforzar la seguridad de sesiones.
- **Estilo y diseño**: la interfaz se ha construido con un enfoque visual tipo tablero operativo.  Se han utilizado colores suaves y componentes grandes para facilitar la lectura en pantallas de TV y tablets.
- **Funcionalidad**: la aplicación incluye las operaciones básicas descritas en el documento de requisitos: creación y seguimiento de vales, cambio de estados, visualización de inventario de cierre de día, reportes simples y administración de usuarios.

¡Disfruta usando CHC Rebanado Digital!
## Administración de permisos (v11)

La aplicación incluye un panel en:

```text
/permisos
```

El módulo se inicializa automáticamente al arrancar la aplicación y crea, si no existen, las tablas:

- `permission_catalog`
- `role_permissions`
- `user_permissions`

La configuración recomendada incluida es:

- **Administrador:** todos los permisos, bloqueados para evitar perder el control del sistema.
- **CEDIS / Almacén:** administración operativa completa de vales, correcciones de estado, reportes e inventario.
- **Rebanado:** consultar vales, pasar a Rebanando, pasar a Listo, regresar de Listo a Rebanando y cancelar vales activos.

El panel permite:

1. Modificar permisos generales por rol.
2. Crear excepciones individuales por usuario usando `Heredar`, `Permitir` o `Bloquear`.
3. Mostrar acciones deshabilitadas cuando el usuario no tenga permiso.
4. Validar los permisos también en el servidor; no dependen únicamente de la interfaz.

El script manual equivalente está en:

```text
database/migrations/002_permissions.sql
```
