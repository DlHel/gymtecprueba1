/**
 * GYMTEC ERP - Clases de Error Estándar
 * 
 * REGLA: Usar estas clases para errores en servicios y repositorios.
 * El error handler global las captura y responde apropiadamente.
 */

/**
 * Error base de la aplicación
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error de validación (400)
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

/**
 * Error de autenticación (401)
 */
class AuthenticationError extends AppError {
    constructor(message = 'No autenticado') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Error de autorización (403)
 */
class AuthorizationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

/**
 * Error de recurso no encontrado (404)
 */
class NotFoundError extends AppError {
    constructor(resource = 'Recurso') {
        super(`${resource} no encontrado`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

/**
 * Error de conflicto (409)
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * Error de base de datos (500)
 */
class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    DatabaseError
};
