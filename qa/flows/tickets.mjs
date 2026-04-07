import { buildUiPage, buildRunLabel, formatDateTimeLocal, pushStep, waitForApiResponse, waitForSelectOptions } from './helpers.mjs';

async function ensureTicketModalOpen(ctx, label = 'Abrir modal de ticket') {
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
        throw new Error(`Formulario de ticket inválido: ${invalidFields.join(', ')}`);
    }

    return waitForApiResponse(page, matcher, async () => {
        await page.locator('#ticket-form').evaluate((formElement) => {
            const form = /** @type {HTMLFormElement} */ (formElement);
            form.requestSubmit();
        });
    });
}

async function createTicketViaUi(ctx, ticketData) {
    const { page } = ctx;

    const modalOpen = await ensureTicketModalOpen(ctx);
    if (!modalOpen) {
        return null;
    }

    await waitForSelectOptions(page, '#ticket-form select[name="client_id"]');
    await page.selectOption('#ticket-form select[name="client_id"]', String(ticketData.clientId));
    await page.waitForTimeout(600);

    await waitForSelectOptions(page, '#ticket-form select[name="location_id"]');
    await page.selectOption('#ticket-form select[name="location_id"]', String(ticketData.locationId));
    await page.waitForTimeout(600);

    await waitForSelectOptions(page, '#ticket-form select[name="equipment_id"]');
    await page.selectOption('#ticket-form select[name="equipment_id"]', String(ticketData.equipmentId));

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
        const technicianValue = await technicianSelect.evaluate((element) => {
            const select = /** @type {HTMLSelectElement} */ (element);
            return select.options.length > 1 ? select.options[1].value : '';
        });

        if (technicianValue) {
            await technicianSelect.selectOption(technicianValue);
        }
    }

    await page.fill('#tab-details textarea[name="initial_observations"]', `Observación QA ${ticketData.title}`);

    const createResponse = await submitTicketForm(
        ctx,
        (response) => response.url().includes('/api/tickets') && response.request().method() === 'POST',
    );

    const createPayload = await createResponse.json();
    return createPayload?.data?.id;
}

async function updateTicketViaUi(ctx, ticketId, originalTitle, updatedTitle) {
    const { page } = ctx;

    await page.fill('#tickets-search', originalTitle);
    await page.waitForTimeout(700);
    await page.locator(`.edit-ticket-btn[data-id="${ticketId}"]`).first().click();
    await page.waitForSelector('#ticket-modal.is-open', { timeout: 15000 });
    await page.waitForSelector('#tab-general.active input[name="title"]', { timeout: 15000 });
    pushStep(ctx, 'Abrir edición de ticket', true, `Ticket ${ticketId}`);

    await page.fill('#tab-general input[name="title"]', updatedTitle);
    await page.fill('#tab-general textarea[name="description"]', `Descripción actualizada ${updatedTitle}`);

    const statusField = page.locator('#ticket-form select[name="status"]').first();
    if (await statusField.count()) {
        const statusValue = await statusField.evaluate((element) => {
            const select = /** @type {HTMLSelectElement} */ (element);
            return select.value || select.options[0]?.value || '';
        });

        if (statusValue) {
            await statusField.selectOption(statusValue);
        }
    }

    const updateResponse = await submitTicketForm(
        ctx,
        (response) => response.url().includes(`/api/tickets/${ticketId}`) && response.request().method() === 'PUT',
    );

    return updateResponse.ok();
}

async function addNoteViaUi(ctx, ticketId, noteHtml) {
    const { page } = ctx;

    await page.locator('#unified-comment-textarea').evaluate((element, value) => {
        element.innerHTML = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }, noteHtml);

    await page.waitForFunction(() => {
        const button = document.getElementById('send-comment-btn');
        return Boolean(button && !button.disabled);
    });

    const noteResponse = await waitForApiResponse(
        page,
        (response) => response.url().includes(`/api/tickets/${ticketId}/notes`) && response.request().method() === 'POST',
        async () => {
            await page.locator('#send-comment-btn').click();
        }
    );

    return noteResponse.ok();
}

async function addChecklistViaUi(ctx, ticketId, checklistTitle) {
    const { page } = ctx;

    await page.locator('#add-checklist-btn').click({ force: true });

    const checklistModal = page.locator('#add-checklist-modal').first();
    const modalVisibleAfterClick = await checklistModal.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);

    if (!modalVisibleAfterClick) {
        await page.evaluate(() => {
            if (typeof window.showAddChecklistModal === 'function') {
                window.showAddChecklistModal();
            }
        });
    }

    await page.waitForSelector('#add-checklist-modal', { state: 'visible', timeout: 15000 });
    pushStep(ctx, 'Abrir modal de checklist', true, '#add-checklist-modal');

    await page.fill('#checklist-title', checklistTitle);
    await page.fill('#checklist-description', `Detalle QA ${checklistTitle}`);

    await page.evaluate(() => {
        if (typeof window.submitChecklistItem === 'function') {
            return window.submitChecklistItem();
        }

        throw new Error('submitChecklistItem no está disponible en window');
    });

    await page.waitForFunction(
        (title) => document.querySelector('#checklist-items')?.textContent?.includes(title),
        checklistTitle,
        { timeout: 15000 }
    );

    await page.waitForSelector('#checklist-items input[data-item-id]', { timeout: 15000 });
    return true;
}

async function toggleFirstChecklistItem(ctx, ticketId) {
    const { page } = ctx;
    const checkbox = page.locator('#checklist-items input[data-item-id]').first();
    const itemId = await checkbox.getAttribute('data-item-id');

    const toggleResponse = await waitForApiResponse(
        page,
        (response) => response.url().includes(`/api/tickets/${ticketId}/checklist/items/${itemId}`) && response.request().method() === 'PUT',
        async () => {
            await checkbox.check({ force: true });
        }
    );

    return {
        ok: toggleResponse.ok(),
        itemId
    };
}

async function requestSparePartViaUi(ctx, requestName) {
    const { page } = ctx;

    await page.locator('#request-spare-part-btn').click();
    await ctx.expectVisible('#unified-spare-part-form', 'Abrir modal unificado de repuestos');

    await page.selectOption('#spare-part-selector', 'NOT_FOUND');
    await page.fill('#new-spare-name', requestName);
    await page.fill('#quantity-request', '2');
    await page.selectOption('#unified-spare-part-form select[name="priority"]', 'alta');
    await page.fill('#unified-spare-part-form textarea[name="description"]', 'Solicitud QA desde flujo tickets');
    await page.fill('#unified-spare-part-form textarea[name="justification"]', 'Validación cross-module tickets -> inventario');

    await page.waitForFunction(() => {
        const button = document.getElementById('submit-unified-btn');
        return Boolean(button && !button.disabled);
    });

    const requestResponse = await waitForApiResponse(
        page,
        (response) => response.url().includes('/api/inventory/spare-part-requests') && response.request().method() === 'POST',
        async () => {
            await page.locator('#submit-unified-btn').click();
        }
    );

    return requestResponse.ok();
}

export const ticketsFlowSpec = {
    key: 'tickets',
    page: buildUiPage('tickets.html'),
    ownerFiles: [
        'frontend/tickets.html',
        'frontend/js/tickets.js',
        'frontend/ticket-detail.html',
        'frontend/js/ticket-detail.js',
        'frontend/js/ticket-detail-modals.js',
        'backend/src/modules/tickets/tickets.routes.js',
        'backend/src/modules/tickets/ticket-parts.routes.js',
        'backend/src/modules/checklist/checklist.routes.js',
        'backend/src/modules/workflow/workflow.routes.js',
        'backend/src/modules/reports/reports.routes.js',
        'backend/src/modules/notifications/notifications.routes.js'
    ],
    actions: [
        {
            label: 'Abrir modal principal de ticket',
            assertionType: 'modal',
            target: { id: 'add-ticket-btn' },
            expectVisible: '#ticket-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        }
    ],
    modalOwnership: [
        {
            label: 'Modal principal de ticket',
            selector: '#ticket-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal anidado de cliente',
            selector: '#add-client-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal anidado de sede',
            selector: '#add-location-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal anidado de equipo',
            selector: '#add-equipment-modal',
            ownerFiles: ['frontend/tickets.html', 'frontend/js/tickets.js']
        },
        {
            label: 'Modal de checklist en detalle',
            selector: '#add-checklist-modal',
            ownerFiles: ['frontend/js/ticket-detail.js', 'frontend/js/ticket-detail-modals.js']
        },
        {
            label: 'Modal unificado de repuestos',
            selector: '#unified-spare-part-form',
            ownerFiles: ['frontend/js/ticket-detail.js', 'frontend/js/ticket-detail-modals.js']
        }
    ],
    async run(ctx) {
        const { page, fixtures } = ctx;
        const runLabel = buildRunLabel('QA-TKT');
        const ticketTitle = `${runLabel} Ticket`;
        const updatedTitle = `${ticketTitle} - editado`;
        const checklistTitle = `${runLabel} Checklist`;
        const spareRequestName = `${runLabel} Repuesto`;
        const dueDate = formatDateTimeLocal(new Date(Date.now() + 48 * 60 * 60 * 1000));

        await page.fill('#tickets-search', fixtures.tickets.primary.title);
        await page.waitForTimeout(600);
        pushStep(
            ctx,
            'Filtrar tickets por fixture canónica',
            await page.locator('#ticket-list').textContent().then((text) => text.includes(fixtures.tickets.primary.title)),
            fixtures.tickets.primary.title
        );

        await page.locator('#tickets-clear-filters').click();
        await page.waitForTimeout(400);

        const createdTicketId = await createTicketViaUi(ctx, {
            clientId: fixtures.clients.primary.id,
            locationId: fixtures.locations.primary.id,
            equipmentId: fixtures.equipment.primary.id,
            title: ticketTitle,
            description: `Flujo QA para ${ticketTitle}`,
            dueDate
        });

        pushStep(ctx, 'Crear ticket vía UI', Boolean(createdTicketId), createdTicketId ? `ID ${createdTicketId}` : 'Sin ID retornado');

        await page.fill('#tickets-search', ticketTitle);
        await page.waitForTimeout(900);
        pushStep(
            ctx,
            'Ver ticket creado en listado',
            await page.locator('#ticket-list').textContent().then((text) => text.includes(ticketTitle)),
            ticketTitle
        );

        const updatedOk = await updateTicketViaUi(ctx, createdTicketId, ticketTitle, updatedTitle);
        pushStep(ctx, 'Editar ticket vía UI', updatedOk, updatedTitle);

        await page.fill('#tickets-search', updatedTitle);
        await page.waitForTimeout(900);
        pushStep(
            ctx,
            'Ver ticket editado en listado',
            await page.locator('#ticket-list').textContent().then((text) => text.includes(updatedTitle)),
            updatedTitle
        );

        await page.goto(buildUiPage(`ticket-detail.html?id=${createdTicketId}`), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);

        const detailVisible = await ctx.expectVisible('#request-spare-part-btn', 'Cargar detalle del ticket');
        await ctx.expectVisible('#add-checklist-btn', 'Botón agregar tarea disponible');
        await ctx.expectVisible('#unified-comment-textarea', 'Editor unificado disponible');

        const noteOk = detailVisible
            ? await addNoteViaUi(ctx, createdTicketId, `<p>Comentario QA ${runLabel}</p>`)
            : false;
        pushStep(ctx, 'Agregar nota desde detalle', noteOk, createdTicketId);

        const noteRow = await ctx.dbGet(
            'SELECT id FROM TicketNotes WHERE ticket_id = ? ORDER BY id DESC LIMIT 1',
            [createdTicketId]
        );
        ctx.recordDbAssertion('Persistencia de nota en TicketNotes', Boolean(noteRow?.id), noteRow ? `Nota ${noteRow.id}` : null);

        const checklistOk = await addChecklistViaUi(ctx, createdTicketId, checklistTitle);
        pushStep(ctx, 'Agregar checklist desde detalle', checklistOk, checklistTitle);

        const toggled = await toggleFirstChecklistItem(ctx, createdTicketId);
        pushStep(ctx, 'Marcar checklist completado', toggled.ok, toggled.itemId);

        const photoResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photo_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl9jQAAAABJRU5ErkJggg==',
                file_name: `${runLabel}.png`,
                mime_type: 'image/png',
                file_size: 67,
                description: `Foto QA ${runLabel}`,
                photo_type: 'general'
            })
        });
        pushStep(ctx, 'Subir foto por API autenticada', photoResponse.ok, `HTTP ${photoResponse.status}`);

        const assignResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                technician_id: fixtures.technicianUser?.id || fixtures.ownerUser.id,
                auto_start: true
            })
        });
        pushStep(ctx, 'Asignar ticket por workflow API', assignResponse.ok, `HTTP ${assignResponse.status}`);

        const transitionResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/workflow/transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_stage: 'esperando_repuestos',
                notes: `Transición QA ${runLabel}`
            })
        });
        pushStep(ctx, 'Transicionar workflow a esperando_repuestos', transitionResponse.ok, `HTTP ${transitionResponse.status}`);

        const workflowStatusResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/workflow/status`);
        const workflowStatusPayload = await workflowStatusResponse.json();
        ctx.recordCrossModuleCheck(
            'Workflow status responde y refleja el ticket',
            workflowStatusResponse.ok && String(workflowStatusPayload?.data?.ticket_id) === String(createdTicketId),
            workflowStatusResponse.ok ? JSON.stringify(workflowStatusPayload.data) : `HTTP ${workflowStatusResponse.status}`
        );

        const spareRequestOk = await requestSparePartViaUi(ctx, spareRequestName);
        pushStep(ctx, 'Solicitar repuesto desde ticket', spareRequestOk, spareRequestName);

        const spareRequestRow = await ctx.dbGet(
            'SELECT id, status FROM spare_part_requests WHERE ticket_id = ? AND spare_part_name = ? ORDER BY id DESC LIMIT 1',
            [createdTicketId, spareRequestName]
        );
        ctx.recordCrossModuleCheck(
            'Tickets -> Inventario por solicitud de repuesto',
            Boolean(spareRequestRow?.id),
            spareRequestRow ? `Solicitud ${spareRequestRow.id} (${spareRequestRow.status})` : null
        );

        const informeDataResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/informe-data`);
        pushStep(ctx, 'Obtener datos de informe técnico', informeDataResponse.ok, `HTTP ${informeDataResponse.status}`);

        const pdfResponse = await ctx.apiFetch(`/tickets/${createdTicketId}/generate-pdf`);
        ctx.recordCrossModuleCheck(
            'Tickets -> Reportes por generación de PDF',
            pdfResponse.ok && pdfResponse.headers.get('content-type')?.includes('application/pdf'),
            `HTTP ${pdfResponse.status}`
        );

        const notificationStatsResponse = await ctx.apiFetch('/notifications/stats');
        ctx.recordCrossModuleCheck(
            'Tickets -> Notificaciones por endpoint de métricas',
            notificationStatsResponse.ok,
            `HTTP ${notificationStatsResponse.status}`
        );
    }
};
