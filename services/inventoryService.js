const db = require('../config/db');

const EPSILON = 0.0001;

function normalizeSku(value) {
  return String(value ?? '').trim().slice(0, 100);
}

function normalizeDescription(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function positiveNumber(value, field = 'cantidad') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} debe ser mayor a cero.`);
  }
  return Math.round(parsed * 100) / 100;
}

function nonNegativeNumber(value, field = 'cantidad') {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} no puede ser negativa.`);
  }
  return Math.round(parsed * 100) / 100;
}

function calculateValeAllocation(requested, slicedAvailable) {
  const quantity = positiveNumber(requested, 'La cantidad del vale');
  const available = Math.max(0, Number(slicedAvailable) || 0);
  const fromSliced = Math.min(quantity, available);
  const fromUnsliced = Math.round((quantity - fromSliced) * 100) / 100;
  return { quantity, fromSliced, fromUnsliced };
}

async function ensureCatalogProduct(connection, { sku, producto, origen = 'Manual', createdBy = null }) {
  const normalizedSku = normalizeSku(sku);
  const description = normalizeDescription(producto);
  if (!normalizedSku || !description) {
    throw new Error('El SKU y la descripción del producto son obligatorios.');
  }

  await connection.query(
    `INSERT IGNORE INTO productos_rebanables
       (sku, descripcion, presentacion, unidad_control, origen, activo, created_by, updated_by)
     VALUES (?, ?, 'REBANADO', 'UNIDAD', ?, 1, ?, ?)`,
    [normalizedSku, description, origen, createdBy, createdBy]
  );
  await connection.query('INSERT IGNORE INTO inventario_existencias (sku) VALUES (?)', [normalizedSku]);
  return normalizedSku;
}

async function lockExistence(connection, sku) {
  await connection.query('INSERT IGNORE INTO inventario_existencias (sku) VALUES (?)', [sku]);
  const [rows] = await connection.query(
    `SELECT sku, cantidad_sin_rebanar, cantidad_rebanado_queda
     FROM inventario_existencias WHERE sku = ? FOR UPDATE`,
    [sku]
  );
  if (!rows.length) throw new Error(`No fue posible inicializar el inventario del SKU ${sku}.`);
  return {
    sku,
    unsliced: Number(rows[0].cantidad_sin_rebanar) || 0,
    sliced: Number(rows[0].cantidad_rebanado_queda) || 0
  };
}

async function applyMovement(connection, movement) {
  const sku = normalizeSku(movement.sku);
  const existence = await lockExistence(connection, sku);
  const deltaUnsliced = Math.round((Number(movement.deltaUnsliced) || 0) * 100) / 100;
  const deltaSliced = Math.round((Number(movement.deltaSliced) || 0) * 100) / 100;
  const nextUnsliced = Math.round((existence.unsliced + deltaUnsliced) * 100) / 100;
  const nextSliced = Math.round((existence.sliced + deltaSliced) * 100) / 100;

  if (nextSliced < -EPSILON) {
    throw new Error(`El SKU ${sku} no tiene suficiente producto rebanado que queda.`);
  }

  await connection.query(
    `UPDATE inventario_existencias
     SET cantidad_sin_rebanar = ?, cantidad_rebanado_queda = ?
     WHERE sku = ?`,
    [nextUnsliced, Math.max(0, nextSliced), sku]
  );

  const [result] = await connection.query(
    `INSERT INTO inventario_movimientos
      (fecha_operacion, sku, tipo, cantidad, delta_sin_rebanar, delta_rebanado_queda,
       cantidad_rebanada_historial, cantidad_merma, saldo_sin_rebanar, saldo_rebanado_queda,
       vale_id, vale_producto_id, vale_history_id, cierre_id, event_key, referencia,
       observaciones, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.date,
      sku,
      movement.type,
      Number(movement.quantity) || 0,
      deltaUnsliced,
      deltaSliced,
      Number(movement.slicedHistory) || 0,
      Number(movement.waste) || 0,
      nextUnsliced,
      Math.max(0, nextSliced),
      movement.valeId || null,
      movement.valeProductId || null,
      movement.valeHistoryId || null,
      movement.closeId || null,
      movement.eventKey || null,
      movement.reference || null,
      movement.notes || null,
      movement.userId || null
    ]
  );

  return { id: result.insertId, nextUnsliced, nextSliced: Math.max(0, nextSliced) };
}

async function registerManualProducts(connection, products, userId, origin = 'Manual') {
  for (const product of products) {
    await ensureCatalogProduct(connection, {
      sku: product.sku,
      producto: product.producto,
      origen: origin,
      createdBy: userId
    });
  }
}

async function applyValeDelivery(connection, valeId, valeHistoryId, userId, date) {
  const [rows] = await connection.query(
    `SELECT id, sku, producto, cantidad
     FROM vale_productos
     WHERE vale_id = ?
     ORDER BY orden, id`,
    [valeId]
  );

  const grouped = new Map();
  rows.forEach(row => {
    const sku = normalizeSku(row.sku);
    if (!grouped.has(sku)) grouped.set(sku, { sku, producto: row.producto, quantity: 0, productId: row.id });
    grouped.get(sku).quantity += Number(row.cantidad) || 0;
  });

  for (const item of grouped.values()) {
    await ensureCatalogProduct(connection, { sku: item.sku, producto: item.producto, origen: 'Migracion' });
    const existence = await lockExistence(connection, item.sku);
    const allocation = calculateValeAllocation(item.quantity, existence.sliced);
    await applyMovement(connection, {
      date,
      sku: item.sku,
      type: 'SALIDA_VALE',
      quantity: allocation.quantity,
      deltaUnsliced: -allocation.fromUnsliced,
      deltaSliced: -allocation.fromSliced,
      slicedHistory: allocation.fromUnsliced,
      valeId,
      valeProductId: item.productId,
      valeHistoryId,
      eventKey: `VALE_ENTREGADO:${valeHistoryId}:${item.sku}`,
      reference: `Vale ${valeId}`,
      notes: `Usó ${allocation.fromSliced.toFixed(2)} rebanado que quedaba y ${allocation.fromUnsliced.toFixed(2)} sin rebanar.`,
      userId
    });
  }
}

async function reverseValeDelivery(connection, valeId, valeHistoryId, userId, date) {
  const [movements] = await connection.query(
    `SELECT * FROM inventario_movimientos
     WHERE vale_id = ? AND tipo = 'SALIDA_VALE' AND reversed_at IS NULL
     ORDER BY id FOR UPDATE`,
    [valeId]
  );

  for (const original of movements) {
    const reversal = await applyMovement(connection, {
      date,
      sku: original.sku,
      type: 'REVERSA_VALE',
      quantity: Number(original.cantidad) || 0,
      deltaUnsliced: -(Number(original.delta_sin_rebanar) || 0),
      deltaSliced: -(Number(original.delta_rebanado_queda) || 0),
      valeId,
      valeHistoryId,
      eventKey: `VALE_REVERSA:${valeHistoryId}:${original.id}`,
      reference: `Reversión de movimiento ${original.id}`,
      notes: 'Se restauró el inventario al reabrir la entrega.',
      userId
    });
    await connection.query(
      `UPDATE inventario_movimientos
       SET reversed_at = NOW(), reversed_by = ?, reversal_movement_id = ?
       WHERE id = ?`,
      [userId, reversal.id, original.id]
    );
  }
}

async function registerLoad({ sku, producto, cantidad, referencia, observaciones, userId, date }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const normalizedSku = await ensureCatalogProduct(connection, { sku, producto, origen: 'Manual', createdBy: userId });
    const quantity = positiveNumber(cantidad);
    await applyMovement(connection, {
      date,
      sku: normalizedSku,
      type: 'CARGA_CEDIS',
      quantity,
      deltaUnsliced: quantity,
      reference: String(referencia || '').trim() || null,
      notes: String(observaciones || '').trim() || null,
      userId
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function registerWaste({ sku, producto, cantidad, origenMerma, observaciones, userId, date }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const normalizedSku = await ensureCatalogProduct(connection, { sku, producto, origen: 'Manual', createdBy: userId });
    const quantity = positiveNumber(cantidad);
    const fromSliced = origenMerma === 'Rebanado que queda';
    await applyMovement(connection, {
      date,
      sku: normalizedSku,
      type: 'MERMA_MANUAL',
      quantity,
      deltaUnsliced: fromSliced ? 0 : -quantity,
      deltaSliced: fromSliced ? -quantity : 0,
      waste: quantity,
      reference: origenMerma || 'Sin rebanar',
      notes: String(observaciones || '').trim() || null,
      userId
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function saveClose({ date, observations, details, userId }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO cierres_rebanado (fecha, observaciones, created_by, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE observaciones = VALUES(observaciones), updated_by = VALUES(updated_by)`,
      [date, observations || null, userId, userId]
    );
    const [[close]] = await connection.query('SELECT id FROM cierres_rebanado WHERE fecha = ? FOR UPDATE', [date]);

    for (const detail of details) {
      const sku = normalizeSku(detail.sku);
      const targetSliced = nonNegativeNumber(detail.rebanadoQueda, 'Rebanado que queda');
      const waste = nonNegativeNumber(detail.merma, 'Merma');
      await ensureCatalogProduct(connection, { sku, producto: detail.producto, origen: 'Manual', createdBy: userId });
      const existence = await lockExistence(connection, sku);
      const eventKey = `CIERRE:${close.id}:${sku}`;
      const [[previousMovement]] = await connection.query(
        'SELECT * FROM inventario_movimientos WHERE event_key = ? FOR UPDATE',
        [eventKey]
      );

      const baseUnsliced = previousMovement
        ? existence.unsliced - (Number(previousMovement.delta_sin_rebanar) || 0)
        : existence.unsliced;
      const baseSliced = previousMovement
        ? existence.sliced - (Number(previousMovement.delta_rebanado_queda) || 0)
        : existence.sliced;
      const deltaSliced = Math.round((targetSliced - baseSliced) * 100) / 100;
      const preventiveSliced = Math.max(0, deltaSliced);
      const deltaUnsliced = Math.round((-preventiveSliced - waste) * 100) / 100;
      const nextUnsliced = Math.round((baseUnsliced + deltaUnsliced) * 100) / 100;

      await connection.query(
        `UPDATE inventario_existencias
         SET cantidad_sin_rebanar = ?, cantidad_rebanado_queda = ?
         WHERE sku = ?`,
        [nextUnsliced, targetSliced, sku]
      );
      await connection.query(
        `INSERT INTO cierre_rebanado_detalles
          (cierre_id, sku, cantidad_rebanado_queda, cantidad_merma, observaciones)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cantidad_rebanado_queda = VALUES(cantidad_rebanado_queda),
           cantidad_merma = VALUES(cantidad_merma),
           observaciones = VALUES(observaciones)`,
        [close.id, sku, targetSliced, waste, detail.observaciones || null]
      );

      const movementParams = [
        date, sku, targetSliced, deltaUnsliced, deltaSliced, preventiveSliced, waste,
        nextUnsliced, targetSliced, close.id, detail.observaciones || null, userId, eventKey
      ];
      if (previousMovement) {
        await connection.query(
          `UPDATE inventario_movimientos
           SET fecha_operacion = ?, sku = ?, tipo = 'CIERRE_REBANADO', cantidad = ?,
               delta_sin_rebanar = ?, delta_rebanado_queda = ?, cantidad_rebanada_historial = ?,
               cantidad_merma = ?, saldo_sin_rebanar = ?, saldo_rebanado_queda = ?, cierre_id = ?,
               observaciones = ?, created_by = ?
           WHERE event_key = ?`,
          movementParams
        );
      } else {
        await connection.query(
          `INSERT INTO inventario_movimientos
            (fecha_operacion, sku, tipo, cantidad, delta_sin_rebanar, delta_rebanado_queda,
             cantidad_rebanada_historial, cantidad_merma, saldo_sin_rebanar,
             saldo_rebanado_queda, cierre_id, observaciones, created_by, event_key)
           VALUES (?, ?, 'CIERRE_REBANADO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          movementParams
        );
      }
    }

    await connection.commit();
    return close.id;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  normalizeSku,
  normalizeDescription,
  calculateValeAllocation,
  ensureCatalogProduct,
  registerManualProducts,
  applyValeDelivery,
  reverseValeDelivery,
  registerLoad,
  registerWaste,
  saveClose,
  _test: { positiveNumber, nonNegativeNumber }
};

