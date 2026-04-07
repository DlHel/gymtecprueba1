import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveFixtures } from './lib/fixture-store.mjs';
import { closeDbConnection, dbGet, dbRun, getTableColumns } from './lib/db-client.mjs';

function pickColumns(payload, columns) {
    return Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => columns.has(key) && value !== undefined)
    );
}

async function ensureRow(table, uniqueField, uniqueValue, payload) {
    const columns = await getTableColumns(table);
    const data = pickColumns({
        ...payload,
        [uniqueField]: uniqueValue
    }, columns);

    const existing = await dbGet(`SELECT id FROM ${table} WHERE ${uniqueField} = ? LIMIT 1`, [uniqueValue]);

    if (existing) {
        const updates = Object.entries(data).filter(([key]) => key !== uniqueField);
        if (updates.length) {
            const setClause = updates.map(([key]) => `${key} = ?`).join(', ');
            await dbRun(
                `UPDATE ${table} SET ${setClause} WHERE id = ?`,
                [...updates.map(([, value]) => value), existing.id]
            );
        }

        return { id: existing.id, created: false };
    }

    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const result = await dbRun(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        fields.map((field) => data[field])
    );

    return { id: result.lastID, created: true };
}

async function ensureOptionalMovement(inventoryId, performedBy) {
    const existing = await dbGet(
        'SELECT id FROM InventoryMovements WHERE inventory_id = ? LIMIT 1',
        [inventoryId]
    );

    if (existing) {
        return existing.id;
    }

    const result = await dbRun(`
        INSERT INTO InventoryMovements (
            inventory_id,
            movement_type,
            quantity,
            unit_cost,
            total_cost,
            stock_before,
            stock_after,
            reference_type,
            notes,
            performed_by
        ) VALUES (?, 'Ajuste', 0, 0, 0, 0, 0, 'QA Fixture', 'Movimiento base QA', ?)
    `, [inventoryId, performedBy]);

    return result.lastID;
}

async function ensureExpenseCategory() {
    return ensureRow('ExpenseCategories', 'name', 'QA AUTO Categoría', {
        description: 'Categoría canónica para pruebas QA',
        is_active: 1
    });
}

export async function seedFixtures() {
    const clientName = 'QA AUTO Cliente';
    const locationName = 'QA AUTO Sede';
    const modelCode = 'QA-AUTO-MODEL';
    const modelName = 'QA AUTO Modelo';
    const equipmentCustomId = 'QA-AUTO-EQ-001';
    const equipmentName = 'QA AUTO Equipo';
    const ticketTitle = 'QA AUTO Ticket Base';
    const inventoryCategoryName = 'QA AUTO Categoría Inventario';
    const inventoryItemCode = 'QA-AUTO-PART-001';
    const inventoryItemName = 'QA AUTO Repuesto';
    const purchaseOrderNumber = 'QA-AUTO-PO-001';
    const expenseCategoryName = 'QA AUTO Categoría';
    const quoteNumber = 'QA-AUTO-QUOTE-001';
    const invoiceNumber = 'QA-AUTO-INV-001';
    const expenseDescription = 'QA AUTO Gasto Base';
    const sparePartRequestName = 'QA AUTO Repuesto';

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const plus30 = new Date(today);
    plus30.setDate(plus30.getDate() + 30);
    const plus30String = plus30.toISOString().split('T')[0];

    const ownerUser = await dbGet(`
        SELECT id, username, email, role
        FROM Users
        ORDER BY CASE WHEN role IN ('Admin', 'Manager') THEN 0 ELSE 1 END, id ASC
        LIMIT 1
    `);

    if (!ownerUser) {
        throw new Error('No existe un usuario base para crear fixtures QA.');
    }

    const technicianUser = await dbGet(`
        SELECT id, username, email, role
        FROM Users
        WHERE role IN ('Technician', 'Tecnico', 'Técnico')
        ORDER BY id ASC
        LIMIT 1
    `) || ownerUser;

    const client = await ensureRow('Clients', 'name', clientName, {
        legal_name: 'QA AUTO Cliente SpA',
        rut: '76.543.210-K',
        address: 'Av. QA 123',
        phone: '+56 9 5555 0000',
        email: 'qa-auto@gymtec.test',
        business_activity: 'Testing industrial',
        contact_name: 'QA Operaciones'
    });

    const location = await ensureRow('Locations', 'name', locationName, {
        client_id: client.id,
        address: 'Av. QA 123, Santiago'
    });

    const model = await ensureRow('EquipmentModels', 'model_code', modelCode, {
        name: modelName,
        brand: 'Gymtec QA',
        category: 'Cardio',
        description: 'Modelo canónico para pruebas QA'
    });

    const equipment = await ensureRow('Equipment', 'custom_id', equipmentCustomId, {
        name: equipmentName,
        type: 'Caminadora',
        brand: 'Gymtec QA',
        model: 'Modelo QA',
        serial_number: 'QA-AUTO-SN-001',
        location_id: location.id,
        model_id: model.id,
        notes: 'Equipo semilla para QA'
    });

    const ticket = await ensureRow('Tickets', 'title', ticketTitle, {
        description: 'Ticket canónico para pruebas integradas QA',
        ticket_type: 'correctivo',
        status: 'Abierto',
        priority: 'Media',
        client_id: client.id,
        location_id: location.id,
        equipment_id: equipment.id,
        assigned_technician_id: technicianUser.id,
        due_date: `${plus30String} 18:00:00`,
        workflow_stage: 'triage'
    });

    const category = await ensureRow('InventoryCategories', 'name', inventoryCategoryName, {
        description: 'Categoría semilla para inventario QA'
    });

    const inventory = await ensureRow('Inventory', 'item_code', inventoryItemCode, {
        item_name: inventoryItemName,
        description: 'Repuesto semilla para QA',
        category_id: category.id,
        unit_of_measure: 'unit',
        current_stock: 12,
        minimum_stock: 2,
        maximum_stock: 25,
        reorder_point: 4,
        reorder_quantity: 10,
        unit_cost: 15000,
        average_cost: 15000,
        last_cost: 15000,
        lead_time_days: 3,
        is_active: 1,
        is_critical: 1
    });

    const purchaseOrder = await ensureRow('PurchaseOrders', 'order_number', purchaseOrderNumber, {
        supplier: 'Proveedor QA',
        status: 'Pendiente',
        order_date: todayString,
        expected_delivery: plus30String,
        total_amount: 150000,
        notes: 'Orden de compra canónica QA',
        created_by: ownerUser.id
    });

    const expenseCategory = await ensureExpenseCategory();

    const quote = await ensureRow('Quotes', 'quote_number', quoteNumber, {
        client_id: client.id,
        created_date: todayString,
        valid_until: plus30String,
        description: 'Cotización semilla QA',
        items: JSON.stringify([{ description: 'Servicio QA', quantity: 1, unit_price: 99000 }]),
        subtotal: 99000,
        tax_amount: 18810,
        total: 117810,
        payment_terms: '30 días',
        notes: 'Generada por QA',
        status: 'Borrador',
        created_by: ownerUser.id
    });

    const invoice = await ensureRow('Invoices', 'invoice_number', invoiceNumber, {
        client_id: client.id,
        quote_id: quote.id,
        issue_date: todayString,
        due_date: plus30String,
        description: 'Factura semilla QA',
        items: JSON.stringify([{ description: 'Servicio QA', quantity: 1, unit_price: 117810 }]),
        subtotal: 99000,
        tax_amount: 18810,
        total: 117810,
        payment_terms: '30 días',
        notes: 'Factura QA',
        status: 'Pendiente',
        created_by: ownerUser.id
    });

    const expense = await ensureRow('Expenses', 'description', expenseDescription, {
        category_id: expenseCategory.id,
        category: 'QA AUTO Categoría',
        amount: 25000,
        date: todayString,
        supplier: 'Proveedor QA',
        receipt_number: 'QA-AUTO-EXP-001',
        status: 'Pendiente',
        payment_method: 'Transferencia',
        reference_type: 'QA',
        reference_id: ticket.id,
        notes: 'Gasto canónico QA',
        created_by: ownerUser.id
    });

    const sparePartRequest = await ensureRow('spare_part_requests', 'spare_part_name', sparePartRequestName, {
        ticket_id: ticket.id,
        quantity_needed: 1,
        priority: 'Media',
        description: 'Solicitud base QA',
        justification: 'Validación cross-module tickets -> inventario',
        requested_by: ownerUser.username,
        status: 'pendiente',
        notes: 'Fixture QA'
    });

    const movementId = await ensureOptionalMovement(inventory.id, ownerUser.id);
    const sharedSparePart = await dbGet(`
        SELECT
            i.id,
            i.item_name,
            i.item_code,
            i.current_stock,
            i.minimum_stock,
            sp.unit_price
        FROM Inventory i
        INNER JOIN SpareParts sp ON sp.id = i.id
        WHERE CAST(i.current_stock AS DECIMAL(10, 2)) > 0
        ORDER BY i.id ASC
        LIMIT 1
    `);

    const fixtures = {
        generatedAt: new Date().toISOString(),
        ownerUser,
        technicianUser,
        clients: { primary: { ...client, name: clientName } },
        locations: { primary: { ...location, name: locationName } },
        models: { primary: { ...model, model_code: modelCode, name: modelName } },
        equipment: { primary: { ...equipment, custom_id: equipmentCustomId, name: equipmentName } },
        tickets: { primary: { ...ticket, title: ticketTitle } },
        inventory: {
            category: { ...category, name: inventoryCategoryName },
            primary: { ...inventory, item_code: inventoryItemCode, item_name: inventoryItemName },
            movementId
        },
        spareParts: {
            primary: {
                id: sharedSparePart?.id || inventory.id,
                sku: sharedSparePart?.item_code || inventoryItemCode,
                name: sharedSparePart?.item_name || inventoryItemName,
                current_stock: Number(sharedSparePart?.current_stock ?? 12),
                minimum_stock: Number(sharedSparePart?.minimum_stock ?? 2),
                unit_price: Number(sharedSparePart?.unit_price ?? 15000)
            }
        },
        purchaseOrders: { primary: { ...purchaseOrder, order_number: purchaseOrderNumber } },
        finance: {
            expenseCategory: { ...expenseCategory, name: expenseCategoryName },
            quote: { ...quote, quote_number: quoteNumber },
            invoice: { ...invoice, invoice_number: invoiceNumber },
            expense: { ...expense, description: expenseDescription }
        },
        sparePartRequests: {
            primary: { ...sparePartRequest, spare_part_name: sparePartRequestName }
        }
    };

    await saveFixtures(fixtures);
    return fixtures;
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFile && path.resolve(currentFile) === executedFile) {
    seedFixtures()
        .then((fixtures) => {
            console.log(JSON.stringify({
                ok: true,
                fixtureKeys: Object.keys(fixtures)
            }, null, 2));
            return closeDbConnection().then(() => {
                process.exit(0);
            });
        })
        .catch((error) => {
            console.error(error);
            return closeDbConnection()
                .catch(() => {})
                .finally(() => {
                    process.exit(1);
                });
        });
}
