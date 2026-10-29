// AssetIQ Central API Client

const API_BASE = 'https://assetiq-1-qkz0.onrender.com/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('assetiq_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('assetiq_token', token);
    } else {
      localStorage.removeItem('assetiq_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('assetiq_token');
  }

  async request(endpoint, options = {}) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    
    // Add query parameters if present
    if (options.params) {
      Object.keys(options.params).forEach((key) => {
        const val = options.params[key];
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, val);
        }
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url.toString(), config);

      if (response.status === 401) {
        // Token expired or invalid
        this.setToken(null);
        localStorage.removeItem('assetiq_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Your session has expired. Please log in again.');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = (data && data.detail) || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  }

  get(endpoint, params = null) {
    return this.request(endpoint, { method: 'GET', params });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PATCH', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
