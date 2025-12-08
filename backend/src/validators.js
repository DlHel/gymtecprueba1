// Validadores para el backend de Gymtec ERP

// Validador de email
const isValidEmail = (email) => {
    if (!email) return true; // Email es opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validador de RUT chileno básico
const isValidRUT = (rut) => {
    if (!rut) return false; // RUT es obligatorio
    // Formato básico: 12345678-9 o 12.345.678-9
    const rutRegex = /^[\d.]{1,10}-[\dkK]$/;
    return rutRegex.test(rut.trim());
};

// Validador de teléfono
const isValidPhone = (phone) => {
    if (!phone) return true; // Teléfono es opcional
    // Acepta números con o sin espacios, guiones, paréntesis
    const phoneRegex = /^[\d\s\-\(\)\+]{7,15}$/;
    return phoneRegex.test(phone);
};

// Validador de longitud de texto
const isValidLength = (text, maxLength) => {
    if (!text) return true;
    return text.length <= maxLength;
};

// Validador de campos requeridos
const isRequired = (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
};

// Validador para clientes
const validateClient = (clientData) => {
    const errors = [];
    
    // Campos obligatorios
    if (!isRequired(clientData.name)) {
        errors.push('El nombre comercial es obligatorio');
    }
    if (!isRequired(clientData.legal_name)) {
        errors.push('La razón social es obligatoria');
    }
    if (!isRequired(clientData.rut)) {
        errors.push('El RUT es obligatorio');
    }
    
    // Validaciones de formato
    if (clientData.rut && !isValidRUT(clientData.rut)) {
        errors.push('El formato del RUT no es válido (ej: 12345678-9)');
    }
    if (clientData.email && !isValidEmail(clientData.email)) {
        errors.push('El formato del email no es válido');
    }
    if (clientData.phone && !isValidPhone(clientData.phone)) {
        errors.push('El formato del teléfono no es válido');
    }
    
    // Validaciones de longitud
    if (!isValidLength(clientData.name, 100)) {
        errors.push('El nombre comercial no puede exceder 100 caracteres');
    }
    if (!isValidLength(clientData.legal_name, 150)) {
        errors.push('La razón social no puede exceder 150 caracteres');
    }
    if (!isValidLength(clientData.address, 200)) {
        errors.push('La dirección no puede exceder 200 caracteres');
    }
    if (!isValidLength(clientData.business_activity, 100)) {
        errors.push('El giro no puede exceder 100 caracteres');
    }
    if (!isValidLength(clientData.contact_name, 100)) {
        errors.push('El nombre de contacto no puede exceder 100 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validador para ubicaciones/sedes
const validateLocation = (locationData) => {
    const errors = [];
    
    // Campos obligatorios
    if (!isRequired(locationData.name)) {
        errors.push('El nombre de la sede es obligatorio');
    }
    if (!isRequired(locationData.client_id)) {
        errors.push('El ID del cliente es obligatorio');
    }
    
    // Validaciones de longitud
    if (!isValidLength(locationData.name, 100)) {
        errors.push('El nombre de la sede no puede exceder 100 caracteres');
    }
    if (!isValidLength(locationData.address, 200)) {
        errors.push('La dirección no puede exceder 200 caracteres');
    }
    
    // Validar que client_id sea un número
    if (locationData.client_id && isNaN(parseInt(locationData.client_id, 10))) {
        errors.push('El ID del cliente debe ser un número válido');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validador para equipos
const validateEquipment = (equipmentData) => {
    const errors = [];
    
    // Campos obligatorios
    if (!isRequired(equipmentData.name)) {
        errors.push('El nombre del equipo es obligatorio');
    }
    if (!isRequired(equipmentData.location_id)) {
        errors.push('El ID de la ubicación es obligatorio');
    }
    
    // Validaciones de longitud
    if (!isValidLength(equipmentData.name, 100)) {
        errors.push('El nombre del equipo no puede exceder 100 caracteres');
    }
    if (!isValidLength(equipmentData.type, 50)) {
        errors.push('El tipo no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.brand, 50)) {
        errors.push('La marca no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.model, 50)) {
        errors.push('El modelo no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.serial_number, 50)) {
        errors.push('El número de serie no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.notes, 500)) {
        errors.push('Las notas no pueden exceder 500 caracteres');
    }
    
    // Validar que location_id sea un número
    if (equipmentData.location_id && isNaN(parseInt(equipmentData.location_id, 10))) {
        errors.push('El ID de la ubicación debe ser un número válido');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validadores para actualizaciones (PUT) - campos obligatorios no son requeridos
const validateClientUpdate = (clientData) => {
    const errors = [];
    
    // Solo validaciones de formato y longitud, no campos obligatorios
    if (clientData.rut && !isValidRUT(clientData.rut)) {
        errors.push('El formato del RUT no es válido (ej: 12345678-9)');
    }
    if (clientData.email && !isValidEmail(clientData.email)) {
        errors.push('El formato del email no es válido');
    }
    if (clientData.phone && !isValidPhone(clientData.phone)) {
        errors.push('El formato del teléfono no es válido');
    }
    
    // Validaciones de longitud
    if (!isValidLength(clientData.name, 100)) {
        errors.push('El nombre comercial no puede exceder 100 caracteres');
    }
    if (!isValidLength(clientData.legal_name, 150)) {
        errors.push('La razón social no puede exceder 150 caracteres');
    }
    if (!isValidLength(clientData.address, 200)) {
        errors.push('La dirección no puede exceder 200 caracteres');
    }
    if (!isValidLength(clientData.business_activity, 100)) {
        errors.push('El giro no puede exceder 100 caracteres');
    }
    if (!isValidLength(clientData.contact_name, 100)) {
        errors.push('El nombre de contacto no puede exceder 100 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateLocationUpdate = (locationData) => {
    const errors = [];
    
    // Solo validaciones de longitud, no campos obligatorios
    if (!isValidLength(locationData.name, 100)) {
        errors.push('El nombre de la sede no puede exceder 100 caracteres');
    }
    if (!isValidLength(locationData.address, 200)) {
        errors.push('La dirección no puede exceder 200 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateEquipmentUpdate = (equipmentData) => {
    const errors = [];
    
    // Solo validaciones de longitud, no campos obligatorios
    if (!isValidLength(equipmentData.name, 100)) {
        errors.push('El nombre del equipo no puede exceder 100 caracteres');
    }
    if (!isValidLength(equipmentData.type, 50)) {
        errors.push('El tipo no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.brand, 50)) {
        errors.push('La marca no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.model, 50)) {
        errors.push('El modelo no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.serial_number, 50)) {
        errors.push('El número de serie no puede exceder 50 caracteres');
    }
    if (!isValidLength(equipmentData.notes, 500)) {
        errors.push('Las notas no pueden exceder 500 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateClient,
    validateLocation,
    validateEquipment,
    validateClientUpdate,
    validateLocationUpdate,
    validateEquipmentUpdate,
    isValidEmail,
    isValidRUT,
    isValidPhone,
    isValidLength,
    isRequired
}; 