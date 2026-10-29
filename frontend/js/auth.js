import { api } from './api.js';
import { showToast } from './components/toast.js';

class AuthService {
  constructor() {
    this.user = null;
    try {
      const stored = localStorage.getItem('assetiq_user');
      if (stored) {
        this.user = JSON.parse(stored);
      }
    } catch (e) {
      this.user = null;
    }
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.user && !!api.getToken();
  }

  hasRole(roles) {
    if (!this.user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(this.user.role);
    }
    return this.user.role === roles;
  }

  async init() {
    const token = api.getToken();
    if (!token) {
      this.user = null;
      localStorage.removeItem('assetiq_user');
      return null;
    }

    try {
      const user = await api.get('/auth/me');
      this.user = user;
      localStorage.setItem('assetiq_user', JSON.stringify(user));
      return user;
    } catch (err) {
      this.logout(false);
      return null;
    }
  }

  async login(email, password) {
    try {
      const res = await api.post('/auth/login', { email, password });
      api.setToken(res.access_token);
      this.user = res.user;
      localStorage.setItem('assetiq_user', JSON.stringify(res.user));
      window.dispatchEvent(new CustomEvent('auth:login', { detail: res.user }));
      showToast(`Welcome back, ${res.user.full_name}`, 'success');
      return res.user;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  async demoLogin(roleKey) {
    try {
      const res = await api.post('/auth/demo-login', { role: roleKey });
      api.setToken(res.access_token);
      this.user = res.user;
      localStorage.setItem('assetiq_user', JSON.stringify(res.user));
      window.dispatchEvent(new CustomEvent('auth:login', { detail: res.user }));
      showToast(`Switched to demo role: ${res.user.role} (${res.user.full_name})`, 'info');
      return res.user;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  logout(notify = true) {
    api.setToken(null);
    this.user = null;
    localStorage.removeItem('assetiq_user');
    window.dispatchEvent(new CustomEvent('auth:logout'));
    if (notify) {
      showToast('Logged out of AssetIQ successfully.', 'info');
    }
  }
}

export const auth = new AuthService();
