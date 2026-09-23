const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const view = path.join(root, 'views', 'pantalla.ejs');

function vale(folio, estado, siclik = false) {
  return {
    id: folio,
    folio,
    numero_pedido: `PED-${folio}`,
    sap_docnum: siclik ? 238001 : null,
    external_key: siclik ? `sap-order-${folio}` : null,
    origen: siclik ? 'Siclik' : 'Manual',
    cliente: `SUCURSAL ${estado.toUpperCase()}`,
    lugar_entrega: 'Centro, Querétaro',
    prioridad: estado === 'Pendiente' ? 'Alta' : 'Normal',
    estado,
    updated_at: new Date(),
    entrega_display: '09/09/2026',
    days_late: estado === 'Pendiente' ? 1 : 0,
    is_overdue: estado === 'Pendiente',
    productos: [
      { cantidad: 2, producto: 'Jamón Americano CORONEL', tipo_rebanado: 'Estándar', presentacion: 'Pieza' },
      { cantidad: 1, producto: 'Queso Manchego CORONEL', tipo_rebanado: 'Delgado', presentacion: 'Pieza' }
    ]
  };
}

const estados = {
  Entregado: [vale('VM-2609-0001', 'Entregado', true)],
  Listo: [vale('VM-2609-0002', 'Listo')],
  Rebanando: [vale('VM-2609-0003', 'Rebanando')],
  Pendiente: [vale('VM-2609-0004', 'Pendiente')],
  Cancelado: [vale('VM-2609-0005', 'Cancelado')]
};

ejs.renderFile(view, {
  estados,
  overdueCount: 1,
  filtroFechaDisplay: '09/09/2026',
  horaActual: '11:00'
}, { filename: view }, (error, html) => {
  if (error) throw error;

  const delivered = html.indexOf('warehouse2-column is-delivered');
  const ready = html.indexOf('warehouse2-column is-ready');
  const working = html.indexOf('warehouse2-column is-working');
  const pending = html.indexOf('warehouse2-column is-pending');

  assert(delivered >= 0 && ready > delivered && working > ready && pending > working);
  assert.strictEqual((html.match(/data-auto-scroll-one-way/g) || []).length, 5); // 4 atributos + selector JS
  assert.strictEqual((html.match(/<section class="warehouse2-column is-/g) || []).length, 4);
  assert(html.includes('Entregados'));
  assert(html.includes('Listos'));
  assert(html.includes('Rebanando'));
  assert(html.includes('Pendientes'));
  assert(!html.includes('warehouse2-column is-cancelled'));
  assert(html.includes('Pedido / orden de venta'));
  assert(html.includes('238001'));
  assert(html.includes('Jamón Americano CORONEL'));
  assert(html.includes('warehouse2-delivered-card'));
  assert(!html.substring(delivered, ready).includes('warehouse2-products'));
  assert(!html.substring(delivered, ready).includes('Lugar de entrega'));
  assert(html.substring(delivered, ready).includes('Entregado'));
  assert(html.includes('Centro, Querétaro'));
  assert(html.includes('1 día tarde'));
  assert(html.includes("scroller.scrollTop += 1"));
  assert(html.includes("scroller.scrollTop = 0"));
  assert(!html.includes('direction = -1'));
  assert(html.includes('window.location.reload(), 30000'));

  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert(app.includes("app.get('/pantalla', pantallaController)"));
  assert(html.includes('data-warehouse-theme-toggle'));
  assert(html.includes("chc-pantalla-informativa-theme"));
  assert(html.includes("window.localStorage.setItem(THEME_KEY, 'light')"));
  assert(html.includes('window.localStorage.removeItem(THEME_KEY)'));
  assert(html.includes('data-warehouse-theme="dark"'));
  assert(html.includes('warehouse-theme-light'));
  assert(html.includes('/css/institutional.css?v=19.0.23'));
  assert(html.includes('Pantalla informativa de almacén'));
  assert(html.includes('/icons/hermanos-coronel-logo.jpg?v=19.0.23'));
  assert(html.includes('alt="Cremería Hermanos Coronel"'));
  assert(!html.includes('Vista 2 · Secciones'));
  assert(!html.includes('warehouse-view-switch'));
  assert(html.includes('width=1920, initial-scale=1.0'));

  const css = fs.readFileSync(path.join(root, 'public', 'css', 'institutional.css'), 'utf8');
  assert(css.includes('V19.0.22 · Pantalla única TV/4K'));
  assert(css.includes('grid-template-columns: minmax(0, 0.62fr) minmax(0, 1.12fr) minmax(0, 1.12fr) minmax(0, 1.14fr)'));
  assert(css.includes('font-size: clamp(0.88rem, 0.94vw, 1.06rem)'));
  assert(css.includes('font-size: clamp(0.69rem, 0.72vw, 0.82rem)'));
  assert(css.includes('V19.0.23 · Logo oficial CHC + tipografía TV ampliada'));
  assert(css.includes('font-size: clamp(0.95rem, 1.00vw, 1.12rem)'));
  assert(css.includes('font-size: clamp(0.76rem, 0.79vw, 0.88rem)'));
  assert(css.includes('.warehouse-corporate-logo'));
  assert(app.includes("app.get('/pantalla2', (req, res) => res.redirect('/pantalla'))"));

  console.log('Pruebas de Pantalla almacén principal en cuatro columnas y tema persistente: OK');
});
