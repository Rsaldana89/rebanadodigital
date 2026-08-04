const assert = require('assert');
const valeController = require('../controllers/valeController');

const { normalizeProducts } = valeController._test;

// Reproduce el objeto req.body producido por express.urlencoded({ extended: false })
// cuando el formulario HTML utiliza nombres terminados en [].
const oneProduct = normalizeProducts({
  'sku[]': '1104003',
  'producto[]': 'Jamón Americano',
  'cantidad[]': '5',
  'presentacion[]': '250g',
  'tipo_rebanado[]': 'Estándar',
  'producto_observaciones[]': '',
  'external_line_key[]': '',
  'sap_line_num[]': '',
  'almacen[]': ''
});

assert.strictEqual(oneProduct.length, 1);
assert.deepStrictEqual(
  {
    sku: oneProduct[0].sku,
    producto: oneProduct[0].producto,
    cantidad: oneProduct[0].cantidad,
    presentacion: oneProduct[0].presentacion,
    tipo_rebanado: oneProduct[0].tipo_rebanado
  },
  {
    sku: '1104003',
    producto: 'Jamón Americano',
    cantidad: 5,
    presentacion: '250g',
    tipo_rebanado: 'Estándar'
  }
);

const twoProducts = normalizeProducts({
  'sku[]': ['1104003', '1104010'],
  'producto[]': ['Jamón Americano', 'Jamón de Pavo'],
  'cantidad[]': ['5', '3.5'],
  'presentacion[]': ['250g', '500g'],
  'tipo_rebanado[]': ['Estándar', 'Grueso'],
  'producto_observaciones[]': ['', 'Empacar separado'],
  'external_line_key[]': ['', ''],
  'sap_line_num[]': ['', ''],
  'almacen[]': ['', '']
});

assert.strictEqual(twoProducts.length, 2);
assert.strictEqual(twoProducts[1].cantidad, 3.5);
assert.strictEqual(twoProducts[1].observaciones, 'Empacar separado');
assert.strictEqual(twoProducts[1].orden, 2);

// Conserva compatibilidad con cargas que ya envían nombres sin corchetes.
const plainFields = normalizeProducts({
  sku: '1104003',
  producto: 'Jamón Americano',
  cantidad: '1',
  presentacion: '1kg',
  tipo_rebanado: 'Estándar'
});

assert.strictEqual(plainFields.length, 1);
assert.strictEqual(plainFields[0].cantidad, 1);

console.log('Pruebas de productos en vales manuales: OK');
