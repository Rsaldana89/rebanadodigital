const fs = require('fs');
const assert = require('assert');
const css = fs.readFileSync('public/css/institutional.css', 'utf8');
const pantalla = fs.readFileSync('views/pantalla.ejs', 'utf8');
assert(!css.includes('\\n\\n/* =========================================================\\n   V19.0.17'), 'No debe quedar el bloque CSS escapado de v19.0.17');
assert(css.includes('V19.0.19 · Estado CORONELBOT integrado al encabezado'));
assert(css.includes('.warehouse-sync-state'));
assert(css.includes('.warehouse-sync-icon .bi-robot')); 
assert(css.includes('html[data-warehouse-theme="light"] body.tv-warehouse2-body .warehouse-sync-badge'));
for (const view of [pantalla]) {
  assert(view.includes('warehouse-sync-icon'));
  assert(view.includes('bi bi-robot'));
  assert(view.includes('warehouse-sync-copy'));
  assert(view.includes('warehouse-sync-state'));
}
console.log('warehouseSyncBadgeStyle.test.js OK');
