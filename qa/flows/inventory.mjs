import { buildUiPage, buildRunLabel, formatDateInput, pushStep, waitForApiResponse, waitForSelectOptions } from './helpers.mjs';

async function openTab(page, selector, expectationSelector) {
    await page.locator(selector).click();
    await page.waitForTimeout(500);
    return page.locator(expectationSelector).evaluate((element) => element.classList.contains('active')).catch(() => false);
}

async function ensureModalOpen(ctx, triggerSelector, modalSelector, label) {
    const { page } = ctx;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        await page.locator(triggerSelector).click({ force: true });
        if (await ctx.expectVisible(modalSelector, label)) {
            return true;
        }
        await page.waitForTimeout(250);
    }

    return false;
}

async function submitInventoryForm(page) {
    await page.locator('#inventory-form').evaluate((form) => form.requestSubmit());
}

async function submitAssignTechnicianForm(page) {
    await page.locator('#assign-technician-form').evaluate((form) => form.requestSubmit());
}

async function getFirstSelectValue(page, selector) {
    return page.locator(selector).evaluate((select) => {
        const option = Array.from(select.options).find((item) => item.value);
        return option ? option.value : null;
    });
}

async function getPreferredOrFirstSelectValue(page, selector, preferredValue = null) {
    return page.locator(selector).evaluate(
        (select, currentPreferredValue) => {
            const options = Array.from(select.options).filter((item) => item.value);
            if (!options.length) {
                return null;
            }

            const preferredOption = currentPreferredValue
                ? options.find((item) => item.value === String(currentPreferredValue))
                : null;

            return preferredOption ? preferredOption.value : options[0].value;
        },
        preferredValue
    );
}

async function waitForAssignmentStatus(ctx, assignmentId, expectedStatus, attempts = 20, delayMs = 400) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const row = await ctx.dbGet(
            'SELECT id, status FROM TechnicianInventory WHERE id = ? LIMIT 1',
            [assignmentId]
        );

        if (row && row.status === expectedStatus) {
            return row;
        }

        await ctx.page.waitForTimeout(delayMs);
    }

    return null;
}

export const inventoryFlowSpec = {
    key: 'inventory',
    page: buildUiPage('inventario.html'),
    ownerFiles: [
        'frontend/inventario.html',
        'frontend/js/inventario.js',
        'backend/src/modules/inventory/inventory.routes.js',
        'backend/src/modules/purchase-orders/purchase-orders.routes.js'
    ],
    actions: [
        {
            label: 'Abrir modal de repuesto',
            assertionType: 'modal',
            target: { id: 'add-inventory-btn' },
            expectVisible: '#inventory-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        },
        {
            label: 'Abrir modal de orden de compra',
            assertionType: 'modal',
            target: { id: 'add-purchase-order-btn' },
            expectVisible: '#purchase-order-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        },
        {
            label: 'Abrir modal de asignación a técnico',
            assertionType: 'modal',
            target: { id: 'assign-to-technician-btn' },
            expectVisible: '#assign-technician-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        }
    ],
    modalOwnership: [
        {
            label: 'Modal de repuesto',
            selector: '#inventory-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        },
        {
            label: 'Modal de orden de compra',
            selector: '#purchase-order-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        },
        {
            label: 'Modal de asignación',
            selector: '#assign-technician-modal',
            ownerFiles: ['frontend/inventario.html', 'frontend/js/inventario.js']
        }
    ],
    async run(ctx) {
        const { page, fixtures } = ctx;
        const runLabel = buildRunLabel('QA-INV');
        const sku = `${runLabel}-SKU`;
        const itemName = `${runLabel} Repuesto`;
        const orderSupplier = `${runLabel} Proveedor`;
        const expectedDelivery = formatDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        pushStep(ctx, 'Abrir tab inventario central', await openTab(page, '#tab-central', '#content-central.active'));
        pushStep(ctx, 'Abrir tab técnicos', await openTab(page, '#tab-technicians', '#content-technicians.active'));
        pushStep(ctx, 'Abrir tab órdenes', await openTab(page, '#tab-orders', '#content-orders.active'));
        pushStep(ctx, 'Abrir tab movimientos', await openTab(page, '#tab-transactions', '#content-transactions.active'));
        await page.locator('#tab-central').click();

        await ensureModalOpen(ctx, '#add-inventory-btn', '#inventory-modal', 'Abrir modal de inventario');
        await page.fill('#inventory-form input[name="name"]', itemName);
        await page.fill('#inventory-form input[name="sku"]', sku);
        const categoryValue = await getFirstSelectValue(page, '#inventory-form select[name="category"]');
        if (categoryValue) {
            await page.selectOption('#inventory-form select[name="category"]', categoryValue);
        }
        await page.fill('#inventory-form input[name="brand"]', 'Gymtec QA');
        await page.fill('#inventory-form input[name="current_stock"]', '9');
        await page.fill('#inventory-form input[name="min_stock"]', '3');
        await page.fill('#inventory-form input[name="unit_price"]', '15000');
        await page.fill('#inventory-form input[name="location"]', `Bodega ${runLabel}`);
        await page.fill('#inventory-form textarea[name="description"]', `Item QA ${itemName}`);

        const createItemResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/inventory') && response.request().method() === 'POST',
            async () => {
                await submitInventoryForm(page);
            }
        );
        const createItemPayload = await createItemResponse.json();
        const itemId = createItemPayload?.data?.id;
        pushStep(ctx, 'Crear repuesto vía UI', Boolean(itemId), itemId ? `ID ${itemId}` : `HTTP ${createItemResponse.status()}`);

        await page.fill('#search-input', sku);
        await page.waitForTimeout(700);
        pushStep(
            ctx,
            'Ver repuesto creado en inventario central',
            await page.locator('#central-inventory-container').textContent().then((text) => text.includes(sku) || text.includes(itemName)),
            sku
        );

        await page.locator(`.edit-inventory-btn[data-id="${itemId}"]`).first().click({ force: true });
        await ctx.expectVisible('#inventory-modal', 'Abrir edición de repuesto');
        await page.fill('#inventory-form textarea[name="description"]', `Item QA ${itemName} actualizado`);
        const updateItemResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes(`/api/inventory/${itemId}`) && response.request().method() === 'PUT',
            async () => {
                await submitInventoryForm(page);
            }
        );
        pushStep(ctx, 'Editar repuesto vía UI', updateItemResponse.ok(), `HTTP ${updateItemResponse.status()}`);

        const adjustResponse = await ctx.apiFetch(`/inventory/${itemId}/adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adjustment_quantity: 2,
                reason: 'Ajuste QA',
                notes: `Ajuste automático ${runLabel}`
            })
        });
        pushStep(ctx, 'Ajustar stock por API', adjustResponse.ok, `HTTP ${adjustResponse.status}`);

        const lowStockResponse = await ctx.apiFetch('/inventory/low-stock');
        pushStep(ctx, 'Consultar stock bajo', lowStockResponse.ok, `HTTP ${lowStockResponse.status}`);

        await page.locator('#tab-orders').click();
        await page.waitForTimeout(500);
        await page.locator('#add-purchase-order-btn').click();
        await ctx.expectVisible('#purchase-order-modal', 'Abrir modal de orden de compra');
        await page.fill('#purchase-order-form input[name="supplier"]', orderSupplier);
        await page.fill('#purchase-order-form input[name="expected_delivery"]', expectedDelivery);
        await page.locator('#add-item-btn').click();
        await waitForSelectOptions(page, '#order-items-container select[name="spare_part_id"]');
        await page.selectOption('#order-items-container select[name="spare_part_id"]', String(itemId));
        await page.fill('#order-items-container input[name="quantity"]', '3');
        await page.fill('#order-items-container input[name="unit_price"]', '17500');
        await page.fill('#purchase-order-form textarea[name="notes"]', `Orden QA ${runLabel}`);

        const createOrderResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/purchase-orders') && response.request().method() === 'POST',
            async () => {
                await page.getByRole('button', { name: /crear orden/i }).click();
            }
        );
        const createOrderPayload = await createOrderResponse.json();
        const orderId = createOrderPayload?.data?.id;
        pushStep(ctx, 'Crear orden de compra vía UI', Boolean(orderId), orderId ? `ID ${orderId}` : `HTTP ${createOrderResponse.status()}`);

        const receiveOrderResponse = await ctx.apiFetch(`/purchase-orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'received',
                notes: `Recepción QA ${runLabel}`
            })
        });
        pushStep(ctx, 'Marcar orden como recibida', receiveOrderResponse.ok, `HTTP ${receiveOrderResponse.status}`);

        await page.locator('#tab-central').click();
        await page.waitForTimeout(600);
        await ensureModalOpen(ctx, '#assign-to-technician-btn', '#assign-technician-modal', 'Abrir modal de asignación');
        await waitForSelectOptions(page, '#assign-technician-form select[name="technician_id"]', 2);
        await waitForSelectOptions(page, '#assign-technician-form select[name="spare_part_id"]', 2);
        const technicianId = await getPreferredOrFirstSelectValue(
            page,
            '#assign-technician-form select[name="technician_id"]',
            fixtures.technicianUser?.id || null
        );
        await page.selectOption('#assign-technician-form select[name="technician_id"]', technicianId);
        await page.selectOption('#assign-technician-form select[name="spare_part_id"]', String(itemId));
        await page.fill('#assign-technician-form input[name="quantity"]', '1');
        await page.fill('#assign-technician-form textarea[name="notes"]', `Asignación QA ${runLabel}`);

        const assignResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/inventory/technician-assignments') && response.request().method() === 'POST',
            async () => {
                await submitAssignTechnicianForm(page);
            }
        );
        pushStep(ctx, 'Asignar repuesto a técnico vía UI', assignResponse.ok(), `HTTP ${assignResponse.status()}`);

        const assignmentRow = await ctx.dbGet(
            `SELECT id, status
             FROM TechnicianInventory
             WHERE technician_id = ? AND spare_part_id = ?
             ORDER BY id DESC LIMIT 1`,
            [Number(technicianId), itemId]
        );
        ctx.recordDbAssertion(
            'Persistencia de asignación en TechnicianInventory',
            Boolean(assignmentRow?.id),
            assignmentRow ? `Asignación ${assignmentRow.id} (${assignmentRow.status})` : null
        );

        await page.locator('#tab-technicians').click();
        await page.waitForTimeout(700);
        await page.evaluate(() => {
            window.__qaOriginalConfirm = window.confirm;
            window.confirm = () => true;
        });
        await page.locator(`.return-item-btn[data-assignment-id="${assignmentRow.id}"]`).first().click();
        const returnedAssignment = await waitForAssignmentStatus(ctx, assignmentRow.id, 'Devuelto');
        await page.evaluate(() => {
            if (window.__qaOriginalConfirm) {
                window.confirm = window.__qaOriginalConfirm;
                delete window.__qaOriginalConfirm;
            }
        });
        pushStep(
            ctx,
            'Devolver repuesto al inventario central',
            Boolean(returnedAssignment?.id),
            returnedAssignment ? `Asignación ${returnedAssignment.id} (${returnedAssignment.status})` : `Asignación ${assignmentRow.id} sin cambio`
        );

        const createdRequestResponse = await ctx.apiFetch('/inventory/spare-part-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: fixtures.tickets.primary.id,
                spare_part_name: `${runLabel} Solicitud`,
                quantity_needed: 1,
                priority: 'alta',
                description: 'Solicitud QA inventario',
                justification: 'Cruce tickets -> inventario',
                requested_by: fixtures.ownerUser.username,
                status: 'pendiente'
            })
        });
        pushStep(ctx, 'Crear solicitud de repuesto para handoff', createdRequestResponse.ok, `HTTP ${createdRequestResponse.status}`);

        const requestRow = await ctx.dbGet(
            'SELECT id FROM spare_part_requests WHERE ticket_id = ? AND spare_part_name = ? ORDER BY id DESC LIMIT 1',
            [fixtures.tickets.primary.id, `${runLabel} Solicitud`]
        );
        ctx.recordCrossModuleCheck(
            'Tickets -> Inventario con solicitud pendiente',
            Boolean(requestRow?.id),
            requestRow ? `Solicitud ${requestRow.id}` : null
        );

        const approveRequestResponse = await ctx.apiFetch(`/inventory/requests/${requestRow.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: `Aprobación QA ${runLabel}` })
        });
        ctx.recordCrossModuleCheck(
            'Aprobar solicitud de repuesto desde inventario',
            approveRequestResponse.ok,
            `HTTP ${approveRequestResponse.status}`
        );
    }
};
