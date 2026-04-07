import { getAllFlowSpecs, getFlowSpecsByKeys } from './flows/index.mjs';
import { runFlowSuite } from './lib/flow-runner.mjs';

const requestedKeys = process.argv.slice(2);
const specs = requestedKeys.length
    ? getFlowSpecsByKeys(requestedKeys)
    : getAllFlowSpecs();

if (!specs.length) {
    console.error(`No se encontraron flujos para: ${requestedKeys.join(', ')}`);
    process.exit(1);
}

runFlowSuite({
    suiteName: requestedKeys.length ? `flow:${requestedKeys.join(',')}` : 'flow:all',
    specs,
    flowMode: process.env.QA_FLOW_MODE || 'default'
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
