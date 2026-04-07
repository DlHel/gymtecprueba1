import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, '..', '..');
export const qaDir = path.resolve(rootDir, 'qa');
export const outputDir = path.resolve(rootDir, 'output', 'playwright');
export const flowsOutputDir = path.resolve(outputDir, 'flows');
export const fixturesPath = path.resolve(outputDir, 'qa-fixtures.json');

export const uiBaseUrl = process.env.UI_BASE_URL || 'http://127.0.0.1:8080';
export const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';
export const backendHealthUrl = process.env.BACKEND_HEALTH_URL || 'http://127.0.0.1:3000/api/health';

export const auditUser = process.env.UI_AUDIT_USER || 'admin';
export const auditPassword = process.env.UI_AUDIT_PASSWORD || 'admin123';
export const qaFlowMode = process.env.QA_FLOW_MODE || 'default';
export const qaEvidenceLevel = process.env.QA_EVIDENCE_LEVEL || 'max';

export const chromiumCandidates = [
    process.env.PLAYWRIGHT_BROWSER_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);

export function buildRunTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
