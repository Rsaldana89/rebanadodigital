const assert = require('assert');
const {
  buildValeFolio,
  buildTemporaryFolio,
  assignFinalFolio,
  getMexicoYearMonth
} = require('../services/valeFolioService');

const augustDate = new Date('2026-08-04T18:00:00Z');

assert.strictEqual(getMexicoYearMonth(augustDate), '2608');
assert.strictEqual(buildValeFolio('Manual', 127, augustDate), 'VM-2608-0127');
assert.strictEqual(buildValeFolio('Siclik', 128, augustDate), 'VS-2608-0128');
assert.strictEqual(buildValeFolio('Excel', 10001, augustDate), 'VE-2608-10001');
assert.match(buildTemporaryFolio('Manual'), /^TMP-VM-/);
assert.throws(() => buildValeFolio('Manual', 0, augustDate), /ID de vale valido/);

(async () => {
  const queries = [];
  const connection = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
  };

  const folio = await assignFinalFolio(connection, 127, 'Manual', augustDate);
  assert.strictEqual(folio, 'VM-2608-0127');
  assert.deepStrictEqual(queries[0], {
    sql: 'UPDATE vales SET folio = ? WHERE id = ?',
    params: ['VM-2608-0127', 127]
  });

  console.log('Pruebas de nomenclatura de folios: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
