export class ErrorHandler {
  static handle(error: any, context: string = '', userFriendly: boolean = true): string {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.error(`❌ ${context} [${errorId}]:`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToService(error, context, errorId);
    }
    
    // User-friendly error messages
    if (userFriendly) {
      const userMessage = this.getUserMessage(error);
      this.showUserNotification(`${userMessage} (Ref: ${errorId})`, 'error');
    }
    
    return errorId;
  }
  
  static getUserMessage(error: any): string {
    const errorMap: Record<string, string> = {
      'NETWORK_ERROR': 'Problema de conexión. Por favor verifica tu conexión a internet.',
      'AUTH_ERROR': 'Sesión expirada. Por favor inicia sesión nuevamente.',
      'VALIDATION_ERROR': 'Por favor verifica los datos ingresados.',
      'SERVER_ERROR': 'Error del servidor. Por favor intenta más tarde.',
      'TIMEOUT_ERROR': 'Tiempo de espera agotado. Por favor intenta nuevamente.',
      'PERMISSION_ERROR': 'No tienes permisos para realizar esta acción.'
    };
    
    return errorMap[error.code] || 'Ocurrió un error inesperado. Nuestro equipo ha sido notificado.';
  }
  
  static showUserNotification(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
  
  static async logToService(error: any, context: string, errorId: string): Promise<void> {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      });
    } catch (logError) {
      console.warn('Failed to log error to service:', logError);
    }
  }
}
