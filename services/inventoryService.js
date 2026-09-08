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

function inventoryNumber(value, field = 'cantidad') {
  if (String(value ?? '').trim() === '') {
    throw new Error(`${field} es obligatoria.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} debe ser un número válido.`);
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

function roundedQuantity(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function compactQuantity(value) {
  const number = roundedQuantity(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function calculateSlicedAvailability(vales = [], stockRows = [], readyRows = []) {
  const stockBySku = new Map();
  stockRows.forEach(row => {
    const sku = normalizeSku(row.sku);
    if (sku) stockBySku.set(sku, Math.max(0, roundedQuantity(row.cantidad_rebanado_queda)));
  });

  const groupedReady = new Map();
  readyRows.forEach(row => {
    const sku = normalizeSku(row.sku);
    const valeId = Number(row.vale_id);
    if (!sku || !valeId) return;
    const key = `${valeId}|${sku}`;
    if (!groupedReady.has(key)) {
      groupedReady.set(key, {
        valeId,
        sku,
        quantity: 0,
        readyAt: row.listo_desde || row.updated_at || null
      });
    }
    groupedReady.get(key).quantity = roundedQuantity(
      groupedReady.get(key).quantity + Math.max(0, Number(row.cantidad) || 0)
    );
  });

  const readyBySku = new Map();
  groupedReady.forEach(item => {
    if (!readyBySku.has(item.sku)) readyBySku.set(item.sku, []);
    readyBySku.get(item.sku).push(item);
  });

  const reservations = new Map();
  const remainingBySku = new Map(stockBySku);
  readyBySku.forEach((items, sku) => {
    items.sort((left, right) => {
      const leftTime = left.readyAt ? new Date(left.readyAt).getTime() : 0;
      const rightTime = right.readyAt ? new Date(right.readyAt).getTime() : 0;
      return leftTime - rightTime || left.valeId - right.valeId;
    });
    let available = stockBySku.get(sku) || 0;
    items.forEach(item => {
      const reserved = Math.min(item.quantity, available);
      reservations.set(`${item.valeId}|${sku}`, roundedQuantity(reserved));
      available = roundedQuantity(Math.max(0, available - reserved));
    });
    remainingBySku.set(sku, available);
  });

  return vales.map(vale => {
    if (['Entregado', 'Cancelado'].includes(vale.estado)) {
      return { ...vale, rebanado_badge: null };
    }

    const availableBySku = new Map();
    const valeId = Number(vale.id);
    (vale.productos || []).forEach(product => {
      const sku = normalizeSku(product.sku);
      if (availableBySku.has(sku)) return;
      const available = vale.estado === 'Listo'
        ? (reservations.get(`${valeId}|${sku}`) || 0)
        : (remainingBySku.get(sku) || 0);
      availableBySku.set(sku, Math.max(0, roundedQuantity(available)));
    });

    let totalRequired = 0;
    let totalCovered = 0;
    const products = (vale.productos || []).map(product => {
      const sku = normalizeSku(product.sku);
      const required = Math.max(0, roundedQuantity(product.cantidad));
      const available = availableBySku.get(sku) || 0;
      const covered = Math.min(required, available);
      availableBySku.set(sku, roundedQuantity(Math.max(0, available - covered)));
      totalRequired = roundedQuantity(totalRequired + required);
      totalCovered = roundedQuantity(totalCovered + covered);
      return { ...product, rebanado_cubierto: covered, rebanado_requerido: required };
    });

    // Sin producto rebanado utilizable: no se muestra ningún indicador y el
    // flujo operativo conserva exactamente el mismo comportamiento.
    if (totalCovered <= EPSILON || totalRequired <= EPSILON) {
      return {
        ...vale,
        productos: products.map(({ rebanado_cubierto, rebanado_requerido, ...product }) => product),
        rebanado_badge: null
      };
    }

    const fullyCovered = totalCovered + EPSILON >= totalRequired;
    if (fullyCovered) {
      return {
        ...vale,
        productos: products.map(({ rebanado_cubierto, rebanado_requerido, ...product }) => product),
        rebanado_badge: {
          status: vale.estado === 'Listo' ? 'reserved' : 'available',
          label: vale.estado === 'Listo' ? 'Rebanado apartado' : 'Rebanado disponible'
        }
      };
    }

    return {
      ...vale,
      rebanado_badge: null,
      productos: products.map(product => {
        const covered = product.rebanado_cubierto;
        const required = product.rebanado_requerido;
        let status = 'none';
        let label = 'Por rebanar';
        if (covered + EPSILON >= required) {
          status = vale.estado === 'Listo' ? 'reserved' : 'available';
          label = vale.estado === 'Listo' ? 'Apartado' : 'Disponible';
        } else if (covered > EPSILON) {
          status = 'partial';
          label = `${compactQuantity(covered)}/${compactQuantity(required)} ${vale.estado === 'Listo' ? 'apartado' : 'disponible'}`;
        }
        const { rebanado_cubierto, rebanado_requerido, ...cleanProduct } = product;
        return { ...cleanProduct, rebanado_badge: { status, label } };
      })
    };
  });
}

async function attachSlicedAvailability(vales = [], connection = db) {
  if (!vales.length) return vales;
  const skus = [...new Set(vales.flatMap(vale => (vale.productos || []).map(product => normalizeSku(product.sku))).filter(Boolean))];
  if (!skus.length) return vales;
  const placeholders = skus.map(() => '?').join(',');

  try {
    const [stockRows] = await connection.query(
      `SELECT sku, cantidad_rebanado_queda
       FROM inventario_existencias
       WHERE sku IN (${placeholders})`,
      skus
    );

    if (!stockRows.some(row => Number(row.cantidad_rebanado_queda) > EPSILON)) return vales;

    const [readyRows] = await connection.query(
      `SELECT v.id AS vale_id, vp.sku, vp.cantidad,
              COALESCE(
                (SELECT MAX(vh.created_at)
                 FROM vale_history vh
                 WHERE vh.vale_id = v.id AND vh.estado_nuevo = 'Listo'),
                v.updated_at,
                v.created_at
              ) AS listo_desde
       FROM vales v
       INNER JOIN vale_productos vp ON vp.vale_id = v.id
       WHERE v.estado = 'Listo'
         AND vp.sku IN (${placeholders})
       ORDER BY listo_desde, v.id, vp.orden, vp.id`,
      skus
    );

    return calculateSlicedAvailability(vales, stockRows, readyRows);
  } catch (error) {
    console.warn('Indicador de inventario rebanado no disponible:', error.message);
    return vales;
  }
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

async function adjustStock({ sku, targetUnsliced, targetSliced, observations, userId, date }) {
  const connection = await db.getConnection();
  try {
    const normalizedSku = normalizeSku(sku);
    if (!normalizedSku) throw new Error('El SKU es obligatorio.');
    const operationDate = String(date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(operationDate)) throw new Error('La fecha del ajuste no es válida.');

    if (String(targetSliced ?? '').trim() === '') throw new Error('Rebanado que queda es obligatorio.');
    const nextUnsliced = inventoryNumber(targetUnsliced, 'Sin rebanar');
    const nextSliced = nonNegativeNumber(targetSliced, 'Rebanado que queda');
    const reason = String(observations || '').replace(/\s+/g, ' ').trim();
    if (reason.length < 5) throw new Error('Escribe un motivo de al menos 5 caracteres para auditar el ajuste.');

    await connection.beginTransaction();
    const [productRows] = await connection.query(
      'SELECT sku, descripcion FROM productos_rebanables WHERE sku = ? AND activo = 1 FOR UPDATE',
      [normalizedSku]
    );
    if (!productRows.length) throw new Error(`El SKU ${normalizedSku} no existe o está inactivo.`);

    const existence = await lockExistence(connection, normalizedSku);
    const deltaUnsliced = Math.round((nextUnsliced - existence.unsliced) * 100) / 100;
    const deltaSliced = Math.round((nextSliced - existence.sliced) * 100) / 100;
    if (Math.abs(deltaUnsliced) <= EPSILON && Math.abs(deltaSliced) <= EPSILON) {
      throw new Error('Las cantidades nuevas son iguales a las existencias actuales.');
    }

    await applyMovement(connection, {
      date: operationDate,
      sku: normalizedSku,
      type: 'AJUSTE_ADMIN',
      quantity: Math.round((Math.abs(deltaUnsliced) + Math.abs(deltaSliced)) * 100) / 100,
      deltaUnsliced,
      deltaSliced,
      reference: 'Corrección administrativa',
      notes: `${reason} · Anterior: ${existence.unsliced.toFixed(2)} sin rebanar y ${existence.sliced.toFixed(2)} rebanado.`,
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
  calculateSlicedAvailability,
  attachSlicedAvailability,
  ensureCatalogProduct,
  registerManualProducts,
  applyValeDelivery,
  reverseValeDelivery,
  registerLoad,
  registerWaste,
  adjustStock,
  saveClose,
  _test: { positiveNumber, nonNegativeNumber, inventoryNumber }
};
