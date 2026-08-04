const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const servicePath = path.resolve(__dirname, '../services/rebanadoSyncService.js');

function loadService(fakeDb) {
  delete require.cache[servicePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb
  };
  return require(servicePath);
}

function sampleOrder() {
  return {
    sapDocEntry: 42088,
    sapDocNum: 237220,
    cardCode: 'CAK318',
    cardName: 'COMEDORES INDUSTRIALES ZITRON',
    docDate: '2026-07-24',
    comments: '',
    entrega: {
      diasTexto: '28/07/2026 - 07/08/2026',
      horario: '8:00 - 12:00',
      nombre: 'José Rivera',
      epp: 'Chaleco reflejante',
      comentario: 'Entrega en entrada',
      numeroTraslado: '126766'
    },
    siclik: {
      usuarioNombre: 'Rodrigo Velasco',
      usuarioCorreo: 'rvelasco@tesselar.mx'
    },
    productos: [
      {
        sapLineNum: 2,
        sku: '1101001',
        producto: 'Jamon de Pavo y Cerdo Americano AROOS',
        cantidad: 1.42,
        almacen: '1',
        presentacion: 'Rebanada Estándar',
        tipoRebanado: 'Estándar',
        observaciones: ''
      }
    ]
  };
}

async function testCreate() {
  const poolQueries = [];
  const connectionQueries = [];
  const fakeConnection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params) => {
      connectionQueries.push({ sql, params });
      if (sql.includes('FROM vales WHERE external_key')) return [[]];
      if (sql.includes('INSERT INTO vales')) return [{ insertId: 123 }];
      if (sql.startsWith('UPDATE vales SET folio')) return [{ affectedRows: 1 }];
      if (sql.includes('FROM vale_productos WHERE external_line_key')) return [[]];
      if (sql.includes('INSERT INTO vale_productos')) return [{ insertId: 456 }];
      throw new Error(`Consulta de conexión no simulada: ${sql}`);
    }
  };
  const fakeDb = {
    getConnection: async () => fakeConnection,
    query: async (sql, params) => {
      poolQueries.push({ sql, params });
      if (sql.includes('INSERT INTO rebanado_sync_runs')) return [{ insertId: 77 }];
      if (sql.includes('UPDATE rebanado_sync_runs')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de pool no simulada: ${sql}`);
    }
  };

  const service = loadService(fakeDb);
  const response = await service.synchronize({ source: 'SAP_SICLIK', syncRunId: 'run-create', orders: [sampleOrder()] });
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.created, 1);
  assert.strictEqual(response.updated, 0);
  assert.strictEqual(response.productsCreated, 1);
  assert.strictEqual(response.errors.length, 0);

  const insertVale = connectionQueries.find(item => item.sql.includes('INSERT INTO vales'));
  assert.strictEqual(insertVale.params.length, 20, 'El INSERT de vales debe recibir 20 parámetros.');
  const folioUpdate = connectionQueries.find(item => item.sql.startsWith('UPDATE vales SET folio'));
  assert.match(folioUpdate.params[0], /^VS-\d{4}-0123$/);
  assert.strictEqual(folioUpdate.params[1], 123);
  const finish = poolQueries.find(item => item.sql.includes('UPDATE rebanado_sync_runs'));
  assert.strictEqual(finish.params.length, 10, 'El cierre de sync debe recibir 10 parámetros.');
  const details = JSON.parse(finish.params[8]);
  assert.deepStrictEqual(details[0].action, 'created');
}


async function testPendingValeIsUpdated() {
  const connectionQueries = [];
  const fakeConnection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params) => {
      connectionQueries.push({ sql, params });
      if (sql.includes('FROM vales WHERE external_key')) return [[{ id: 56, estado: 'Pendiente' }]];
      if (sql.startsWith('UPDATE vales') && sql.includes("origen = 'Siclik'")) return [{ affectedRows: 1 }];
      if (sql.includes('FROM vale_productos WHERE external_line_key')) return [[{ id: 99, vale_id: 56 }]];
      if (sql.startsWith('UPDATE vale_productos')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de conexión no simulada: ${sql}`);
    }
  };
  const poolQueries = [];
  const fakeDb = {
    getConnection: async () => fakeConnection,
    query: async (sql, params) => {
      poolQueries.push({ sql, params });
      if (sql.includes('INSERT INTO rebanado_sync_runs')) return [{ insertId: 79 }];
      if (sql.includes('UPDATE rebanado_sync_runs')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de pool no simulada: ${sql}`);
    }
  };

  const service = loadService(fakeDb);
  const response = await service.synchronize({ source: 'SAP_SICLIK', syncRunId: 'run-update', orders: [sampleOrder()] });
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.updated, 1);
  assert.strictEqual(response.productsUpdated, 1);
  assert.strictEqual(response.created, 0);

  const updateVale = connectionQueries.find(item => item.sql.startsWith('UPDATE vales') && item.sql.includes("origen = 'Siclik'"));
  assert.strictEqual(updateVale.params.length, 18, 'El UPDATE de vales debe recibir 18 parámetros.');
  const updateProduct = connectionQueries.find(item => item.sql.startsWith('UPDATE vale_productos'));
  assert.strictEqual(updateProduct.params.length, 10, 'El UPDATE de producto debe recibir 10 parámetros.');
}

async function testLockedValeIsSkipped() {
  const poolQueries = [];
  const connectionQueries = [];
  const fakeConnection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params) => {
      connectionQueries.push({ sql, params });
      if (sql.includes('FROM vales WHERE external_key')) return [[{ id: 55, estado: 'Entregado' }]];
      if (sql.startsWith('UPDATE vales SET last_synced_at')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de conexión no simulada: ${sql}`);
    }
  };
  const fakeDb = {
    getConnection: async () => fakeConnection,
    query: async (sql, params) => {
      poolQueries.push({ sql, params });
      if (sql.includes('INSERT INTO rebanado_sync_runs')) return [{ insertId: 78 }];
      if (sql.includes('UPDATE rebanado_sync_runs')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de pool no simulada: ${sql}`);
    }
  };

  const service = loadService(fakeDb);
  const response = await service.synchronize({ source: 'SAP_SICLIK', syncRunId: 'run-skip', orders: [sampleOrder()] });
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.skipped, 1);
  assert.strictEqual(response.created, 0);
  assert.strictEqual(connectionQueries.some(item => item.sql.includes('INSERT INTO vales')), false);
  assert.strictEqual(connectionQueries.some(item => item.sql.includes('UPDATE vale_productos')), false);

  const finish = poolQueries.find(item => item.sql.includes('UPDATE rebanado_sync_runs'));
  const details = JSON.parse(finish.params[8]);
  assert.strictEqual(details[0].action, 'skipped');
  assert.match(details[0].reason, /Entregado/);
}


async function testHeartbeat() {
  const poolQueries = [];
  const fakeDb = {
    getConnection: async () => { throw new Error('Heartbeat no debe abrir conexión de vale.'); },
    query: async (sql, params) => {
      poolQueries.push({ sql, params });
      if (sql.includes('INSERT INTO rebanado_sync_runs')) return [{ insertId: 88 }];
      if (sql.includes('UPDATE rebanado_sync_runs')) return [{ affectedRows: 1 }];
      throw new Error(`Consulta de pool no simulada: ${sql}`);
    }
  };
  const service = loadService(fakeDb);
  const response = await service.recordHeartbeat({
    source: 'CORONELBOT',
    syncRunId: 'heartbeat-test',
    queriedRows: 7,
    eligibleOrders: 0,
    syncStatus: 'success'
  });
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.heartbeat, true);
  assert.match(response.source, /HEARTBEAT/);
  const finish = poolQueries.find(item => item.sql.includes('UPDATE rebanado_sync_runs'));
  const details = JSON.parse(finish.params[8]);
  assert.strictEqual(details[0].action, 'heartbeat');
  assert.strictEqual(details[0].queriedRows, 7);
}

(async () => {
  await testCreate();
  await testPendingValeIsUpdated();
  await testLockedValeIsSkipped();
  await testHeartbeat();
  console.log('Pruebas simuladas de sincronización idempotente: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
