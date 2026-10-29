import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let statusFilter = '';

export async function renderMaintenance() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';
  if (!isStaffOrAdmin) {
    return `
      <div class="p-6 max-w-4xl mx-auto">
        <div class="p-6 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm">
          Maintenance pipelines and hardware calibration records are accessible to laboratory staff and institutional administrators.
        </div>
      </div>
    `;
  }

  const records = await api.get('/maintenance', { status: statusFilter });

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Title & Header Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Laboratory Maintenance & Calibration</h1>
          <p class="text-xs text-slate-500 mt-0.5">Asset servicing, defect repair pipeline, technician logs, and physical readiness verification</p>
        </div>
        <button id="btn-create-maintenance" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Open Maintenance Ticket
        </button>
      </div>

      <!-- Critical Rule Banner -->
      <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
        <svg class="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        <div class="text-xs text-purple-900 leading-relaxed">
          <strong class="font-bold">Institutional Safety Protocol:</strong> Marking maintenance work as "Completed" does <span class="font-semibold underline">NOT</span> automatically restore the asset to Available status. A designated laboratory staff member must physically test the device and click <span class="font-bold">"Verify & Release to Available"</span> to confirm it is safe for institutional use.
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar bg-white shadow-xs">
        <span class="text-xs font-semibold text-slate-700">Filter Status:</span>
        <select id="maint-status-filter" class="filter-input text-xs">
          <option value="">All Tickets</option>
          <option value="Pending" ${statusFilter === 'Pending' ? 'selected' : ''}>Pending (Unserviced)</option>
          <option value="In Progress" ${statusFilter === 'In Progress' ? 'selected' : ''}>In Progress (In Lab/Vendor)</option>
          <option value="Completed" ${statusFilter === 'Completed' ? 'selected' : ''}>Completed (Awaiting Verification or Released)</option>
        </select>
        <button id="btn-clear-maint-filter" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium">
          Reset Filter
        </button>
      </div>

      <!-- Maintenance Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Ticket Code</th>
              <th>Asset Information</th>
              <th>Reported Issue / Scope</th>
              <th>Date Reported</th>
              <th>Work Status</th>
              <th>Technician / Cost</th>
              <th>Readiness Verification</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                  No maintenance tickets found.
                </td>
              </tr>
            ` : records.map(m => `
              <tr class="${m.status === 'Completed' && !m.is_ready_for_use ? 'bg-amber-50/40' : ''}">
                <td class="font-mono text-xs font-semibold text-slate-700">
                  ${m.ticket_code}
                </td>
                <td>
                  <div class="font-bold text-slate-900">${m.asset_name}</div>
                  <div class="text-[11px] text-slate-500 font-mono">${m.asset_code} | ${m.department_name || ''}</div>
                </td>
                <td class="max-w-xs">
                  <div class="text-xs text-slate-800 font-medium">${m.reason}</div>
                  ${m.work_description ? `<div class="text-[11px] text-slate-500 mt-1 line-clamp-2">Done: ${m.work_description}</div>` : ''}
                </td>
                <td class="text-xs text-slate-500">
                  ${m.date_reported ? m.date_reported.slice(0, 10) : '—'}
                </td>
                <td>
                  <span class="badge ${m.status === 'Completed' ? 'badge-available' : m.status === 'In Progress' ? 'badge-maintenance' : 'badge-pending'}">
                    ${m.status}
                  </span>
                </td>
                <td>
                  <div class="text-xs text-slate-800 font-medium">${m.technician_name || 'Internal'}</div>
                  <div class="text-[11px] text-slate-500 font-mono">₹${m.cost ? m.cost.toLocaleString() : '0.00'}</div>
                </td>
                <td>
                  ${m.is_ready_for_use ? `
                    <span class="badge badge-available">
                      <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                      Verified Ready
                    </span>
                    <div class="text-[10px] text-slate-500 mt-0.5">By: ${m.verified_by_name || 'Staff'}</div>
                  ` : `
                    <span class="badge ${m.status === 'Completed' ? 'badge-pending' : 'badge-retired'}">
                      Pending Staff Release
                    </span>
                  `}
                </td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5">
                    <!-- Update Progress Button -->
                    <button data-update-id="${m.id}" data-ticket="${m.ticket_code}" class="btn-update-maint px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-medium transition-colors">
                      Update Log
                    </button>

                    <!-- Manual Verification Release Button (Only visible if Completed and not yet ready) -->
                    ${m.status === 'Completed' && !m.is_ready_for_use ? `
                      <button data-ready-id="${m.id}" data-asset-name="${m.asset_name}" class="btn-confirm-ready px-2.5 py-1 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded font-bold shadow-xs transition-colors">
                        ✓ Verify & Release
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachMaintenanceListeners() {
  const filterSelect = document.getElementById('maint-status-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  const clearBtn = document.getElementById('btn-clear-maint-filter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      statusFilter = '';
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // Open Maintenance Ticket Modal
  const createBtn = document.getElementById('btn-create-maintenance');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const assets = await api.get('/assets');
      // Filter out assets that are actively borrowed
      const eligibleAssets = assets.filter(a => a.status !== 'Borrowed' && a.status !== 'Pending Request');

      openModal({
        title: 'Open New Maintenance / Calibration Ticket',
        maxWidth: 'max-w-xl',
        content: `
          <form id="create-maint-form" class="space-y-4">
            <p class="text-xs text-slate-600">
              Opening a ticket flags the asset status as <span class="font-bold text-purple-700">Under Maintenance</span> and locks it from student borrowing until servicing is complete and verified.
            </p>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Target Asset *</label>
              <select id="maint-asset-id" required class="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="" disabled selected>Select an asset...</option>
                ${eligibleAssets.map(a => `<option value="${a.id}">${a.asset_code} - ${a.name} (${a.department_code || ''}, Current: ${a.status})</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reason / Defect Description *</label>
              <textarea id="maint-reason" required rows="3" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Describe symptoms, error codes, damage, or scheduled annual calibration scope..."></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Service Vendor / Technician</label>
                <input type="text" id="maint-tech" placeholder="e.g. Internal Staff, OEM Service Center" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                <input type="number" id="maint-cost" min="0" step="0.01" value="0.00" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded font-semibold shadow-xs">Open Ticket</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('create-maint-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/maintenance', {
            asset_id: parseInt(document.getElementById('maint-asset-id').value, 10),
            reason: document.getElementById('maint-reason').value.trim(),
            technician_name: document.getElementById('maint-tech').value.trim() || null,
            cost: parseFloat(document.getElementById('maint-cost').value) || 0,
          });
          closeModal();
          showToast('Maintenance ticket opened. Asset marked Under Maintenance.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  // Update Maintenance Log
  document.querySelectorAll('.btn-update-maint').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordId = btn.getAttribute('data-update-id');
      const ticket = btn.getAttribute('data-ticket');
      const records = await api.get('/maintenance');
      const rec = records.find(r => r.id == recordId);
      if (!rec) return;

      openModal({
        title: `Update Maintenance Log: ${ticket}`,
        maxWidth: 'max-w-xl',
        content: `
          <form id="update-maint-form" class="space-y-4">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
              <div class="font-bold text-slate-900">${rec.asset_name} (${rec.asset_code})</div>
              <div class="text-slate-600 mt-1 italic font-medium">Reason: "${rec.reason}"</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Maintenance Status *</label>
                <select id="upd-status" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Pending" ${rec.status === 'Pending' ? 'selected' : ''}>Pending (Unserviced)</option>
                  <option value="In Progress" ${rec.status === 'In Progress' ? 'selected' : ''}>In Progress (Servicing)</option>
                  <option value="Completed" ${rec.status === 'Completed' ? 'selected' : ''}>Completed (Work Done)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Service Date</label>
                <input type="date" id="upd-date" value="${rec.service_date || ''}" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Description of Work Performed</label>
              <textarea id="upd-work" rows="3" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Components replaced, calibration tests completed, diagnostics run...">${rec.work_description || ''}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Service Cost (₹)</label>
                <input type="number" id="upd-cost" step="0.01" value="${rec.cost || 0}" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Technician / Vendor</label>
                <input type="text" id="upd-tech" value="${rec.technician_name || ''}" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900">
              <strong>Reminder:</strong> Setting status to 'Completed' will update the work record, but the asset remains unavailable until staff explicitly executes the physical verification step.
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Save Update</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('update-maint-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.put(`/maintenance/${recordId}`, {
            status: document.getElementById('upd-status').value,
            service_date: document.getElementById('upd-date').value || null,
            work_description: document.getElementById('upd-work').value.trim() || null,
            cost: parseFloat(document.getElementById('upd-cost').value) || 0,
            technician_name: document.getElementById('upd-tech').value.trim() || null,
          });
          closeModal();
          showToast('Maintenance record updated successfully.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });

  // Confirm Asset Ready (CRITICAL STEP)
  document.querySelectorAll('.btn-confirm-ready').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordId = btn.getAttribute('data-ready-id');
      const assetName = btn.getAttribute('data-asset-name');

      if (!confirm(`Confirm that "${assetName}" has been physically inspected, tested, and is now ready for institutional borrowing?`)) {
        return;
      }

      try {
        await api.post(`/maintenance/${recordId}/confirm-ready`, {});
        showToast(`Asset "${assetName}" certified ready and restored to Available status.`, 'success');
        window.dispatchEvent(new CustomEvent('view:reload'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
