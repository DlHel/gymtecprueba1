import { API_BASE_URL } from '../config/constants';

class AuthService {
  private baseUrl = `${API_BASE_URL}/api/auth`;

  async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en el login' }));
        throw new Error(error.message || 'Error en el login');
      }

      return response.json();
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  async validateToken(token: string) {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Token validation error:', error);
      throw error;
    }
  }

  async register(userData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en el registro' }));
        throw new Error(error.message || 'Error en el registro');
      }

      return response.json();
    } catch (error) {
      console.error('Register service error:', error);
      throw error;
    }
  }

  async refreshToken(token: string) {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      return response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
