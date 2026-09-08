const assert = require('assert');
const path = require('path');
const ejs = require('ejs');

const view = path.join(__dirname, '..', 'views', 'pantalla.ejs');

function vale(folio, estado, lugarEntrega, siclik = false) {
  return {
    id: folio,
    folio,
    numero_pedido: `PED-${folio}`,
    sap_docnum: siclik ? 237224 : null,
    external_key: siclik ? `sap-order-${folio}` : null,
    origen: siclik ? 'Siclik' : 'Manual',
    cliente: `CLIENTE ${estado.toUpperCase()}`,
    lugar_entrega: lugarEntrega,
    prioridad: 'Normal',
    estado,
    updated_at: new Date(),
    entrega_display: '08/09/2026',
    days_late: 0,
    is_overdue: false,
    productos: [{ cantidad: 1.5, producto: 'Jamón Americano', presentacion: 'Estándar' }]
  };
}

const estados = {
  Listo: [vale('VM-0001', 'Listo', 'Centro, Querétaro')],
  Rebanando: [vale('VM-0002', 'Rebanando', null)],
  Pendiente: [],
  Entregado: [vale('VS-0003', 'Entregado', 'Juriquilla, Querétaro', true)],
  Cancelado: [vale('VM-0004', 'Cancelado', 'El Marqués, Querétaro')]
};

ejs.renderFile(view, {
  estados,
  overdueCount: 0,
  filtroFechaDisplay: '08/09/2026',
  horaActual: '13:45'
}, { filename: view }, (error, html) => {
  if (error) throw error;

  assert(html.includes('Estados siempre visibles'));
  assert(html.includes('data-scroll-key="delivered"'));
  assert(html.includes('data-scroll-key="ready"'));
  assert(html.includes('data-scroll-key="working"'));
  assert(html.includes('data-scroll-key="cancelled"'));
  assert.strictEqual((html.match(/data-auto-scroll data-scroll-key=/g) || []).length, 4);
  assert(html.indexOf('warehouse-side-panel is-delivered') < html.indexOf('warehouse-side-panel is-ready'));
  assert(html.indexOf('warehouse-side-panel is-ready') < html.indexOf('warehouse-side-panel is-working'));
  assert(html.indexOf('warehouse-side-panel is-working') < html.indexOf('warehouse-side-panel is-cancelled'));
  assert(html.includes('VM-0001'));
  assert(html.includes('CLIENTE LISTO'));
  assert(html.includes('Centro, Querétaro'));
  assert(html.includes('VM-0002'));
  assert(html.includes('CLIENTE REBANANDO'));
  assert(html.includes('Lugar por confirmar'));
  assert(html.includes('VS-0003'));
  assert(html.includes('CLIENTE ENTREGADO'));
  assert(html.includes('Pedido / orden de venta'));
  assert(html.includes('237224'));
  assert(html.includes('Vale VS-0003'));
  assert(html.includes('warehouse-compact-siclik-reference'));
  assert(html.includes('VM-0004'));
  assert(html.includes('CLIENTE CANCELADO'));
  assert(html.includes("document.querySelectorAll('[data-auto-scroll]')"));
  assert(html.includes('window.sessionStorage'));

  console.log('Pruebas de seguimiento rápido en Pantalla almacén: OK');
});
