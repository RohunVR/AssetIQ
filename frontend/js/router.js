import { auth } from './auth.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/toast.js';

// Views
import { renderLogin, attachLoginListeners } from './views/login.js';
import { renderDashboard, attachDashboardListeners } from './views/dashboard.js';
import { renderAssets, attachAssetListeners } from './views/assets.js';
import { renderInventory, attachInventoryListeners } from './views/inventory.js';
import { renderBorrowing, attachBorrowingListeners } from './views/borrowing.js';
import { renderMaintenance, attachMaintenanceListeners } from './views/maintenance.js';
import { renderUsers, attachUserListeners } from './views/users.js';
import { renderDepartments, attachDepartmentListeners } from './views/departments.js';
import { renderSettings, attachSettingsListeners } from './views/settings.js';
import { renderLabAssets, attachLabAssetListeners } from './views/lab-assets.js';
import { renderLibraryAssets, attachLibraryAssetListeners } from './views/library-assets.js';

class Router {
  constructor() {
    this.currentView = null;
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('auth:login', () => this.handleRoute());
    window.addEventListener('auth:logout', () => this.handleRoute());
    window.addEventListener('auth:expired', () => this.handleRoute());
    window.addEventListener('view:reload', () => this.handleRoute());
  }

  async handleRoute() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (!auth.isAuthenticated()) {
      appEl.innerHTML = renderLogin();
      attachLoginListeners();
      return;
    }

    let hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash) hash = 'dashboard';

    const user = auth.getUser();
    const isAdmin = user.role === 'ADMIN';
    const isStaff = user.role === 'LAB_STAFF';

    // Route guard for admin-only pages
    if (['users', 'settings'].includes(hash) && !isAdmin) {
      hash = 'dashboard';
      window.location.hash = '#/dashboard';
    }

    // Route guard for staff/admin only pages
    if (['inventory', 'maintenance'].includes(hash) && !(isAdmin || isStaff)) {
      hash = 'dashboard';
      window.location.hash = '#/dashboard';
    }

    if (hash === 'my-loans') {
      hash = 'borrowing';
    }
    if (hash === 'assets') {
      hash = 'lab-assets';
    }

    const titleMap = {
      dashboard: 'Dashboard Overview',
      'lab-assets': 'Laboratory Assets',
      'library-assets': 'Library Assets',
      assets: 'All Assets Registry',
      inventory: 'Consumables & Component Inventory',
      borrowing: isAdmin || isStaff ? 'Borrowing Approvals & Returns' : 'My Equipment Loans',
      maintenance: 'Maintenance & Calibration',
      users: 'User Authorization Directory',
      departments: 'Departments & Laboratories',
      settings: 'Institutional Borrowing Rules',
    };

    const pageTitle = titleMap[hash] || 'AssetIQ Portal';

    // Render Shell Layout: Sidebar + Topbar + Main Viewport
    appEl.innerHTML = `
      <div class="flex h-screen overflow-hidden bg-slate-100">
        <!-- Persistent Sidebar -->
        ${renderSidebar(hash)}

        <!-- Main Content Column -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Topbar -->
          <div id="header-container"></div>

          <!-- Dynamic View Body -->
          <main class="flex-1 overflow-y-auto bg-slate-50" id="main-view-container">
            <div class="p-8 text-center text-xs text-slate-400">Loading ${pageTitle}...</div>
          </main>
        </div>
      </div>
    `;

    // Render Header asynchronously
    const headerContainer = document.getElementById('header-container');
    headerContainer.innerHTML = await renderHeader(pageTitle);

    // Render Active View
    const mainViewContainer = document.getElementById('main-view-container');
    try {
      if (hash === 'dashboard') {
        mainViewContainer.innerHTML = await renderDashboard();
        attachDashboardListeners();
      } else if (hash === 'lab-assets') {
        mainViewContainer.innerHTML = await renderLabAssets();
        attachLabAssetListeners();
      } else if (hash === 'library-assets') {
        mainViewContainer.innerHTML = await renderLibraryAssets();
        attachLibraryAssetListeners();
      } else if (hash === 'assets') {
        mainViewContainer.innerHTML = await renderAssets();
        attachAssetListeners();
      } else if (hash === 'inventory') {
        mainViewContainer.innerHTML = await renderInventory();
        attachInventoryListeners();
      } else if (hash === 'borrowing') {
        mainViewContainer.innerHTML = await renderBorrowing();
        attachBorrowingListeners();
      } else if (hash === 'maintenance') {
        mainViewContainer.innerHTML = await renderMaintenance();
        attachMaintenanceListeners();
      } else if (hash === 'users') {
        mainViewContainer.innerHTML = await renderUsers();
        attachUserListeners();
      } else if (hash === 'departments') {
        mainViewContainer.innerHTML = await renderDepartments();
        attachDepartmentListeners();
      } else if (hash === 'settings') {
        mainViewContainer.innerHTML = await renderSettings();
        attachSettingsListeners();
      } else {
        mainViewContainer.innerHTML = `<div class="p-6 text-sm text-slate-600">Page not found. <a href="#/dashboard" class="text-blue-600 underline font-semibold">Return to Dashboard</a></div>`;
      }
    } catch (err) {
      mainViewContainer.innerHTML = `
        <div class="p-6 max-w-2xl mx-auto mt-6 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
          <strong class="font-bold">Error loading view:</strong> ${err.message}
          <div class="mt-2">
            <button onclick="window.location.hash='#/dashboard'" class="px-3 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 hover:bg-rose-50">Back to Dashboard</button>
          </div>
        </div>
      `;
    }

    // Attach Topbar & Sidebar global listeners
    this.attachGlobalListeners();
  }

  attachGlobalListeners() {
    // Sidebar Logout
    const sidebarLogout = document.getElementById('sidebar-logout-btn');
    if (sidebarLogout) {
      sidebarLogout.addEventListener('click', () => {
        auth.logout();
      });
    }

    // Notifications Dropdown Toggle
    const alertsBtn = document.getElementById('alerts-toggle-btn');
    const alertsDropdown = document.getElementById('alerts-dropdown');
    if (alertsBtn && alertsDropdown) {
      alertsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alertsDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!alertsDropdown.contains(e.target) && e.target !== alertsBtn) {
          alertsDropdown.classList.add('hidden');
        }
      });
    }
  }
}

export const router = new Router();
