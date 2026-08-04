const db = require('../config/db');
const { lineaAplicaARebanado } = require('./rebanadoRules');
const { parseEntregaDias } = require('./deliveryDateService');
const settingsService = require('./settingsService');
const { buildTemporaryFolio, assignFinalFolio } = require('./valeFolioService');

const LOCKED_STATES = ['Rebanando', 'Listo', 'Entregado', 'Cancelado'];

function nullableText(value, maxLength = null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function integerOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIsoDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
}

function externalOrderKey(docEntry) {
  return `SAP_ORDR_${docEntry}`;
}

function externalLineKey(docEntry, lineNum) {
  return `SAP_ORDR_${docEntry}_LINE_${lineNum}`;
}

function normalizeProduct(line, docEntry) {
  const sapLineNum = integerOrNull(line?.sapLineNum);
  if (sapLineNum === null || sapLineNum < 0) {
    throw new Error('Cada producto aplicable requiere sapLineNum entero.');
  }

  const sku = nullableText(line?.sku, 100);
  const producto = nullableText(line?.producto, 150);
  const cantidad = numberOrNull(line?.cantidad);
  const presentacion = nullableText(line?.presentacion, 100);
  const tipoRebanado = nullableText(line?.tipoRebanado, 80);

  if (!sku || !producto || cantidad === null || cantidad <= 0 || !presentacion || !tipoRebanado) {
    throw new Error(`La línea SAP ${sapLineNum} no tiene SKU, producto, cantidad, presentación o tipo de rebanado válidos.`);
  }

  return {
    sapLineNum,
    externalLineKey: externalLineKey(docEntry, sapLineNum),
    sku,
    producto,
    cantidad,
    almacen: nullableText(line?.almacen, 50),
    presentacion,
    tipoRebanado,
    observaciones: nullableText(line?.observaciones)
  };
}

async function insertProduct(connection, valeId, product, order) {
  await connection.query(
    `INSERT INTO vale_productos
      (vale_id, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, orden,
       sap_line_num, external_line_key, almacen, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      valeId,
      product.sku,
      product.producto,
      product.cantidad,
      product.presentacion,
      product.tipoRebanado,
      product.observaciones,
      order,
      product.sapLineNum,
      product.externalLineKey,
      product.almacen
    ]
  );
}

async function upsertProduct(connection, valeId, product, order) {
  const [rows] = await connection.query(
    'SELECT id, vale_id FROM vale_productos WHERE external_line_key = ? FOR UPDATE',
    [product.externalLineKey]
  );

  if (!rows.length) {
    await insertProduct(connection, valeId, product, order);
    return 'created';
  }

  if (Number(rows[0].vale_id) !== Number(valeId)) {
    throw new Error(`La llave ${product.externalLineKey} ya pertenece a otro vale.`);
  }

  await connection.query(
    `UPDATE vale_productos
     SET sku = ?, producto = ?, cantidad = ?, presentacion = ?, tipo_rebanado = ?,
         observaciones = ?, orden = ?, sap_line_num = ?, almacen = ?, last_synced_at = NOW()
     WHERE id = ?`,
    [
      product.sku,
      product.producto,
      product.cantidad,
      product.presentacion,
      product.tipoRebanado,
      product.observaciones,
      order,
      product.sapLineNum,
      product.almacen,
      rows[0].id
    ]
  );
  return 'updated';
}

function validateAndNormalizeOrder(order) {
  const docEntry = integerOrNull(order?.sapDocEntry);
  if (docEntry === null || docEntry <= 0) {
    throw new Error('Falta sapDocEntry válido.');
  }

  const cliente = nullableText(order?.cardName, 100);
  if (!cliente) throw new Error('Falta cliente (cardName).');

  const entrega = parseEntregaDias(order?.entrega?.diasTexto);
  const rawProducts = Array.isArray(order?.productos) ? order.productos : [];
  const applicableRaw = rawProducts.filter(line => lineaAplicaARebanado(line));
  if (!applicableRaw.length) {
    throw new Error('Falta cliente o productos válidos aplicables a rebanado.');
  }

  const products = applicableRaw.map(line => normalizeProduct(line, docEntry));
  const lineKeys = new Set();
  products.forEach(product => {
    if (lineKeys.has(product.externalLineKey)) {
      throw new Error(`La orden repite sapLineNum ${product.sapLineNum}.`);
    }
    lineKeys.add(product.externalLineKey);
  });

  return {
    docEntry,
    docNum: integerOrNull(order?.sapDocNum),
    externalKey: externalOrderKey(docEntry),
    cardCode: nullableText(order?.cardCode, 50),
    cliente,
    docDate: normalizeIsoDate(order?.docDate),
    comments: nullableText(order?.comments),
    entrega,
    entregaHorario: nullableText(order?.entrega?.horario, 100),
    entregaNombre: nullableText(order?.entrega?.nombre, 150),
    entregaEpp: nullableText(order?.entrega?.epp, 255),
    comentarioEntrega: nullableText(order?.entrega?.comentario),
    numeroTraslado: nullableText(order?.entrega?.numeroTraslado, 100),
    siclikUsuarioNombre: nullableText(order?.siclik?.usuarioNombre, 150),
    siclikUsuarioCorreo: nullableText(order?.siclik?.usuarioCorreo, 190),
    products,
    productsSkippedByRule: rawProducts.length - applicableRaw.length
  };
}

async function processOrder(order) {
  const rawDocEntry = integerOrNull(order?.sapDocEntry);
  if (rawDocEntry === null || rawDocEntry <= 0) {
    throw new Error('Falta sapDocEntry válido.');
  }

  const key = externalOrderKey(rawDocEntry);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.query(
      'SELECT id, estado FROM vales WHERE external_key = ? FOR UPDATE',
      [key]
    );

    if (existingRows.length && LOCKED_STATES.includes(existingRows[0].estado)) {
      await connection.query('UPDATE vales SET last_synced_at = NOW() WHERE id = ?', [existingRows[0].id]);
      await connection.commit();
      return {
        action: 'skipped',
        productsCreated: 0,
        productsUpdated: 0,
        productsSkipped: Array.isArray(order?.productos) ? order.productos.length : 0,
        reason: `Vale omitido porque está en estado ${existingRows[0].estado}.`
      };
    }

    const normalized = validateAndNormalizeOrder(order);
    let valeId;
    let action;

    if (!existingRows.length) {
      const temporaryFolio = buildTemporaryFolio('Siclik');
      const [result] = await connection.query(
        `INSERT INTO vales
          (folio, origen, numero_pedido, cliente, fecha_entrega, prioridad, observaciones, estado,
           sap_docentry, sap_docnum, external_key, cliente_codigo, fecha_pedido,
           entrega_dias_texto, entrega_fecha_inicio, entrega_fecha_fin, entrega_horario,
           entrega_nombre, entrega_epp, comentario_entrega, numero_traslado,
           siclik_usuario_nombre, siclik_usuario_correo, last_synced_at, created_by, updated_by)
         VALUES (?, 'Siclik', ?, ?, ?, 'Normal', ?, 'Pendiente',
                 ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL)`,
        [
          temporaryFolio,
          normalized.docNum ? String(normalized.docNum) : null,
          normalized.cliente,
          normalized.entrega.fechaInicio,
          normalized.comments,
          normalized.docEntry,
          normalized.docNum,
          normalized.externalKey,
          normalized.cardCode,
          normalized.docDate,
          normalized.entrega.texto,
          normalized.entrega.fechaInicio,
          normalized.entrega.fechaFin,
          normalized.entregaHorario,
          normalized.entregaNombre,
          normalized.entregaEpp,
          normalized.comentarioEntrega,
          normalized.numeroTraslado,
          normalized.siclikUsuarioNombre,
          normalized.siclikUsuarioCorreo
        ]
      );
      valeId = result.insertId;
      await assignFinalFolio(connection, valeId, 'Siclik');
      action = 'created';
    } else {
      valeId = existingRows[0].id;
      action = 'updated';
      await connection.query(
        `UPDATE vales
         SET origen = 'Siclik', numero_pedido = ?, cliente = ?, fecha_entrega = ?,
             sap_docentry = ?, sap_docnum = ?, cliente_codigo = ?, fecha_pedido = ?,
             entrega_dias_texto = ?, entrega_fecha_inicio = ?, entrega_fecha_fin = ?,
             entrega_horario = ?, entrega_nombre = ?, entrega_epp = ?, comentario_entrega = ?,
             numero_traslado = ?, siclik_usuario_nombre = ?, siclik_usuario_correo = ?,
             last_synced_at = NOW()
         WHERE id = ?`,
        [
          normalized.docNum ? String(normalized.docNum) : null,
          normalized.cliente,
          normalized.entrega.fechaInicio,
          normalized.docEntry,
          normalized.docNum,
          normalized.cardCode,
          normalized.docDate,
          normalized.entrega.texto,
          normalized.entrega.fechaInicio,
          normalized.entrega.fechaFin,
          normalized.entregaHorario,
          normalized.entregaNombre,
          normalized.entregaEpp,
          normalized.comentarioEntrega,
          normalized.numeroTraslado,
          normalized.siclikUsuarioNombre,
          normalized.siclikUsuarioCorreo,
          valeId
        ]
      );
    }

    let productsCreated = 0;
    let productsUpdated = 0;
    for (let index = 0; index < normalized.products.length; index += 1) {
      const productAction = await upsertProduct(connection, valeId, normalized.products[index], index + 1);
      if (productAction === 'created') productsCreated += 1;
      if (productAction === 'updated') productsUpdated += 1;
    }

    await connection.commit();
    return {
      action,
      productsCreated,
      productsUpdated,
      productsSkipped: normalized.productsSkippedByRule,
      reason: null
    };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function createSyncRun(source, syncRunId, ordersReceived) {
  const [result] = await db.query(
    `INSERT INTO rebanado_sync_runs
      (source, sync_run_id, started_at, status, orders_received)
     VALUES (?, ?, NOW(), 'running', ?)`,
    [source, syncRunId, ordersReceived]
  );
  return result.insertId;
}

async function finishSyncRun(id, summary) {
  await db.query(
    `UPDATE rebanado_sync_runs
     SET finished_at = NOW(), status = ?, orders_created = ?, orders_updated = ?, orders_skipped = ?,
         products_created = ?, products_updated = ?, products_skipped = ?, last_error = ?, details_json = ?
     WHERE id = ?`,
    [
      summary.status,
      summary.created,
      summary.updated,
      summary.skipped,
      summary.productsCreated,
      summary.productsUpdated,
      summary.productsSkipped,
      summary.errors.length ? summary.errors.map(item => `${item.sapDocEntry || 'sin DocEntry'}: ${item.message}`).join('\n').slice(0, 65000) : null,
      JSON.stringify(summary._details || []),
      id
    ]
  );
}

async function synchronize(payload) {
  const source = nullableText(payload?.source, 50) || 'SAP_SICLIK';
  const syncRunId = nullableText(payload?.syncRunId, 100) || new Date().toISOString();
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];
  const runId = await createSyncRun(source, syncRunId, orders.length);

  const summary = {
    ok: true,
    status: 'success',
    syncRunId,
    received: orders.length,
    created: 0,
    updated: 0,
    skipped: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    errors: [],
    _details: []
  };

  try {
    for (const order of orders) {
      try {
        const result = await processOrder(order);
        if (result.action === 'created') summary.created += 1;
        if (result.action === 'updated') summary.updated += 1;
        if (result.action === 'skipped') summary.skipped += 1;
        summary.productsCreated += result.productsCreated;
        summary.productsUpdated += result.productsUpdated;
        summary.productsSkipped += result.productsSkipped;
        summary._details.push({ sapDocEntry: integerOrNull(order?.sapDocEntry), action: result.action, reason: result.reason || null });
      } catch (error) {
        const detail = {
          sapDocEntry: integerOrNull(order?.sapDocEntry),
          message: error.message || 'Error desconocido al procesar la orden.'
        };
        summary.errors.push(detail);
        summary._details.push({ ...detail, action: 'error' });
      }
    }

    if (summary.errors.length) {
      summary.ok = false;
      summary.status = summary.errors.length === orders.length && orders.length > 0 ? 'error' : 'partial_error';
    }
    if (!orders.length) {
      summary.ok = false;
      summary.status = 'error';
      const emptyError = { sapDocEntry: null, message: 'El arreglo orders está vacío.' };
      summary.errors.push(emptyError);
      summary._details.push({ ...emptyError, action: 'error' });
    }

    await finishSyncRun(runId, summary);
    const response = { ...summary };
    delete response._details;
    return response;
  } catch (error) {
    summary.ok = false;
    summary.status = 'error';
    summary.errors.push({ sapDocEntry: null, message: error.message || 'Error general de sincronización.' });
    await finishSyncRun(runId, summary).catch(() => {});
    throw error;
  }
}


async function recordHeartbeat(payload = {}) {
  const requestedSource = nullableText(payload?.source, 40) || 'CORONELBOT';
  const source = `${requestedSource}_HEARTBEAT`.slice(0, 50);
  const syncRunId = nullableText(payload?.syncRunId, 100) || `heartbeat_${new Date().toISOString()}`;
  const runId = await createSyncRun(source, syncRunId, 0);
  const summary = {
    ok: true,
    status: 'success',
    syncRunId,
    received: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    errors: [],
    _details: [{
      action: 'heartbeat',
      checkedAt: nullableText(payload?.checkedAt, 60) || new Date().toISOString(),
      queriedRows: Number(payload?.queriedRows || 0),
      eligibleOrders: Number(payload?.eligibleOrders || 0),
      syncStatus: nullableText(payload?.syncStatus, 30) || 'success',
      message: nullableText(payload?.message, 500)
    }]
  };
  await finishSyncRun(runId, summary);
  const response = { ...summary, heartbeat: true, source };
  delete response._details;
  return response;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getStatus() {
  const [contactRows] = await db.query(
    "SELECT * FROM rebanado_sync_runs WHERE status IN ('success','partial_error') ORDER BY finished_at DESC, id DESC LIMIT 1"
  );
  const [lastDataRows] = await db.query(
    "SELECT * FROM rebanado_sync_runs WHERE source NOT LIKE '%HEARTBEAT' ORDER BY started_at DESC, id DESC LIMIT 1"
  );
  const [successRows] = await db.query(
    "SELECT * FROM rebanado_sync_runs WHERE status = 'success' AND source NOT LIKE '%HEARTBEAT' ORDER BY finished_at DESC, id DESC LIMIT 1"
  );
  const [heartbeatRows] = await db.query(
    "SELECT * FROM rebanado_sync_runs WHERE source LIKE '%HEARTBEAT' ORDER BY finished_at DESC, id DESC LIMIT 1"
  );

  const contact = contactRows[0] || null;
  const last = lastDataRows[0] || null;
  const success = successRows[0] || null;
  const heartbeat = heartbeatRows[0] || null;
  const lastContactAt = contact ? (contact.finished_at || contact.started_at) : null;
  const lastSuccessAt = success ? (success.finished_at || success.started_at) : null;
  const minutesSinceLastContact = lastContactAt
    ? Math.max(0, Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 60000))
    : null;
  const minutesSinceLastSuccess = lastSuccessAt
    ? Math.max(0, Math.floor((Date.now() - new Date(lastSuccessAt).getTime()) / 60000))
    : null;
  const { alertHours, alertGraceMinutes } = await settingsService.getSyncAlertSettings();
  const stale = minutesSinceLastContact === null || minutesSinceLastContact > (alertHours * 60) + alertGraceMinutes;

  return {
    ok: true,
    lastContactAt: toIso(lastContactAt),
    lastHeartbeatAt: toIso(heartbeat ? (heartbeat.finished_at || heartbeat.started_at) : null),
    lastSuccessAt: toIso(lastSuccessAt),
    lastRunAt: toIso(last?.started_at),
    lastStatus: last?.status || contact?.status || null,
    minutesSinceLastContact,
    minutesSinceLastSuccess,
    alertHours,
    alertGraceMinutes,
    stale,
    lastError: last?.last_error || null,
    lastSummary: last ? {
      created: Number(last.orders_created || 0),
      updated: Number(last.orders_updated || 0),
      skipped: Number(last.orders_skipped || 0),
      productsCreated: Number(last.products_created || 0),
      productsUpdated: Number(last.products_updated || 0),
      productsSkipped: Number(last.products_skipped || 0)
    } : null
  };
}

async function getRuns(limit = 25) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const [rows] = await db.query(
    `SELECT id, source, sync_run_id, started_at, finished_at, status,
            orders_received, orders_created, orders_updated, orders_skipped,
            products_created, products_updated, products_skipped, last_error, details_json, created_at
     FROM rebanado_sync_runs
     ORDER BY started_at DESC, id DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows.map(row => ({
    ...row,
    started_at: toIso(row.started_at),
    finished_at: toIso(row.finished_at),
    created_at: toIso(row.created_at),
    details_json: typeof row.details_json === 'string'
      ? JSON.parse(row.details_json || '[]')
      : (row.details_json || [])
  }));
}

async function getStatusForUi() {
  try {
    return await getStatus();
  } catch (error) {
    return {
      ok: false,
      unavailable: true,
      stale: true,
      lastStatus: null,
      lastError: error.code === 'ER_NO_SUCH_TABLE'
        ? 'La migración de integración CORONELBOT todavía no está aplicada.'
        : 'No fue posible consultar el estado de sincronización.'
    };
  }
}

module.exports = {
  synchronize,
  recordHeartbeat,
  getStatus,
  getRuns,
  getStatusForUi,
  processOrder,
  externalOrderKey,
  externalLineKey
};
