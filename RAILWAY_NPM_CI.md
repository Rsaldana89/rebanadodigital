# Railway: instalación reproducible con npm ci

Este proyecto está preparado para que Railpack use:

- Node.js 22.x (`engines.node` y `.nvmrc`)
- npm 11.6.2 (`packageManager`)
- `npm ci` mediante el `package-lock.json`
- Registro público de npm (`.npmrc`)
- Dependencias de producción únicamente (`omit=dev`)

## Railway

No agregues una variable `RAILPACK_INSTALL_CMD` que cambie la instalación a `npm install`.
Railpack detectará `package-lock.json` y utilizará `npm ci`.

Si anteriormente agregaste estas variables, elimínalas antes de redesplegar:

- `RAILPACK_INSTALL_CMD`
- `NPM_CONFIG_PRODUCTION`
- `npm_config_production`

Conserva `NODE_ENV=production`.

Después de subir esta versión a GitHub, haz un redeploy sin caché una sola vez.
