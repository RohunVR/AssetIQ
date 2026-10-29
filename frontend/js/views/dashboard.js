import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export async function renderDashboard() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  let data = null;
  try {
    data = await api.get('/dashboard');
  } catch (err) {
    return `<div class="p-6 text-rose-600">Failed to load dashboard: ${err.message}</div>`;
  }

  const statCardsHtml = (data.stat_cards || []).map(card => `
    <div class="stat-card color-${card.color}">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${card.title}</span>
        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">${card.badge || ''}</span>
      </div>
      <div class="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">${card.value}</div>
    </div>
  `).join('');

  const urgentAlertsHtml = (data.urgent_alerts || []).length > 0 ? `
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          Priority Rule-Based System Alerts
        </h3>
        <span class="text-xs text-slate-500 font-medium">Automatic system triggers</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${data.urgent_alerts.slice(0, 3).map(a => `
          <div class="p-4 rounded-lg border ${a.severity === 'danger' ? 'bg-rose-50/70 border-rose-200 text-rose-900' : a.severity === 'warning' ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-blue-50/70 border-blue-200 text-blue-900'}">
            <div class="flex items-center gap-2 mb-1.5 font-bold text-xs">
              <span class="w-2 h-2 rounded-full ${a.severity === 'danger' ? 'bg-rose-600' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
              ${a.title}
            </div>
            <p class="text-xs leading-relaxed opacity-90">${a.message}</p>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Role specific content
  let roleContentHtml = '';

  if (user.role === 'ADMIN' || user.role === 'LAB_STAFF') {
    const recentReqs = data.recent_requests || [];
    roleContentHtml = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Requests Queue -->
        <div class="lg:col-span-2 table-container">
          <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider">Recent Borrowing Activity</h3>
            <a href="#/borrowing" class="text-xs text-blue-700 hover:text-blue-900 font-semibold">View All &rarr;</a>
          </div>
          <table class="institutional-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Asset</th>
                <th>Requester</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${recentReqs.length === 0 ? `
                <tr><td colspan="5" class="text-center py-6 text-slate-400">No recent borrowing activity found.</td></tr>
              ` : recentReqs.map(r => `
                <tr>
                  <td class="font-mono text-xs font-semibold text-slate-600">${r.request_code}</td>
                  <td class="font-medium text-slate-900">${r.asset_name}</td>
                  <td class="text-slate-700">${r.user_name}</td>
                  <td>
                    <span class="badge ${r.status === 'Approved' ? 'badge-borrowed' : r.status === 'Pending' ? 'badge-pending' : r.status === 'Overdue' ? 'badge-overdue' : 'badge-retired'}">
                      ${r.status}
                    </span>
                  </td>
                  <td class="text-xs text-slate-500">${r.request_date}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Quick System Rules & Info Box -->
        <div class="space-y-6">
          <div class="p-5 bg-white border border-slate-200 rounded-lg shadow-xs">
            <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Active Institutional Rules
            </h3>
            <div class="space-y-3 text-xs text-slate-600">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Max Active Loans per User:</span>
                <span class="font-bold font-mono text-slate-900">${data.limits?.max_active_assets || 3} assets</span>
              </div>
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Max Borrowing Duration:</span>
                <span class="font-bold font-mono text-slate-900">${data.limits?.max_borrowing_days || 7} days</span>
              </div>
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Maintenance Release:</span>
                <span class="font-semibold text-purple-700">Manual Verification Required</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Cross-Dept Asset Visibility:</span>
                <span class="font-semibold text-emerald-700">Enabled (Open Catalog)</span>
              </div>
            </div>
            ${user.role === 'ADMIN' ? `
              <div class="mt-4 pt-3 border-t border-slate-100">
                <a href="#/settings" class="inline-block text-xs font-semibold text-blue-700 hover:underline">
                  Configure Institutional Limits &rarr;
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Quick Navigation Cards -->
          <div class="p-5 bg-slate-900 text-white rounded-lg shadow-sm">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Staff Quick Actions</h4>
            <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
              <a href="#/assets" class="p-2.5 bg-slate-800 hover:bg-slate-750 rounded text-center font-medium border border-slate-700/80 transition-colors">
                + Register Asset
              </a>
              <a href="#/inventory" class="p-2.5 bg-slate-800 hover:bg-slate-750 rounded text-center font-medium border border-slate-700/80 transition-colors">
                Receive Stock
              </a>
              <a href="#/borrowing" class="p-2.5 bg-slate-800 hover:bg-slate-750 rounded text-center font-medium border border-slate-700/80 transition-colors">
                Approve Requests
              </a>
              <a href="#/maintenance" class="p-2.5 bg-slate-800 hover:bg-slate-750 rounded text-center font-medium border border-slate-700/80 transition-colors">
                Maintenance
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // STUDENT or FACULTY
    const activeLoans = data.active_loans || [];
    roleContentHtml = `
      <div class="space-y-6">
        <!-- Active Borrowings Table -->
        <div class="table-container">
          <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider">My Current Borrowed Equipment</h3>
            <a href="#/assets" class="text-xs bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3 py-1.5 rounded-md transition-colors shadow-xs">
              + Browse & Request Equipment
            </a>
          </div>
          <table class="institutional-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Asset Code</th>
                <th>Equipment Name</th>
                <th>Department</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeLoans.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center py-8 text-slate-400">
                    You currently have no borrowed equipment. 
                    <a href="#/assets" class="text-blue-600 font-semibold hover:underline ml-1">Browse laboratory assets</a> to submit a request.
                  </td>
                </tr>
              ` : activeLoans.map(l => `
                <tr class="${l.is_overdue ? 'bg-rose-50/50' : ''}">
                  <td class="font-mono text-xs text-slate-500">${l.request_code}</td>
                  <td class="font-mono text-xs font-semibold text-slate-800">${l.asset_code}</td>
                  <td class="font-medium text-slate-900">${l.asset_name}</td>
                  <td class="text-xs text-slate-600">${l.department}</td>
                  <td class="text-xs font-semibold ${l.is_overdue ? 'text-rose-700 font-bold' : 'text-slate-800'}">
                    ${l.due_date}
                  </td>
                  <td>
                    <span class="badge ${l.is_overdue ? 'badge-overdue' : 'badge-borrowed'}">
                      ${l.status}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <button data-report-id="${l.id}" data-asset-name="${l.asset_name}" class="btn-report-problem text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                        Report Issue
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Borrowing Guidance Banner -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <svg class="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div class="text-xs text-blue-900 leading-relaxed">
            <span class="font-bold">Institutional Return Instructions:</span>
            Equipment must be returned in person to the respective laboratory technician before the due date. Staff will inspect the physical condition of the device upon handover. If you observe any physical or operational defect, please click <span class="font-semibold underline">Report Issue</span> immediately.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Top Overview Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Dashboard</h1>
          <p class="text-xs text-slate-500 mt-0.5">AssetIQ Real-time Laboratory Resource & Inventory Overview</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-refresh-dashboard" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition-colors">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh Metrics
          </button>
        </div>
      </div>

      <!-- Urgent Alerts Banner (if any) -->
      ${urgentAlertsHtml}

      <!-- Metric Stat Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        ${statCardsHtml}
      </div>

      <!-- Role-Specific Content Area -->
      ${roleContentHtml}
    </div>
  `;
}

export function attachDashboardListeners() {
  const refreshBtn = document.getElementById('btn-refresh-dashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('view:reload'));
      showToast('Dashboard metrics updated.', 'info');
    });
  }

  // Report problem on active loan (for Student/Faculty)
  document.querySelectorAll('.btn-report-problem').forEach(btn => {
    btn.addEventListener('click', () => {
      const requestId = btn.getAttribute('data-report-id');
      const assetName = btn.getAttribute('data-asset-name');

      openModal({
        title: `Report Problem: ${assetName}`,
        content: `
          <form id="report-problem-form" class="space-y-4">
            <p class="text-xs text-slate-600">
              Describe any damage, error code, or malfunction observed while using this equipment. 
              The laboratory in-charge will be notified immediately.
            </p>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Issue Description *</label>
              <textarea id="problem-desc" required rows="4" class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Display backlight flickering, power adapter pin loose..."></textarea>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold shadow-xs">Submit Report</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('report-problem-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('problem-desc').value.trim();
        try {
          await api.post(`/borrowing/requests/${requestId}/report-problem`, {
            problem_description: desc,
          });
          closeModal();
          showToast('Problem report submitted. Lab staff notified.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}
