function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function normalizeRole(role) {
    const normalized = normalizeText(role);

    switch (normalized) {
        case 'admin':
        case 'administrador':
            return 'Admin';
        case 'manager':
        case 'gerente':
            return 'Manager';
        case 'technician':
        case 'techniciano':
        case 'tecnico':
        case 'tecnica':
            return 'Technician';
        case 'client':
        case 'cliente':
            return 'Cliente';
        case 'supervisor':
            return 'Supervisor';
        default:
            return String(role || '').trim();
    }
}

function normalizeStatus(status) {
    const normalized = normalizeText(status);

    switch (normalized) {
        case 'activo':
        case 'active':
            return 'Activo';
        case 'inactivo':
        case 'inactive':
            return 'Inactivo';
        case 'suspendido':
        case 'suspended':
            return 'Suspendido';
        default:
            return String(status || '').trim();
    }
}

function roleMatches(role, expectedRole) {
    return normalizeRole(role) === normalizeRole(expectedRole);
}

function matchesAnyRole(role, expectedRoles = []) {
    return expectedRoles.some((expectedRole) => roleMatches(role, expectedRole));
}

function isAdminLikeRole(role) {
    return matchesAnyRole(role, ['Admin', 'Manager', 'Supervisor']);
}

function isTechnicianRole(role) {
    return roleMatches(role, 'Technician');
}

module.exports = {
    normalizeText,
    normalizeRole,
    normalizeStatus,
    roleMatches,
    matchesAnyRole,
    isAdminLikeRole,
    isTechnicianRole
};
