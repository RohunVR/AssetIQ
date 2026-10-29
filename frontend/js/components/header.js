import { auth } from '../auth.js';
import { api } from '../api.js';

export async function renderHeader(pageTitle = 'Dashboard') {
  const user = auth.getUser();
  if (!user) return '';

  let alerts = [];
  try {
    alerts = await api.get('/alerts');
  } catch (e) {
    alerts = [];
  }

  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const totalAlerts = alerts.length;

  const rolePill = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-300',
    LAB_STAFF: 'bg-purple-100 text-purple-800 border-purple-300',
    FACULTY: 'bg-blue-100 text-blue-800 border-blue-300',
    STUDENT: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  }[user.role] || 'bg-slate-100 text-slate-800 border-slate-300';

  return `
    <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <!-- Left: Title & Department Breadcrumb -->
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-bold text-slate-900 tracking-tight" id="topbar-page-title">${pageTitle}</h2>
        <span class="text-slate-300">|</span>
        <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          ${user.department_name || 'Central Administration'}
        </span>
      </div>

      <!-- Right: Alerts Bell, User Profile -->
      <div class="flex items-center gap-4">
        <!-- Rule-Based Alerts Bell Popover -->
        <div class="relative" id="notifications-wrapper">
          <button id="alerts-toggle-btn" class="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="System Alerts">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            ${totalAlerts > 0 ? `
              <span class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full ${dangerCount > 0 ? 'bg-rose-600' : 'bg-amber-500'} text-[10px] font-bold text-white">
                ${totalAlerts}
              </span>
            ` : ''}
          </button>

          <!-- Alerts Dropdown Menu -->
          <div id="alerts-dropdown" class="hidden absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Rule-Based System Alerts</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">${totalAlerts} Active</span>
            </div>
            <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
              ${alerts.length === 0 ? `
                <div class="p-4 text-center text-xs text-slate-500">No active alerts. All systems normal.</div>
              ` : alerts.map(a => `
                <div class="p-3 hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="w-2 h-2 rounded-full ${a.severity === 'danger' ? 'bg-rose-600' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
                    <span class="text-xs font-semibold text-slate-900">${a.title}</span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed">${a.message}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- User Role Tag -->
        <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${rolePill} tracking-wide">
          ${user.role}
        </span>
      </div>
    </header>
  `;
}
