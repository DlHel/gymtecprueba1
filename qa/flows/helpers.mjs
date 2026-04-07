import { uiBaseUrl } from '../lib/config.mjs';

export function buildUiPage(relativePath) {
    return `${uiBaseUrl}/${relativePath}`;
}

export function buildRunLabel(prefix) {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
    const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${entropy}`;
}

export function formatDateInput(date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate.toISOString().split('T')[0];
}

export function formatDateTimeLocal(date) {
    const normalizedDate = new Date(date);
    normalizedDate.setSeconds(0, 0);
    normalizedDate.setMinutes(normalizedDate.getMinutes() - normalizedDate.getTimezoneOffset());
    return normalizedDate.toISOString().slice(0, 16);
}

export function pushStep(ctx, label, passed, detail = null) {
    ctx.report.steps.push({
        label,
        status: passed ? 'passed' : 'failed',
        detail
    });

    if (!passed) {
        ctx.report.findings.push({
            severity: 'high',
            message: `${label}${detail ? ` (${detail})` : ''}`
        });
    }
}

export async function waitForSelectOptions(page, selector, minimumOptions = 2, timeout = 15000) {
    await page.waitForFunction(
        ({ selector: currentSelector, minimumOptions: currentMinimumOptions }) => {
            const select = document.querySelector(currentSelector);
            return Boolean(select && select.options.length >= currentMinimumOptions);
        },
        { selector, minimumOptions },
        { timeout }
    );
}

export async function waitForApiResponse(page, matcher, action, timeout = 15000) {
    const predicate = typeof matcher === 'function'
        ? matcher
        : (response) => response.url().includes(matcher);

    const responsePromise = page.waitForResponse(predicate, { timeout });
    await action();
    return responsePromise;
}

export async function withDialog(page, handler, action) {
    const dialogPromise = page.waitForEvent('dialog');
    await action();
    const dialog = await dialogPromise;
    await handler(dialog);
}

export async function setSearchValue(page, selector, value) {
    const input = page.locator(selector).first();
    await input.fill('');
    await input.fill(value);
    await page.waitForTimeout(500);
}
