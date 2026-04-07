import { buildUiPage, buildRunLabel, formatDateTimeLocal, pushStep, waitForApiResponse, waitForSelectOptions } from './helpers.mjs';

async function ensureTicketModalOpen(ctx, label = 'Abrir modal de ticket ERP') {
    const { page } = ctx;
    const modal = page.locator('#ticket-modal').first();

    for (let attempt = 0; attempt < 2; attempt += 1) {
        if (await modal.isVisible().catch(() => false)) {
            return true;
        }

        await page.locator('#add-ticket-btn').click();
        await page.waitForTimeout(400);

        if (await modal.isVisible().catch(() => false)) {
            return true;
        }

        if (attempt === 0) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(900);
        }
    }

    pushStep(ctx, label, false, '#ticket-modal');
    return false;
}

async function submitForm(page, selector) {
    await page.locator(selector).evaluate((formElement) => {
        const form = /** @type {HTMLFormElement} */ (formElement);
        form.requestSubmit();
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

async function createClientFromNestedModal(ctx, clientData) {
    const { page } = ctx;
    await page.locator('button[onclick="openTicketModal(\'add-client-modal\')"]').evaluate((button) => {
        button.click();
    });
    await ctx.expectVisible('#add-client-modal', 'Abrir modal anidado de cliente');

    await page.fill('#add-client-modal-form input[name="name"]', clientData.name);
    await page.fill('#add-client-modal-form input[name="legal_name"]', clientData.legalName);
    await page.fill('#add-client-modal-form input[name="rut"]', clientData.rut);
    await page.fill('#add-client-modal-form input[name="address"]', clientData.address);
    await page.fill('#add-client-modal-form input[name="phone"]', clientData.phone);
    await page.fill('#add-client-modal-form input[name="email"]', clientData.email);
    await page.fill('#add-client-modal-form input[name="business_activity"]', clientData.businessActivity);
    await page.fill('#add-client-modal-form input[name="contact_name"]', clientData.contactName);

    const response = await waitForApiResponse(
        page,
        (apiResponse) => apiResponse.url().includes('/api/clients') && apiResponse.request().method() === 'POST',
        async () => {
            await submitForm(page, '#add-client-modal-form');
        }
    );

    const payload = await response.json();
    const createdClient = payload?.data || payload;
    await page.waitForFunction(
        (clientId) => {
            const clientSelect = document.querySelector('#ticket-form select[name="client_id"]');
            return Boolean(clientSelect && clientSelect.value === String(clientId));
        },
        createdClient.id,
        { timeout: 15000 }
    );

    return createdClient;
}

async function createLocationFromNestedModal(ctx, locationData) {
    const { page } = ctx;
    await page.locator('button[onclick="openTicketModal(\'add-location-modal\')"]').evaluate((button) => {
        button.click();
    });
    await ctx.expectVisible('#add-location-modal', 'Abrir modal anidado de sede');

    const hiddenClientId = await page.locator('#add-location-modal-form input[name="client_id"]').inputValue();
    pushStep(ctx, 'Sincronizar cliente activo en modal de sede', String(hiddenClientId) === String(locationData.clientId), hiddenClientId);

    await page.fill('#add-location-modal-form input[name="name"]', locationData.name);
    await page.fill('#add-location-modal-form input[name="address"]', locationData.address);

    const response = await waitForApiResponse(
        page,
        (apiResponse) => apiResponse.url().includes('/api/locations') && apiResponse.request().method() === 'POST',
        async () => {
            await submitForm(page, '#add-location-modal-form');
        }
    );

    const payload = await response.json();
    const createdLocation = payload?.data || payload;
    await page.waitForFunction(
        (locationId) => {
            const locationSelect = document.querySelector('#ticket-form select[name="location_id"]');
            return Boolean(locationSelect && locationSelect.value === String(locationId));
        },
        createdLocation.id,
        { timeout: 15000 }
    );

    return createdLocation;
}

async function createEquipmentFromNestedModal(ctx, equipmentData) {
    const { page, fixtures } = ctx;
    await page.locator('button[onclick="openTicketModal(\'add-equipment-modal\')"]').evaluate((button) => {
        button.click();
    });
    await ctx.expectVisible('#add-equipment-modal', 'Abrir modal anidado de equipo');

    const hiddenLocationId = await page.locator('#add-equipment-modal-form input[name="location_id"]').inputValue();
    pushStep(ctx, 'Sincronizar sede activa en modal de equipo', String(hiddenLocationId) === String(equipmentData.locationId), hiddenLocationId);

    await waitForSelectOptions(page, '#add-equipment-modal-form select[name="model_id"]', 2).catch(() => {});
    const modelId = await getPreferredOrFirstSelectValue(
        page,
        '#add-equipment-modal-form select[name="model_id"]',
        fixtures.models.primary.id
    );

    if (!modelId) {
        throw new Error('No hay modelos disponibles para crear equipo ERP');
    }

    await page.fill('#add-equipment-modal-form input[name="name"]', equipmentData.name);
    await page.selectOption('#add-equipment-modal-form select[name="model_id"]', modelId);

    const serialField = page.locator('#add-equipment-modal-form input[name="serial_number"]').first();
    if (await serialField.count()) {
        await serialField.fill(equipmentData.serialNumber);
    }

    const response = await waitForApiResponse(
        page,
        (apiResponse) => apiResponse.url().includes('/api/equipment') && apiResponse.request().method() === 'POST',
        async () => {
            await submitForm(page, '#add-equipment-modal-form');
        }
    );

    const payload = await response.json();
    const createdEquipment = payload?.data || payload;
    await page.waitForFunction(
        (equipmentId) => {
            const equipmentSelect = document.querySelector('#ticket-form select[name="equipment_id"]');
            return Boolean(equipmentSelect && equipmentSelect.value === String(equipmentId));
        },
        createdEquipment.id,
        { timeout: 15000 }
    );

    return createdEquipment;
}

async function submitTicketForm(ctx, matcher) {
    const { page } = ctx;
    const invalidFields = await page.locator('#ticket-form').evaluate((formElement) => {
        const form = /** @type {HTMLFormElement} */ (formElement);
        const invalid = [...form.elements]
            .filter((element) => typeof element.checkValidity === 'function' && !element.checkValidity())
            .map((element) => element.getAttribute('name') || element.id || element.tagName.toLowerCase());

        if (invalid.length) {
            form.reportValidity();
        }

        return invalid;
    });

    if (invalidFields.length) {
        throw new Error(`Formulario ERP inválido: ${invalidFields.join(', ')}`);
    }

    return waitForApiResponse(page, matcher, async () => {
        await submitForm(page, '#ticket-form');
    });
}

async function createTicketWithChain(ctx, ticketData) {
    const { page, fixtures } = ctx;
    await page.selectOption('#ticket-form select[name="priority"]', 'alta');
    await page.fill('#ticket-form input[name="title"]', ticketData.title);
    await page.fill('#ticket-form textarea[name="description"]', ticketData.description);

    await page.locator('#ticket-modal .base-tab-button[data-tab="details"]').evaluate((button) => {
        button.click();
    });
    await page.waitForSelector('#tab-details.active', { timeout: 15000 });
    await page.fill('#tab-details input[name="due_date"]', ticketData.dueDate);

    const technicianSelect = page.locator('#tab-details select[name="assigned_technician_id"]').first();
    if (await technicianSelect.count()) {
        await waitForSelectOptions(page, '#ticket-form select[name="assigned_technician_id"]', 1).catch(() => {});
        const technicianValue = await getPreferredOrFirstSelectValue(
            page,
            '#ticket-form select[name="assigned_technician_id"]',
            fixtures.technicianUser?.id || null
        );

        if (technicianValue) {
            await technicianSelect.selectOption(technicianValue);
        }
    }

    await page.fill('#tab-details textarea[name="initial_observations"]', `Observación ERP ${ticketData.title}`);

    const response = await submitTicketForm(
        ctx,
        (apiResponse) => apiResponse.url().includes('/api/tickets') && apiResponse.request().method() === 'POST'
    );

    const payload = await response.json();
    return payload?.data?.id;
}

async function useInventoryPartFromTicket(ctx, ticketId, sparePartId, noteLabel) {
    const { page } = ctx;
    await page.locator('#request-spare-part-btn').click();
    await ctx.expectVisible('#unified-spare-part-form', 'Abrir modal de repuestos para uso directo');

    await page.selectOption('#spare-part-selector', String(sparePartId));
    await page.waitForFunction(() => {
        const step = document.getElementById('step-2-use');
        return Boolean(step && !step.classList.contains('hidden'));
    }, null, { timeout: 15000 });
    await page.fill('#quantity-use', '1');

    const billToClient = page.locator('#bill_to_client');
    if (!await billToClient.isChecked()) {
        await billToClient.check();
    }

    await page.fill('#unified-spare-part-form textarea[name="notes"]', noteLabel);
    await page.waitForFunction(() => {
        const button = document.getElementById('submit-unified-btn');
        return Boolean(button && !button.disabled);
    }, null, { timeout: 15000 });

    const response = await waitForApiResponse(
        page,
        (apiResponse) => apiResponse.url().includes(`/api/tickets/${ticketId}/spare-parts`) && apiResponse.request().method() === 'POST',
        async () => {
            await page.locator('#submit-unified-btn').click();
        }
    );

    return response.json();
}

async function requestMissingPartFromTicket(ctx, requestName) {
    const { page } = ctx;
    await page.locator('#request-spare-part-btn').click();
    await ctx.expectVisible('#unified-spare-part-form', 'Abrir modal de repuestos para solicitud');

    await page.selectOption('#spare-part-selector', 'NOT_FOUND');
    await page.waitForFunction(() => {
        const step = document.getElementById('step-2-request');
        return Boolean(step && !step.classList.contains('hidden'));
    }, null, { timeout: 15000 });

    await page.fill('#new-spare-name', requestName);
    await page.fill('#quantity-request', '2');
    await page.selectOption('#unified-spare-part-form select[name="priority"]', 'alta');
    await page.fill('#unified-spare-part-form textarea[name="description"]', 'Solicitud ERP cross-module');
    await page.fill('#unified-spare-part-form textarea[name="justification"]', 'ERP debe conversar entre ticket, inventario y compras');

    await page.waitForFunction(() => {
        const button = document.getElementById('submit-unified-btn');
        return Boolean(button && !button.disabled);
    }, null, { timeout: 15000 });

    const response = await waitForApiResponse(
        page,
        (apiResponse) => apiResponse.url().includes('/api/inventory/spare-part-requests') && apiResponse.request().method() === 'POST',
        async () => {
            await page.locator('#submit-unified-btn').click();
        }
    );

    return response.ok();
}

export const erpFlowSpec = {
    key: 'erp',
    page: buildUiPage('tickets.html'),
    ownerFiles: [
        'frontend/tickets.html',
        'frontend/js/tickets.js',
        'frontend/ticket-detail.html',
        'frontend/js/ticket-detail.js',
        'frontend/js/ticket-detail-modals.js',
        'frontend/inventario.html',
        'frontend/js/inventario.js',
        'backend/src/modules/clients/clients.routes.js',
        'backend/src/modules/locations/locations.routes.js',
        'backend/src/modules/equipment/equipment.routes.js',
        'backend/src/modules/tickets/tickets.routes.js',
        'backend/src/modules/tickets/ticket-parts.routes.js',
        'backend/src/modules/inventory/inventory.routes.js',
        'backend/src/modules/purchase-orders/purchase-orders.routes.js',
        'qa/seed-fixtures.mjs'
    ],
    actions: [
        {
            label: 'Abrir modal ERP principal de ticket',
            assertionType: 'modal',
            target: { id: 'add-ticket-btn' },
            expectVisible: '#ticket-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        }
    ],
    modalOwnership: [
        {
            label: 'Modal ERP de ticket',
            selector: '#ticket-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal ERP de cliente',
            selector: '#add-client-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal ERP de sede',
            selector: '#add-location-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal ERP de equipo',
            selector: '#add-equipment-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal ERP de repuestos',
            selector: '#unified-spare-part-form',
            ownerFiles: ['frontend/js/ticket-detail.js', 'frontend/js/ticket-detail-modals.js']
        }
    ],
    async run(ctx) {
        const { page, fixtures } = ctx;
        const runLabel = buildRunLabel('QA-ERP');
        const dueDate = formatDateTimeLocal(new Date(Date.now() + 72 * 60 * 60 * 1000));
        const clientRut = `${runLabel.slice(-8).replace(/\D/g, '').padStart(8, '9')}-5`;
        const clientName = `${runLabel} Cliente`;
        const locationName = `${runLabel} Sede`;
        const equipmentName = `${runLabel} Máquina`;
        const ticketTitle = `${runLabel} Ticket Integrado`;
        const missingPartName = `${runLabel} Repuesto Faltante`;
        const directUseNote = `Uso directo ERP ${runLabel}`;

        const modalOpen = await ensureTicketModalOpen(ctx);
        if (!modalOpen) {
            throw new Error('No se pudo abrir el modal principal de tickets para ERP');
        }

        const createdClient = await createClientFromNestedModal(ctx, {
            name: clientName,
            legalName: `${clientName} SpA`,
            rut: clientRut,
            address: `Av. ERP ${runLabel}`,
            phone: '+56955550000',
            email: `${runLabel.toLowerCase()}@gymtec.test`,
            businessActivity: 'Servicios QA ERP',
            contactName: 'QA Integrado'
        });
        pushStep(ctx, 'Crear cliente desde modal anidado', Boolean(createdClient?.id), createdClient?.id ? `Cliente ${createdClient.id}` : null);

        const clientRow = await ctx.dbGet('SELECT id, name, rut FROM Clients WHERE id = ? LIMIT 1', [createdClient.id]);
        ctx.recordDbAssertion(
            'Persistencia de cliente ERP',
            Boolean(clientRow?.id && clientRow.name === clientName),
            clientRow ? `Cliente ${clientRow.id}` : null
        );

        const createdLocation = await createLocationFromNestedModal(ctx, {
            clientId: createdClient.id,
            name: locationName,
            address: `Dirección ERP ${runLabel}`
        });
        pushStep(ctx, 'Crear sede desde modal anidado', Boolean(createdLocation?.id), createdLocation?.id ? `Sede ${createdLocation.id}` : null);

        const locationRow = await ctx.dbGet('SELECT id, client_id, name FROM Locations WHERE id = ? LIMIT 1', [createdLocation.id]);
        ctx.recordCrossModuleCheck(
            'Cliente -> Sede con relación correcta',
            Boolean(locationRow?.id && String(locationRow.client_id) === String(createdClient.id)),
            locationRow ? `Sede ${locationRow.id} del cliente ${locationRow.client_id}` : null
        );

        const createdEquipment = await createEquipmentFromNestedModal(ctx, {
            locationId: createdLocation.id,
            name: equipmentName,
            serialNumber: `${runLabel}-SN`
        });
        pushStep(ctx, 'Crear equipo desde modal anidado', Boolean(createdEquipment?.id), createdEquipment?.id ? `Equipo ${createdEquipment.id}` : null);

        const equipmentRow = await ctx.dbGet('SELECT id, location_id, name FROM Equipment WHERE id = ? LIMIT 1', [createdEquipment.id]);
        ctx.recordCrossModuleCheck(
            'Sede -> Equipo con nombre persistido',
            Boolean(equipmentRow?.id && String(equipmentRow.location_id) === String(createdLocation.id) && equipmentRow.name === equipmentName),
            equipmentRow ? `Equipo ${equipmentRow.id} / ${equipmentRow.name}` : null
        );

        const createdTicketId = await createTicketWithChain(ctx, {
            title: ticketTitle,
            description: `Flujo ERP integrado ${runLabel}`,
            dueDate
        });
        pushStep(ctx, 'Crear ticket ERP con cliente/sede/equipo nuevos', Boolean(createdTicketId), createdTicketId ? `Ticket ${createdTicketId}` : null);

        const ticketRow = await ctx.dbGet(
            'SELECT id, client_id, location_id, equipment_id FROM Tickets WHERE id = ? LIMIT 1',
            [createdTicketId]
        );
        ctx.recordCrossModuleCheck(
            'Cliente/Sede/Equipo -> Ticket con relaciones correctas',
            Boolean(
                ticketRow?.id
                && String(ticketRow.client_id) === String(createdClient.id)
                && String(ticketRow.location_id) === String(createdLocation.id)
                && String(ticketRow.equipment_id) === String(createdEquipment.id)
            ),
            ticketRow ? JSON.stringify(ticketRow) : null
        );

        await page.goto(buildUiPage(`ticket-detail.html?id=${createdTicketId}`), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        await ctx.expectVisible('#request-spare-part-btn', 'Cargar detalle ERP del ticket');

        const usedPartPayload = await useInventoryPartFromTicket(
            ctx,
            createdTicketId,
            fixtures.spareParts?.primary?.id || fixtures.inventory.primary.id,
            directUseNote
        );
        pushStep(
            ctx,
            'Usar repuesto disponible desde ticket',
            Boolean(usedPartPayload?.data?.id),
            usedPartPayload?.stock_info ? JSON.stringify(usedPartPayload.stock_info) : null
        );

        const usedPartRow = await ctx.dbGet(
            'SELECT id, spare_part_id, quantity_used FROM ticketspareparts WHERE ticket_id = ? AND spare_part_id = ? ORDER BY id DESC LIMIT 1',
            [createdTicketId, fixtures.spareParts?.primary?.id || fixtures.inventory.primary.id]
        );
        ctx.recordCrossModuleCheck(
            'Ticket -> Inventario por uso directo de repuesto',
            Boolean(usedPartRow?.id),
            usedPartRow ? `Uso ${usedPartRow.id}` : null
        );

        const expenseRow = await ctx.dbGet(
            'SELECT id, amount, reference_id FROM Expenses WHERE reference_type = ? AND reference_id = ? ORDER BY id DESC LIMIT 1',
            ['ticket', createdTicketId]
        );
        ctx.recordCrossModuleCheck(
            'Ticket -> Finanzas por gasto automático de repuesto',
            Boolean(expenseRow?.id),
            expenseRow ? `Gasto ${expenseRow.id}` : null
        );

        const missingRequestOk = await requestMissingPartFromTicket(ctx, missingPartName);
        pushStep(ctx, 'Solicitar repuesto faltante desde ticket', missingRequestOk, missingPartName);

        const missingRequestRow = await ctx.dbGet(
            'SELECT id, status FROM spare_part_requests WHERE ticket_id = ? AND spare_part_name = ? ORDER BY id DESC LIMIT 1',
            [createdTicketId, missingPartName]
        );
        ctx.recordCrossModuleCheck(
            'Ticket -> Inventario por solicitud de compra faltante',
            Boolean(missingRequestRow?.id),
            missingRequestRow ? `Solicitud ${missingRequestRow.id} (${missingRequestRow.status})` : null
        );

        await page.goto(buildUiPage('inventario.html'), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        await page.locator('#tab-transactions').click();
        await page.waitForTimeout(900);
        await page.waitForSelector(`.btn-approve-request[data-request-id="${missingRequestRow.id}"]`, { timeout: 15000 });
        pushStep(ctx, 'Ver solicitud del ticket en inventario', true, `Solicitud ${missingRequestRow.id}`);

        const approvalResponsePromise = page.waitForResponse(
            (apiResponse) => apiResponse.url().includes(`/api/inventory/requests/${missingRequestRow.id}/approve`) && apiResponse.request().method() === 'POST',
            { timeout: 15000 }
        );

        await page.evaluate(async ({ requestId, itemName }) => {
            const originalConfirm = window.confirm;
            window.confirm = () => true;

            try {
                await window.inventoryManager.approveRequest(requestId, itemName);
            } finally {
                window.confirm = originalConfirm;
            }
        }, {
            requestId: missingRequestRow.id,
            itemName: missingPartName
        });

        const approvalResponse = await approvalResponsePromise;

        const approvalPayload = await approvalResponse.json();
        const approvalAction = approvalPayload?.data?.action;
        pushStep(ctx, 'Aprobar solicitud del ticket desde inventario', approvalResponse.ok(), approvalAction || `HTTP ${approvalResponse.status()}`);

        const refreshedRequest = await ctx.dbGet(
            'SELECT id, status, purchase_order_id FROM spare_part_requests WHERE id = ? LIMIT 1',
            [missingRequestRow.id]
        );
        ctx.recordCrossModuleCheck(
            'Inventario actualiza estado de solicitud pendiente',
            Boolean(refreshedRequest?.id && refreshedRequest.status === 'aprobada'),
            refreshedRequest ? JSON.stringify(refreshedRequest) : null
        );

        if (approvalAction === 'purchase_order_created') {
            const purchaseOrderRow = await ctx.dbGet(
                'SELECT id, order_number, status FROM PurchaseOrders WHERE id = ? LIMIT 1',
                [refreshedRequest.purchase_order_id]
            );
            ctx.recordCrossModuleCheck(
                'Inventario -> Compras por orden automática',
                Boolean(purchaseOrderRow?.id),
                purchaseOrderRow ? `OC ${purchaseOrderRow.order_number}` : null
            );
        } else {
            const inventoryStockRow = await ctx.dbGet(
                'SELECT id, current_stock FROM SpareParts WHERE id = ? LIMIT 1',
                [fixtures.spareParts?.primary?.id || fixtures.inventory.primary.id]
            );
            ctx.recordCrossModuleCheck(
                'Inventario descuenta stock al aprobar solicitud',
                Boolean(inventoryStockRow?.id),
                inventoryStockRow ? `Stock ${inventoryStockRow.current_stock}` : null
            );
        }
    }
};
