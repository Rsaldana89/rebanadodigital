const assert = require('assert');
const fs = require('fs');

const board = fs.readFileSync('views/vales/tablero.ejs', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');
const css = fs.readFileSync('public/css/institutional.css', 'utf8');

assert(board.includes('data-filter-origin="Siclik"'));
assert(board.includes('data-filter-origin="Manual"'));
assert(board.includes('origenCounts.Siclik'));
assert(board.includes('origenCounts.Manual'));
assert(board.includes('data-origin="<%= origenFiltro %>"'));
assert(board.includes('id="opsDateOrigin"'));

assert(appJs.includes("const originFilterButtons = document.querySelectorAll('[data-filter-origin]')"));
assert(appJs.includes("const originOk = currentOrigin === 'Todos' || origin === currentOrigin"));
assert(appJs.includes("boardUrl.searchParams.set('origen', currentOrigin)"));
assert(appJs.includes("currentOrigin = focusCard.dataset.origin || 'Todos'"));
assert(appJs.includes('dateOriginInput.disabled = currentOrigin === \'Todos\''));

assert(css.includes('.operator-filter-pill.is-origin-siclik'));
assert(css.includes('.operator-filter-pill.is-origin-manual'));
assert(css.includes('.operator-filter-caption'));

console.log('Pruebas del filtro de origen Manual/Siclik en tablero: OK');
