import { getAllFlowSpecs } from './flows/index.mjs';
import { runFlowSuite } from './lib/flow-runner.mjs';

runFlowSuite({
    suiteName: 'ui-audit',
    specs: getAllFlowSpecs(),
    flowMode: process.env.QA_FLOW_MODE || 'ui-audit',
    summaryTargetPath: 'output/playwright/ui-audit-report.json'
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
