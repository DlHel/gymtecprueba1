import { API_BASE_URL, TOKEN_KEY } from '../config/constants';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    // Token expirado - redirigir a login
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    return response;
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.authenticatedFetch(endpoint);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('❌ API GET Error:', { endpoint, error });
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await this.authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('❌ API POST Error:', { endpoint, data, error });
      throw error;
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await this.authenticatedFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('❌ API PUT Error:', { endpoint, data, error });
      throw error;
    }
  }

  async delete(endpoint: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(endpoint, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ API DELETE Error:', { endpoint, error });
      throw error;
    }
  }
}

export const apiService = new ApiService();
