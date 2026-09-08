const assert = require('assert');
const path = require('path');
const ejs = require('ejs');

const view = path.join(__dirname, '..', 'views', 'pantalla.ejs');

function vale(folio, estado, lugarEntrega) {
  return {
    id: folio,
    folio,
    numero_pedido: `PED-${folio}`,
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
  Entregado: [],
  Cancelado: []
};

ejs.renderFile(view, {
  estados,
  overdueCount: 0,
  filtroFechaDisplay: '08/09/2026',
  horaActual: '13:45'
}, { filename: view }, (error, html) => {
  if (error) throw error;

  assert(html.includes('Listos y rebanando'));
  assert(html.includes('data-scroll-key="important"'));
  assert(html.includes('data-scroll-key="activity"'));
  assert(html.includes('VM-0001'));
  assert(html.includes('CLIENTE LISTO'));
  assert(html.includes('Centro, Querétaro'));
  assert(html.includes('VM-0002'));
  assert(html.includes('CLIENTE REBANANDO'));
  assert(html.includes('Lugar por confirmar'));
  assert(html.includes("document.querySelectorAll('[data-auto-scroll]')"));
  assert(html.includes('window.sessionStorage'));

  console.log('Pruebas de seguimiento rápido en Pantalla almacén: OK');
});
