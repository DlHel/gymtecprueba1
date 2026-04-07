import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
    auditPassword,
    auditUser,
    chromiumCandidates,
    uiBaseUrl
} from './config.mjs';

export async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

export function sanitizeFileName(value) {
    return String(value).replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

export async function detectBrowserPath() {
    for (const candidate of chromiumCandidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // probar siguiente navegador
        }
    }

    throw new Error('No se encontró un navegador Chromium/Edge instalado para las pruebas UI.');
}

export async function waitForPageSettled(page, timeoutMs = 5000) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
    await page.waitForTimeout(400);
}

export function getVisibleStateScript() {
    return () => {
        const isVisible = (element) => {
            if (!element) return false;

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && Number(style.opacity || '1') > 0.05
                && style.pointerEvents !== 'none'
                && rect.width > 0
                && rect.height > 0;
        };

        const buttonText = (element) => {
            const parts = [
                element.innerText,
                element.getAttribute('aria-label'),
                element.getAttribute('title')
            ];

            return parts
                .map((value) => (value || '').replace(/\s+/g, ' ').trim())
                .find(Boolean) || '';
        };

        const buttons = [...document.querySelectorAll('button')]
            .filter(isVisible)
            .map((element) => ({
                id: element.id || '',
                text: buttonText(element),
                className: element.className || ''
            }));

        const modals = [...document.querySelectorAll('.base-modal, [role="dialog"], .modal')]
            .filter(isVisible)
            .map((element) => ({
                id: element.id || '',
                className: element.className || '',
                text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)
            }));

        return {
            url: window.location.href,
            title: document.title,
            buttons: buttons.slice(0, 40),
            openModals: modals,
            apiResources: performance
                .getEntriesByType('resource')
                .filter((entry) => entry.name.includes('/api/'))
                .map((entry) => entry.name)
        };
    };
}

export async function launchBrowserSession() {
    const browserPath = await detectBrowserPath();
    const browser = await chromium.launch({
        headless: true,
        executablePath: browserPath
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 1024 }
    });

    const page = await context.newPage();

    return {
        browserPath,
        browser,
        context,
        page
    };
}

export async function login(page) {
    await page.goto(`${uiBaseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill(auditUser);
    await page.locator('input[type="password"]').first().fill(auditPassword);

    await Promise.all([
        page.waitForURL((url) => url.pathname.endsWith('/index.html'), { timeout: 15000 }),
        page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click()
    ]);

    await waitForPageSettled(page);
}

export function attachPageCollectors(page) {
    const state = {
        apiRequests: [],
        consoleErrors: [],
        consoleWarnings: [],
        pageErrors: [],
        failedRequests: [],
        httpErrors: []
    };

    const listeners = {
        console: (message) => {
            const text = message.text();
            if (message.type() === 'error') {
                state.consoleErrors.push(text);
            } else if (message.type() === 'warning') {
                state.consoleWarnings.push(text);
            }
        },
        pageerror: (error) => {
            state.pageErrors.push(String(error));
        },
        requestfailed: (request) => {
            state.failedRequests.push({
                url: request.url(),
                method: request.method(),
                errorText: request.failure()?.errorText || 'unknown'
            });
        },
        response: (response) => {
            const url = response.url();
            if (url.includes('/api/')) {
                state.apiRequests.push({
                    url,
                    method: response.request().method(),
                    status: response.status()
                });
            }

            if (response.status() >= 400) {
                state.httpErrors.push({
                    url,
                    status: response.status()
                });
            }
        }
    };

    page.on('console', listeners.console);
    page.on('pageerror', listeners.pageerror);
    page.on('requestfailed', listeners.requestfailed);
    page.on('response', listeners.response);

    return {
        state,
        detach() {
            page.off('console', listeners.console);
            page.off('pageerror', listeners.pageerror);
            page.off('requestfailed', listeners.requestfailed);
            page.off('response', listeners.response);
        }
    };
}

export async function takeScreenshot(page, moduleDir, label, fullPage = true) {
    const filePath = path.join(moduleDir, `${sanitizeFileName(label)}.png`);
    await page.screenshot({ path: filePath, fullPage });
    return filePath;
}

export async function isSelectorVisible(page, selector) {
    return page.locator(selector).first().evaluate((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity || '1') > 0.05
            && style.pointerEvents !== 'none'
            && rect.width > 0
            && rect.height > 0;
    }).catch(() => false);
}

export async function waitForSelectorVisible(page, selector, timeoutMs = 2500) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isSelectorVisible(page, selector)) {
            return true;
        }

        await page.waitForTimeout(100);
    }

    return false;
}

export async function closeAnyOpenModal(page) {
    const clickedVisibleModal = await page.evaluate(() => {
        const isVisible = (element) => {
            if (!element) return false;

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && Number(style.opacity || '1') > 0.05
                && style.pointerEvents !== 'none'
                && rect.width > 0
                && rect.height > 0;
        };

        const modal = [...document.querySelectorAll('.base-modal, [role="dialog"], .modal')]
            .find(isVisible);

        if (!modal) {
            return false;
        }

        const closeButton = modal.querySelector('.base-modal-close, [data-close-modal], .base-btn-cancel, #close-modal');

        if (!closeButton) {
            return false;
        }

        closeButton.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        }));

        return true;
    }).catch(() => false);

    if (!clickedVisibleModal) {
        await page.keyboard.press('Escape').catch(() => {});
    }

    await page.waitForFunction(() => {
        const isVisible = (element) => {
            if (!element) return false;

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && Number(style.opacity || '1') > 0.05
                && style.pointerEvents !== 'none'
                && rect.width > 0
                && rect.height > 0;
        };

        return ![...document.querySelectorAll('.base-modal, [role="dialog"], .modal')].some(isVisible);
    }, { timeout: 1200 }).catch(() => {});

    await page.waitForTimeout(150);
}

export async function resolveTargetLocator(page, target) {
    if (!target) {
        return null;
    }

    if (target.id) {
        return page.locator(`#${target.id}`).first();
    }

    if (target.selector) {
        return page.locator(target.selector).first();
    }

    if (target.role || target.name) {
        return page.getByRole(target.role || 'button', { name: target.name }).first();
    }

    if (target.text) {
        const escapedText = target.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return page.getByRole('button', { name: new RegExp(escapedText, 'i') }).first();
    }

    return null;
}

export async function getStoredAuthToken(page) {
    return page.evaluate(() => (
        sessionStorage.getItem('gymtec_token')
        || localStorage.getItem('gymtec_token')
        || sessionStorage.getItem('authToken')
        || localStorage.getItem('authToken')
        || null
    ));
}
