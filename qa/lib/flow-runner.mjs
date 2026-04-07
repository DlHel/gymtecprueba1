import fs from 'node:fs/promises';
import path from 'node:path';
import { apiBaseUrl, buildRunTimestamp, flowsOutputDir, qaEvidenceLevel, rootDir } from './config.mjs';
import { closeDbConnection, dbAll, dbGet } from './db-client.mjs';
import { loadFixtures } from './fixture-store.mjs';
import { runPreflight } from './preflight.mjs';
import {
    attachPageCollectors,
    closeAnyOpenModal,
    ensureDir,
    getStoredAuthToken,
    getVisibleStateScript,
    launchBrowserSession,
    login,
    resolveTargetLocator,
    takeScreenshot,
    waitForSelectorVisible,
    waitForPageSettled
} from './browser-utils.mjs';

async function executeGenericAction(page, moduleDir, action) {
    await closeAnyOpenModal(page);
    const beforeState = await page.evaluate(getVisibleStateScript());
    const locator = await resolveTargetLocator(page, action.target);

    const result = {
        label: action.label,
        found: false,
        clicked: false,
        assertionPassed: false,
        modalSelector: action.expectVisible || null,
        ownerFiles: action.ownerFiles || []
    };

    if (!locator || !await locator.count()) {
        result.error = 'trigger_not_found';
        return result;
    }

    result.found = true;
    await locator.click({ force: true });
    result.clicked = true;
    await page.waitForTimeout(action.waitMs || 350);

    if (action.expectVisible) {
        result.assertionPassed = await waitForSelectorVisible(page, action.expectVisible, action.timeoutMs || 2500);
    } else {
        result.assertionPassed = true;
    }

    if (result.assertionPassed && action.expectVisible) {
        result.modalOpened = true;
        result.screenshot = await takeScreenshot(page, moduleDir, action.label);
    }

    if (action.expectVisible) {
        await closeAnyOpenModal(page);
    }

    result.beforeButtons = beforeState.buttons.length;
    result.afterState = await page.evaluate(getVisibleStateScript());

    return result;
}

async function runGenericSpec(ctx, spec) {
    for (const action of spec.actions || []) {
        const actionResult = await executeGenericAction(ctx.page, ctx.moduleDir, action);
        ctx.report.buttons_checked.push(actionResult);

        if (action.assertionType === 'modal' && action.expectVisible) {
            ctx.report.modals_checked.push({
                selector: action.expectVisible,
                ownerFiles: action.ownerFiles || [],
                passed: actionResult.assertionPassed
            });
        }

        ctx.report.steps.push({
            label: action.label,
            status: actionResult.assertionPassed ? 'passed' : 'failed',
            detail: actionResult.error || null
        });

        if (!actionResult.assertionPassed) {
            ctx.report.findings.push({
                severity: 'high',
                message: `No se pudo validar la acción "${action.label}" en ${spec.key}`
            });
        }
    }
}

function normalizeStatus(report, networkState) {
    const hasHardFailure = Boolean(
        report.findings.some((finding) => finding.severity === 'high')
        || networkState.consoleErrors.length
        || networkState.pageErrors.length
        || networkState.failedRequests.length
        || networkState.httpErrors.length
    );

    return hasHardFailure ? 'failed' : 'passed';
}

function shouldCaptureEvidence(stage) {
    switch (qaEvidenceLevel) {
    case 'min':
        return stage === 'failure';
    case 'medium':
        return stage === 'modal' || stage === 'final' || stage === 'failure';
    case 'max':
    default:
        return true;
    }
}

async function captureEvidence(page, moduleDir, label, stage, fullPage = true) {
    if (!shouldCaptureEvidence(stage)) {
        return null;
    }

    return takeScreenshot(page, moduleDir, label, fullPage);
}

export async function runFlowSuite({
    suiteName,
    specs,
    preflight = true,
    flowMode = 'default',
    summaryTargetPath = null
}) {
    try {
        if (preflight) {
            await runPreflight({ rootDir, ensureSeed: true });
        }

        const fixtures = await loadFixtures();
        const timestamp = buildRunTimestamp();
        const runDir = path.resolve(flowsOutputDir, timestamp);
        await ensureDir(runDir);

        const browserSession = await launchBrowserSession();
        const { browser, browserPath, page } = browserSession;

        const summary = {
            generatedAt: new Date().toISOString(),
            suiteName,
            flowMode,
            evidenceLevel: qaEvidenceLevel,
            browserPath,
            runDir,
            modules: []
        };

        await login(page);

        for (const spec of specs) {
            const moduleDir = path.resolve(runDir, spec.key);
            await ensureDir(moduleDir);

            const collector = attachPageCollectors(page);
            const report = {
                module: spec.key,
                page: spec.page,
                ownerFiles: spec.ownerFiles || [],
                steps: [],
                buttons_checked: [],
                modals_checked: [],
                api_requests: [],
                console_errors: [],
                db_assertions: [],
                cross_module_checks: [],
                evidence_level: qaEvidenceLevel,
                status: 'passed',
                findings: []
            };

            try {
                await page.goto(spec.page, { waitUntil: 'domcontentloaded' });
                await waitForPageSettled(page);
                report.initial_screenshot = await captureEvidence(page, moduleDir, 'initial', 'initial');

                const ctx = {
                    apiBaseUrl,
                    fixtures,
                    flowMode,
                    moduleDir,
                    page,
                    report,
                    spec,
                    async apiFetch(apiPath, init = {}) {
                        const token = await getStoredAuthToken(page);
                        const headers = new Headers(init.headers || {});
                        headers.set('Accept', 'application/json');
                        if (token) {
                            headers.set('Authorization', `Bearer ${token}`);
                        }

                        return fetch(`${apiBaseUrl}${apiPath}`, {
                            ...init,
                            headers
                        });
                    },
                    async dbGet(sql, params = []) {
                        return dbGet(sql, params);
                    },
                    async dbAll(sql, params = []) {
                        return dbAll(sql, params);
                    },
                    async expectVisible(selector, label) {
                        const passed = await waitForSelectorVisible(page, selector);
                        report.steps.push({
                            label,
                            status: passed ? 'passed' : 'failed',
                            detail: selector
                        });
                        if (!passed) {
                            report.findings.push({
                                severity: 'high',
                                message: `No se encontró el selector esperado ${selector}`
                            });
                        }
                        return passed;
                    },
                    async screenshot(label) {
                        return captureEvidence(page, moduleDir, label, 'modal');
                    },
                    recordDbAssertion(label, passed, details = null) {
                        report.db_assertions.push({ label, passed, details });
                        if (!passed) {
                            report.findings.push({
                                severity: 'high',
                                message: `Falló la aserción de datos: ${label}${details ? ` (${details})` : ''}`
                            });
                        }
                    },
                    recordCrossModuleCheck(label, passed, details = null) {
                        report.cross_module_checks.push({ label, passed, details });
                        if (!passed) {
                            report.findings.push({
                                severity: 'medium',
                                message: `Falló la validación cruzada: ${label}${details ? ` (${details})` : ''}`
                            });
                        }
                    }
                };

                if (spec.actions?.length) {
                    await runGenericSpec(ctx, spec);
                }

                if (typeof spec.run === 'function') {
                    await spec.run(ctx);
                }
            } catch (error) {
                report.findings.push({
                    severity: 'high',
                    message: error.message
                });
                report.failure_screenshot = await captureEvidence(page, moduleDir, 'failure', 'failure');
            } finally {
                collector.detach();
                report.final_screenshot = await captureEvidence(page, moduleDir, 'final', 'final');
                report.api_requests = collector.state.apiRequests;
                report.console_errors = [
                    ...collector.state.consoleErrors,
                    ...collector.state.pageErrors
                ];
                report.network_failures = {
                    failedRequests: collector.state.failedRequests,
                    httpErrors: collector.state.httpErrors
                };
                report.status = normalizeStatus(report, collector.state);

                const reportPath = path.resolve(moduleDir, 'report.json');
                await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
                summary.modules.push(report);
            }
        }
        await browser.close();

        const summaryPath = summaryTargetPath
            ? path.resolve(rootDir, summaryTargetPath)
            : path.resolve(runDir, 'summary.json');

        await ensureDir(path.dirname(summaryPath));
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

        const failedModules = summary.modules
            .filter((moduleReport) => moduleReport.status !== 'passed')
            .map((moduleReport) => moduleReport.module);

        console.log(JSON.stringify({
            suiteName,
            summaryPath,
            auditedModules: summary.modules.length,
            failedModules
        }, null, 2));

        return {
            summary,
            summaryPath,
            failedModules
        };
    } finally {
        await closeDbConnection().catch(() => {});
    }
}
