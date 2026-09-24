const assert = require('assert');
const fs = require('fs');

const chime = fs.readFileSync('public/js/state-chime.js', 'utf8');
const pantalla = fs.readFileSync('views/pantalla.ejs', 'utf8');
const tablero = fs.readFileSync('views/vales/tablero.ejs', 'utf8');
const routes = fs.readFileSync('routes/valeRoutes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

assert(chime.includes('data-state-chime-scope') || chime.includes('stateChimeScope'));
assert(chime.includes('AudioContext'));
assert(chime.includes('pollStates'));
assert(chime.includes("kind: 'new-vale'"));
assert(chime.includes('Object.prototype.hasOwnProperty.call(previous.states'));

assert(chime.includes('V19.0.22: alerta de almacén más fuerte y evidente para TV'));
assert(chime.includes('createDynamicsCompressor'));
assert(chime.includes("isWarehouse ? 0.98 : 0.78"));
assert(pantalla.includes('data-state-chime-scope="warehouse"'));
assert(tablero.includes('data-state-chime-scope="operator"'));
assert(tablero.includes('data-state-chime-toggle'));
assert(routes.includes("'/estados/actuales'"));
assert(app.includes("'/pantalla/estados'"));
console.log('stateChimeSetup.test.js OK');
