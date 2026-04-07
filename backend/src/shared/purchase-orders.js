const db = require('../db-adapter');

const PURCHASE_ORDER_STATUS_MAP = {
    pending: 'Pendiente',
    pendiente: 'Pendiente',
    approved: 'Aprobada',
    aprobada: 'Aprobada',
    ordered: 'Enviada',
    enviada: 'Enviada',
    received: 'Recibida',
    recibida: 'Recibida',
    cancelled: 'Cancelada',
    canceled: 'Cancelada',
    cancelada: 'Cancelada'
};

const PURCHASE_ORDER_STATUS_ALIASES = {
    Pendiente: ['Pendiente', 'pending', 'pendiente'],
    Aprobada: ['Aprobada', 'approved', 'aprobada'],
    Enviada: ['Enviada', 'ordered', 'enviada'],
    Recibida: ['Recibida', 'received', 'recibida'],
    Cancelada: ['Cancelada', 'cancelled', 'canceled', 'cancelada']
};

async function queryRows(executor, sql, params = []) {
    if (executor && typeof executor.query === 'function') {
        const [rows] = await executor.query(sql, params);
        return rows;
    }

    if (executor && typeof executor.allAsync === 'function') {
        return executor.allAsync(sql, params);
    }

    return db.allAsync(sql, params);
}

async function queryRow(executor, sql, params = []) {
    const rows = await queryRows(executor, sql, params);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function normalizePurchaseOrderStatus(status, fallback = 'Pendiente') {
    const normalizedKey = String(status || '')
        .trim()
        .toLowerCase();

    return PURCHASE_ORDER_STATUS_MAP[normalizedKey] || fallback;
}

function getStatusVariants(status) {
    const canonical = normalizePurchaseOrderStatus(status);
    return PURCHASE_ORDER_STATUS_ALIASES[canonical] || [canonical];
}

function buildStatsCase(columnAlias, statuses) {
    const escapedStatuses = statuses
        .map((status) => `'${String(status).replace(/'/g, "''")}'`)
        .join(', ');

    return `SUM(CASE WHEN status IN (${escapedStatuses}) THEN 1 ELSE 0 END) as ${columnAlias}`;
}

async function getNextPurchaseOrderNumber(executor = null) {
    const row = await queryRow(
        executor,
        `
        SELECT COALESCE(
            MAX(CAST(SUBSTRING_INDEX(order_number, '-', -1) AS UNSIGNED)),
            0
        ) AS max_number
        FROM PurchaseOrders
        WHERE order_number REGEXP '^PO-[0-9]+$'
        `
    );

    const rawMaxValue = row?.max_number;
    const parsedMaxValue = Number.parseInt(String(rawMaxValue ?? '0'), 10);
    const nextNumber = Number.isFinite(parsedMaxValue) ? parsedMaxValue + 1 : 1;

    return `PO-${String(nextNumber).padStart(3, '0')}`;
}

module.exports = {
    PURCHASE_ORDER_STATUS_ALIASES,
    buildStatsCase,
    getNextPurchaseOrderNumber,
    getStatusVariants,
    normalizePurchaseOrderStatus
};
