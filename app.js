const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { loadPermissions } = require('./middleware/permissions');
const permissionService = require('./services/permissionService');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configuración de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'chc_secret',
    resave: false,
    saveUninitialized: false,
  })
);
// Middleware para exponer mensajes y usuario en todas las vistas
app.use((req, res, next) => {
  res.locals.success_msg = req.session.success_msg || null;
  res.locals.error_msg = req.session.error_msg || null;
  res.locals.user = req.session.user || null;
  // limpiar mensajes después de mostrarlos
  req.session.success_msg = null;
  req.session.error_msg = null;
  next();
});

// Carga permisos efectivos por rol y excepciones del usuario.
app.use(loadPermissions);

// Ruta inicial: redirige al login o al dashboard
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

// Rutas
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const valeRoutes = require('./routes/valeRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/vales', valeRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/reportes', reportRoutes);
app.use('/usuarios', userRoutes);
app.use('/permisos', permissionRoutes);

// Ruta para pantalla informativa accesible sin login
const { pantallaController } = require('./controllers/valeController');
app.get('/pantalla', pantallaController);

// Página 404 simple
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

const port = process.env.PORT || 3000;

permissionService.initializePermissions()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor ejecutándose en el puerto ${port}`);
      console.log('Módulo de permisos inicializado correctamente');
    });
  })
  .catch(err => {
    console.error('No fue posible inicializar el módulo de permisos:', err);
    process.exit(1);
  });