const assert = require('assert');
const path = require('path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const baseLocals = {
  user: { id: 1, name: 'Administrador', role: 'administrador' },
  success_msg: null,
  error_msg: null
};

(async () => {
  const inventoryData = {
    ...baseLocals,
    products: [{
      sku: '1101001', descripcion: 'Jamón AROOS', cantidad_sin_rebanar: 3,
      cantidad_rebanado_queda: 1, total_real: 4, comprometido: 2, proyectado: 2
    }],
    movements: [], rebanadoHistory: [], wasteHistory: [],
    summary: { totalProducts: 1, unsliced: 3, sliced: 1, committed: 2, negative: 0 },
    today: '2026-09-08'
  };

  const adminInventory = await ejs.renderFile(
    path.join(root, 'views/inventario/index.ejs'),
    { ...inventoryData, can: code => ['inventario.adjust', 'inventario.view'].includes(code) },
    { filename: path.join(root, 'views/inventario/index.ejs') }
  );
  assert(adminInventory.includes('data-inventory-adjust'));
  assert(adminInventory.includes('Editar existencias'));
  assert(adminInventory.includes('Saldo exacto sin rebanar'));

  const readOnlyInventory = await ejs.renderFile(
    path.join(root, 'views/inventario/index.ejs'),
    { ...inventoryData, can: code => code === 'inventario.view' },
    { filename: path.join(root, 'views/inventario/index.ejs') }
  );
  assert(!readOnlyInventory.includes('data-inventory-adjust'));

  const detailView = path.join(root, 'views/vales/detalle.ejs');
  const detail = await ejs.renderFile(detailView, {
    ...baseLocals,
    can: code => code === 'vales.delete',
    vale: {
      id: 25, folio: 'VM-2609-0025', numero_pedido: 'PRB-25', cliente: 'Cliente',
      lugar_entrega: 'Querétaro', origen: 'Manual', fecha_entrega_fmt: '2026-09-08',
      prioridad: 'Normal', estado: 'Listo', total_productos: 0, productos: [], allowed_states: []
    },
    historial: [], state_changes: {}, return_url: '/vales/tablero?fecha=2026-09-08'
  }, { filename: detailView });
  assert(detail.includes('/vales/25/eliminar'));
  assert(detail.includes('Eliminar definitivamente el vale VM-2609-0025'));

  console.log('Pruebas de controles administrativos en las vistas: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
