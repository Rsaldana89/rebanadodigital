const db = require('../config/db');

exports.index = async (req, res) => {
  try {
    // Obtener conteo de vales por estado
    const [counts] = await db.query(
      `SELECT estado, COUNT(*) AS total
       FROM vales
       GROUP BY estado`
    );
    const summary = {
      Pendiente: 0,
      Rebanando: 0,
      Listo: 0,
      Entregado: 0,
      Cancelado: 0
    };
    counts.forEach(row => {
      summary[row.estado] = row.total;
    });
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    res.render('dashboard', { title: 'Dashboard', summary, total });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el dashboard';
    res.redirect('/');
  }
};