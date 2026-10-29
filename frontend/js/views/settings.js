import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';

export async function renderSettings() {
  const user = auth.getUser();
  if (!user || user.role !== 'ADMIN') {
    return '<div class="p-6 text-sm text-rose-600">Access denied: Admin role required.</div>';
  }

  const settings = await api.get('/settings');

  return `
    <div class="p-6 max-w-4xl mx-auto space-y-6">
      <div class="pb-2 border-b border-slate-200">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Borrowing Rules & Limits</h1>
        <p class="text-xs text-slate-500 mt-0.5">Configure institute-wide constraints on equipment checkout duration and concurrent active loans</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
        <form id="settings-form" class="space-y-6">
          <div class="space-y-4">
            <!-- Max Active Assets -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-bold text-slate-900">Maximum Concurrent Active Loans per User</label>
                <p class="text-xs text-slate-500 max-w-lg leading-relaxed">
                  Defines the maximum number of laboratory assets a student or faculty member can borrow simultaneously. 
                  Requests beyond this limit are rejected by the system with a return reminder.
                </p>
              </div>
              <div class="w-32 flex-shrink-0">
                <input type="number" id="setting-max-assets" min="1" max="15" value="${settings.max_active_assets}" required class="w-full text-sm p-2 border border-slate-300 rounded font-bold text-center text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <!-- Max Borrowing Duration -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-bold text-slate-900">Maximum Allowable Borrowing Duration (Days)</label>
                <p class="text-xs text-slate-500 max-w-lg leading-relaxed">
                  The maximum number of days a single borrowing request can span. 
                  Users cannot enter a duration exceeding this parameter during submission.
                </p>
              </div>
              <div class="w-32 flex-shrink-0">
                <input type="number" id="setting-max-days" min="1" max="45" value="${settings.max_borrowing_days}" required class="w-full text-sm p-2 border border-slate-300 rounded font-bold text-center text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span class="text-xs text-slate-400">
              Last configured: ${settings.updated_at ? settings.updated_at.slice(0, 16).replace('T', ' ') : 'Default baseline'}
            </span>
            <button type="submit" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-md shadow-xs transition-colors">
              Save Institutional Limits
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function attachSettingsListeners() {
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const maxAssets = parseInt(document.getElementById('setting-max-assets').value, 10);
      const maxDays = parseInt(document.getElementById('setting-max-days').value, 10);

      try {
        await api.put('/settings', {
          max_active_assets: maxAssets,
          max_borrowing_days: maxDays,
        });
        showToast('Institutional borrowing limits saved and updated across system.', 'success');
        window.dispatchEvent(new CustomEvent('view:reload'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}
