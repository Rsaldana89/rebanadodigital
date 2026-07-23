# CHC Rebanado Digital

Aplicación web Node.js, Express, EJS y MySQL para crear, visualizar y dar seguimiento a comandas de rebanado desde computadoras, tablets y pantallas de almacén.

## Versión 1.7.0: un vale por pedido

A partir de esta versión:

- Un vale representa un pedido o cliente.
- Un vale puede contener uno o varios productos.
- El estado se controla para toda la comanda: Pendiente, Rebanando, Listo, Entregado o Cancelado.
- Cada producto conserva SKU, cantidad, presentación, tipo de rebanado e indicaciones particulares.
- CEDIS, Almacén y Administrador pueden corregir los datos y productos mediante el permiso `vales.edit`.
- Rebanado consulta y procesa la comanda completa sin editar su contenido.

La estructura principal es:

```text
vales
  └── vale_productos (uno o varios)
```

## Actualización desde una versión anterior

Antes de iniciar la versión 1.7.0 sobre una base existente, genera un respaldo y ejecuta:

```text
database/migrations/2026-07-23_multi_producto_por_vale.sql
```

La migración:

1. Agrega `numero_pedido` a `vales`.
2. Crea `vale_productos`.
3. Convierte el producto anterior de cada vale en su primer renglón de producto.
4. Retira de `vales` las columnas antiguas de producto.
5. Conserva folios, clientes, estados, fechas, historial y usuarios.

No ejecutes `database/schema.sql` sobre una base con información para actualizarla; `schema.sql` es para instalaciones nuevas.

## Requisitos

- Node.js 22.x
- npm 11.6.2
- MySQL 8

## Instalación local nueva

1. Copia `.env.example` como `.env` y configura la conexión.
2. Ejecuta `database/schema.sql`.
3. Opcionalmente ejecuta `database/seed.sql`.
4. Instala e inicia:

```bash
npm ci
npm run dev
```

Para ejecución normal:

```bash
npm start
```

## Usuarios de prueba del seed

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | admin | admin123 |
| CEDIS | cedis | cedis123 |
| Rebanado | rebanado | rebanado123 |
| Almacén | almacen | almacen123 |

Las contraseñas se mantienen en texto plano porque esta versión piloto fue solicitada así. Deben cambiarse antes de una operación formal.

## Variables de entorno

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_clave
DB_NAME=chc_rebanado
SESSION_SECRET=una_clave_larga
PORT=3000
NODE_ENV=development
```

En Railway, `PORT` es proporcionado automáticamente. La aplicación conserva el arranque tolerante: el servidor permanece activo y reintenta conectar con MySQL si la base no está disponible temporalmente.

## Flujo operativo

```text
CEDIS / Almacén crea una comanda con todos los productos
                         ↓
Rebanado inicia el vale completo
                         ↓
Rebanado marca toda la comanda como Lista
                         ↓
CEDIS / Almacén confirma la entrega
```

CEDIS y Almacén pueden regresar estados y corregir productos cuando sus permisos lo permitan. Rebanado puede trabajar con Rebanando, Listo y Cancelado según la matriz configurada.

## Archivos principales

```text
controllers/valeController.js
views/vales/formulario.ejs
views/vales/tablero.ejs
views/vales/detalle.ejs
views/pantalla.ejs
database/schema.sql
database/seed.sql
database/migrations/2026-07-23_multi_producto_por_vale.sql
```

## Railway

El proyecto fija:

```text
Node 22.x
npm 11.6.2
npm ci
```

Después de subir el código, aplica primero la migración en MySQL y luego redespliega la aplicación. El endpoint `/health` informa si la base está conectada.
