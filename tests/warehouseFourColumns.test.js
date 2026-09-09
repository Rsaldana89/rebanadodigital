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
  assert(html.includes("window.localStorage.setItem(THEME_KEY, nextTheme)"));
  assert(html.includes('Vista 1 · 4 columnas'));
  assert(html.includes('Vista 2 · Secciones'));

  console.log('Pruebas de Pantalla almacén principal en cuatro columnas y tema persistente: OK');
});
