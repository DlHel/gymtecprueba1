import { baselineFlowSpecs } from './baseline.mjs';
import { erpFlowSpec } from './erp.mjs';
import { financeFlowSpec } from './finance.mjs';
import { inventoryFlowSpec } from './inventory.mjs';
import { ticketsFlowSpec } from './tickets.mjs';

const priorityFlowSpecs = [
    ticketsFlowSpec,
    inventoryFlowSpec,
    financeFlowSpec
];

const allFlowSpecs = [
    ...priorityFlowSpecs,
    erpFlowSpec,
    ...baselineFlowSpecs
];

const flowMap = new Map(allFlowSpecs.map((spec) => [spec.key, spec]));
const coreOrder = [
    'tickets',
    'inventory',
    'finance',
    'erp',
    'dashboard',
    'clients',
    'equipment',
    'planning',
    'contracts',
    'models',
    'notifications',
    'workforce',
    'reports',
    'config',
    'personal'
];

function dedupeSpecs(specs) {
    const seen = new Set();
    return specs.filter((spec) => {
        if (seen.has(spec.key)) {
            return false;
        }

        seen.add(spec.key);
        return true;
    });
}

export function getAllFlowSpecs() {
    return dedupeSpecs(allFlowSpecs);
}

export function getPriorityFlowSpecs() {
    return dedupeSpecs(priorityFlowSpecs);
}

export function getCoreFlowSpecs() {
    return getFlowSpecsByKeys(coreOrder);
}

export function getFlowSpecsByKeys(keys) {
    const resolvedSpecs = [];

    keys.forEach((key) => {
        if (key === 'all') {
            resolvedSpecs.push(...allFlowSpecs);
            return;
        }

        if (key === 'priority') {
            resolvedSpecs.push(...priorityFlowSpecs);
            return;
        }

        if (key === 'core') {
            resolvedSpecs.push(...coreOrder.map((coreKey) => flowMap.get(coreKey)).filter(Boolean));
            return;
        }

        const spec = flowMap.get(key);
        if (spec) {
            resolvedSpecs.push(spec);
        }
    });

    return dedupeSpecs(resolvedSpecs);
}
