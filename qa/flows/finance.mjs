import { buildUiPage, buildRunLabel, formatDateInput, pushStep, waitForApiResponse, waitForSelectOptions } from './helpers.mjs';

async function activateFinanceTab(page, tabName) {
    const selector = `button[data-tab="${tabName}"]`;
    await page.locator(selector).click();
    await page.waitForTimeout(500);
    return page.locator(selector).evaluate((element) => element.classList.contains('active')).catch(() => false);
}

export const financeFlowSpec = {
    key: 'finance',
    page: buildUiPage('finanzas.html'),
    ownerFiles: [
        'frontend/finanzas.html',
        'frontend/js/finanzas.js',
        'frontend/js/finanzas-modals.js',
        'backend/src/modules/finance/finance.routes.js',
        'backend/src/modules/payroll/payroll.routes.js'
    ],
    actions: [],
    modalOwnership: [
        {
            label: 'Modal de cotización',
            selector: '#quote-modal',
            ownerFiles: ['frontend/finanzas.html', 'frontend/js/finanzas.js', 'frontend/js/finanzas-modals.js']
        },
        {
            label: 'Modal de factura',
            selector: '#invoice-modal',
            ownerFiles: ['frontend/finanzas.html', 'frontend/js/finanzas.js', 'frontend/js/finanzas-modals.js']
        },
        {
            label: 'Modal de gasto',
            selector: '#expense-modal',
            ownerFiles: ['frontend/finanzas.html', 'frontend/js/finanzas.js', 'frontend/js/finanzas-modals.js']
        },
        {
            label: 'Modal de período de nómina',
            selector: '#payroll-period-modal',
            ownerFiles: ['frontend/finanzas.html', 'frontend/js/finanzas.js']
        }
    ],
    async run(ctx) {
        const { page, fixtures } = ctx;
        const runLabel = buildRunLabel('QA-FIN');
        const today = formatDateInput(new Date());
        const dueDate = formatDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
        const quoteNumber = `${runLabel}-COT`;
        const invoiceNumber = `${runLabel}-FAC`;
        const expenseDescription = `${runLabel} Gasto`;
        const payrollName = `${runLabel} Nómina`;

        pushStep(ctx, 'Cambiar a tab resumen', await activateFinanceTab(page, 'overview'));
        pushStep(ctx, 'Cambiar a tab cotizaciones', await activateFinanceTab(page, 'quotes'));
        pushStep(ctx, 'Cambiar a tab facturas', await activateFinanceTab(page, 'invoices'));
        pushStep(ctx, 'Cambiar a tab gastos', await activateFinanceTab(page, 'expenses'));
        pushStep(ctx, 'Cambiar a tab nómina', await activateFinanceTab(page, 'payroll'));

        await activateFinanceTab(page, 'quotes');
        await page.getByRole('button', { name: /Nueva Cotización/i }).click();
        await ctx.expectVisible('#quote-modal', 'Abrir modal de cotización');
        await waitForSelectOptions(page, '#quote-client', 2);
        await page.selectOption('#quote-client', String(fixtures.clients.primary.id));
        await page.fill('#quote-number', quoteNumber);
        await page.fill('#quote-description', `Cotización QA ${runLabel}`);
        await page.fill('#quote-total', '120000');
        await page.selectOption('#quote-status', 'Aprobada');
        await page.fill('#quote-date', today);

        const createQuoteResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/quotes') && response.request().method() === 'POST',
            async () => {
                await page.getByRole('button', { name: /guardar cotización/i }).click();
            }
        );
        pushStep(ctx, 'Crear cotización vía UI', createQuoteResponse.ok(), `HTTP ${createQuoteResponse.status()}`);

        const quoteRow = await ctx.dbGet('SELECT id, status FROM Quotes WHERE quote_number = ? LIMIT 1', [quoteNumber]);
        ctx.recordDbAssertion(
            'Persistencia de cotización en Quotes',
            Boolean(quoteRow?.id),
            quoteRow ? `Cotización ${quoteRow.id} (${quoteRow.status})` : null
        );

        const updateQuoteResponse = await ctx.apiFetch(`/quotes/${quoteRow.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: fixtures.clients.primary.id,
                quote_number: quoteNumber,
                description: `Cotización QA ${runLabel} actualizada`,
                total: 135000,
                status: 'Aprobada',
                created_date: today
            })
        });
        pushStep(ctx, 'Editar cotización por API', updateQuoteResponse.ok, `HTTP ${updateQuoteResponse.status}`);

        await activateFinanceTab(page, 'invoices');
        await page.getByRole('button', { name: /Nueva Factura/i }).click();
        await ctx.expectVisible('#invoice-modal', 'Abrir modal de factura');
        await waitForSelectOptions(page, '#invoice-client', 2);
        await page.selectOption('#invoice-client', String(fixtures.clients.primary.id));
        await page.fill('#invoice-number', invoiceNumber);
        await page.fill('#invoice-description', `Factura QA ${runLabel}`);
        await page.fill('#invoice-total', '150000');
        await page.selectOption('#invoice-status', 'Pendiente');
        await page.fill('#invoice-date', today);
        await page.fill('#invoice-due-date', dueDate);

        const createInvoiceResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/invoices') && response.request().method() === 'POST',
            async () => {
                await page.getByRole('button', { name: /guardar factura/i }).click();
            }
        );
        pushStep(ctx, 'Crear factura vía UI', createInvoiceResponse.ok(), `HTTP ${createInvoiceResponse.status()}`);

        const invoiceRow = await ctx.dbGet('SELECT id, status FROM Invoices WHERE invoice_number = ? LIMIT 1', [invoiceNumber]);
        ctx.recordDbAssertion(
            'Persistencia de factura en Invoices',
            Boolean(invoiceRow?.id),
            invoiceRow ? `Factura ${invoiceRow.id} (${invoiceRow.status})` : null
        );

        const markInvoicePaidResponse = await ctx.apiFetch(`/invoices/${invoiceRow.id}/mark-paid`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: `Pago QA ${runLabel}` })
        });
        ctx.recordCrossModuleCheck(
            'Cambiar estado de factura a pagada',
            markInvoicePaidResponse.ok,
            `HTTP ${markInvoicePaidResponse.status}`
        );

        await activateFinanceTab(page, 'expenses');
        await page.getByRole('button', { name: /Nuevo Gasto/i }).first().click();
        await ctx.expectVisible('#expense-modal', 'Abrir modal de gasto');
        await waitForSelectOptions(page, '#expense-category', 2);
        await page.fill('#expense-date', today);
        await page.selectOption('#expense-category', String(fixtures.finance.expenseCategory.id));
        await page.fill('#expense-description', expenseDescription);
        await page.fill('#expense-amount', '45000');
        await page.fill('#expense-supplier', `${runLabel} Proveedor`);
        await page.selectOption('#expense-reference-type', 'ticket');
        await page.fill('#expense-reference-id', String(fixtures.tickets.primary.id));

        const createExpenseResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/expenses') && response.request().method() === 'POST',
            async () => {
                await page.getByRole('button', { name: /guardar gasto/i }).click();
            }
        );
        pushStep(ctx, 'Crear gasto vía UI', createExpenseResponse.ok(), `HTTP ${createExpenseResponse.status()}`);

        const expenseRow = await ctx.dbGet('SELECT id, status, reference_id FROM Expenses WHERE description = ? ORDER BY id DESC LIMIT 1', [expenseDescription]);
        ctx.recordDbAssertion(
            'Persistencia de gasto en Expenses',
            Boolean(expenseRow?.id),
            expenseRow ? `Gasto ${expenseRow.id} (${expenseRow.status})` : null
        );
        ctx.recordCrossModuleCheck(
            'Finanzas -> Tickets por referencia de gasto',
            Number(expenseRow?.reference_id) === Number(fixtures.tickets.primary.id),
            expenseRow ? `reference_id=${expenseRow.reference_id}` : null
        );

        const approveExpenseResponse = await ctx.apiFetch(`/expenses/${expenseRow.id}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: `Aprobación QA ${runLabel}` })
        });
        pushStep(ctx, 'Aprobar gasto', approveExpenseResponse.ok, `HTTP ${approveExpenseResponse.status}`);

        const payExpenseResponse = await ctx.apiFetch(`/expenses/${expenseRow.id}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: `Pago QA ${runLabel}` })
        });
        pushStep(ctx, 'Marcar gasto como pagado', payExpenseResponse.ok, `HTTP ${payExpenseResponse.status}`);

        await activateFinanceTab(page, 'payroll');
        await page.locator('button').filter({ hasText: /Nuevo Período/i }).first().click();
        await ctx.expectVisible('#payroll-period-modal', 'Abrir modal de período de nómina');
        await page.fill('#period-name', payrollName);
        await page.fill('#period-start-date', today);
        await page.fill('#period-end-date', dueDate);
        await page.fill('#payment-date', dueDate);

        const createPayrollResponse = await waitForApiResponse(
            page,
            (response) => response.url().includes('/api/payroll/periods') && response.request().method() === 'POST',
            async () => {
                await page.getByRole('button', { name: /crear período/i }).click();
            }
        );
        pushStep(ctx, 'Crear período de nómina vía UI', createPayrollResponse.ok(), `HTTP ${createPayrollResponse.status()}`);

        const payrollRow = await ctx.dbGet('SELECT id, status FROM PayrollPeriods WHERE period_name = ? ORDER BY id DESC LIMIT 1', [payrollName]);
        ctx.recordDbAssertion(
            'Persistencia de período en PayrollPeriods',
            Boolean(payrollRow?.id),
            payrollRow ? `Período ${payrollRow.id} (${payrollRow.status})` : null
        );
    }
};
