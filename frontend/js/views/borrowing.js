import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let activeTab = 'pending'; // 'pending' | 'active' | 'overdue' | 'returned'

export async function renderBorrowing() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';

  // Sync overdue status first
  await api.get('/borrowing/sync-overdue').catch(() => {});

  const allRecords = await api.get('/borrowing');

  const pendingList = allRecords.filter(r => r.status === 'Pending');
  const activeList = allRecords.filter(r => r.status === 'Approved');
  const overdueList = allRecords.filter(r => r.status === 'Overdue');
  const returnedList = allRecords.filter(r => r.status === 'Returned' || r.status === 'Rejected');

  // If user is Student/Faculty, default to active or pending
  let currentList = [];
  if (activeTab === 'pending') currentList = pendingList;
  else if (activeTab === 'active') currentList = activeList;
  else if (activeTab === 'overdue') currentList = overdueList;
  else if (activeTab === 'returned') currentList = returnedList;

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Title & Overdue Sync -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
            ${isStaffOrAdmin ? 'Borrowing, Approvals & Equipment Returns' : 'My Equipment Loans & Requests'}
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            ${isStaffOrAdmin ? 'Institutional borrowing approvals, due-date tracking, return condition logging, and damage routing' : 'Track your active laboratory equipment borrowings, due dates, and request statuses'}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-sync-overdue" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition-colors">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Sync Overdue Status
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button data-borrow-tab="pending" class="tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'pending' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          Pending Approvals
          ${pendingList.length > 0 ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">${pendingList.length}</span>` : ''}
        </button>
        <button data-borrow-tab="active" class="tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'active' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          Active Loans
          <span class="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">${activeList.length}</span>
        </button>
        <button data-borrow-tab="overdue" class="tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'overdue' ? 'border-rose-700 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          Overdue Equipment
          ${overdueList.length > 0 ? `<span class="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">${overdueList.length}</span>` : ''}
        </button>
        <button data-borrow-tab="returned" class="tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'returned' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          Completed / Returned History
          <span class="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">${returnedList.length}</span>
        </button>
      </div>

      <!-- Tab Content Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Asset Details</th>
              <th>Requester</th>
              <th>Duration</th>
              <th>Status</th>
              ${activeTab === 'active' || activeTab === 'overdue' ? '<th>Due Date</th>' : ''}
              ${activeTab === 'returned' ? '<th>Returned Condition</th>' : ''}
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${currentList.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                  No records in this category.
                </td>
              </tr>
            ` : currentList.map(r => {
              const statusBadgeClass = {
                'Pending': 'badge-pending',
                'Approved': 'badge-borrowed',
                'Overdue': 'badge-overdue',
                'Returned': 'badge-available',
                'Rejected': 'badge-retired',
              }[r.status] || 'badge-retired';

              return `
                <tr class="${r.is_overdue ? 'bg-rose-50/50' : ''}">
                  <td class="font-mono text-xs font-semibold text-slate-700">
                    ${r.request_code}
                    <div class="text-[10px] text-slate-400 font-normal">${r.request_date ? r.request_date.slice(0, 10) : ''}</div>
                  </td>
                  <td>
                    <div class="font-bold text-slate-900">${r.asset_name}</div>
                    <div class="text-[11px] text-slate-500 font-mono">${r.asset_code} | ${r.department_name || ''}</div>
                    <div class="text-[11px] text-slate-600 mt-1 italic line-clamp-1">"${r.intended_purpose}"</div>
                  </td>
                  <td>
                    <div class="font-semibold text-slate-900 text-xs">${r.user_full_name}</div>
                    <div class="text-[11px] text-slate-500">${r.user_email}</div>
                    <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">${r.user_role}</span>
                  </td>
                  <td class="text-xs text-slate-700 font-medium">
                    ${r.duration_days} days
                  </td>
                  <td>
                    <span class="badge ${statusBadgeClass}">${r.status}</span>
                    ${r.user_reported_problem ? `
                      <div class="text-[10px] text-rose-700 font-semibold mt-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Problem Reported: "${r.user_reported_problem}"
                      </div>
                    ` : ''}
                  </td>
                  ${activeTab === 'active' || activeTab === 'overdue' ? `
                    <td class="text-xs font-semibold ${r.is_overdue ? 'text-rose-700 font-bold' : 'text-slate-900'}">
                      ${r.due_date ? r.due_date.slice(0, 10) : '—'}
                    </td>
                  ` : ''}
                  ${activeTab === 'returned' ? `
                    <td class="text-xs">
                      ${r.returned_condition ? `
                        <span class="font-semibold ${r.returned_condition === 'Good' ? 'text-emerald-700' : 'text-rose-700'}">
                          ${r.returned_condition}
                        </span>
                        ${r.return_notes ? `<div class="text-[11px] text-slate-500">${r.return_notes}</div>` : ''}
                      ` : (r.rejection_reason ? `<span class="text-rose-600">Rejected: ${r.rejection_reason}</span>` : '—')}
                    </td>
                  ` : ''}
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                      <!-- Lab Staff Review Buttons for Pending Requests -->
                      ${isStaffOrAdmin && r.status === 'Pending' ? `
                        <button data-approve-id="${r.id}" data-asset-name="${r.asset_name}" class="btn-approve-req px-2.5 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold transition-colors shadow-xs">
                          Approve & Issue
                        </button>
                        <button data-reject-id="${r.id}" data-asset-name="${r.asset_name}" class="btn-reject-req px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold transition-colors">
                          Reject
                        </button>
                      ` : ''}

                      <!-- Lab Staff Record Return for Active/Overdue Loans -->
                      ${isStaffOrAdmin && (r.status === 'Approved' || r.status === 'Overdue') ? `
                        <button data-return-id="${r.id}" data-asset-name="${r.asset_name}" data-asset-id="${r.asset_id}" class="btn-record-return px-3 py-1 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold transition-colors shadow-xs">
                          Record Return
                        </button>
                      ` : ''}

                      <!-- Student Report Problem for active loans -->
                      ${!isStaffOrAdmin && (r.status === 'Approved' || r.status === 'Overdue') ? `
                        <button data-report-id="${r.id}" data-asset-name="${r.asset_name}" class="btn-report-problem px-2.5 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded font-semibold transition-colors">
                          Report Issue
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachBorrowingListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-borrow-tab');
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  });

  // Sync Overdue Status
  const syncBtn = document.getElementById('btn-sync-overdue');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      try {
        await api.get('/borrowing/sync-overdue');
        showToast('Overdue status synchronized against institutional clock.', 'info');
        window.dispatchEvent(new CustomEvent('view:reload'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Approve Request
  document.querySelectorAll('.btn-approve-req').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-approve-id');
      const assetName = btn.getAttribute('data-asset-name');

      if (!confirm(`Confirm equipment issue for "${assetName}"? This will mark the asset as Borrowed and set the return due date.`)) {
        return;
      }

      try {
        await api.post(`/borrowing/requests/${reqId}/approve`, {});
        showToast(`Request approved. Equipment issued to user.`, 'success');
        window.dispatchEvent(new CustomEvent('view:reload'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Reject Request
  document.querySelectorAll('.btn-reject-req').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.getAttribute('data-reject-id');
      const assetName = btn.getAttribute('data-asset-name');

      openModal({
        title: `Reject Request: ${assetName}`,
        content: `
          <form id="reject-req-form" class="space-y-4">
            <p class="text-xs text-slate-600">Provide an institutional reason for rejecting this loan request. The asset will be restored to Available.</p>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason *</label>
              <textarea id="rej-reason" required rows="3" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Asset reserved for upcoming practical examination; please select an alternative model..."></textarea>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold shadow-xs">Confirm Rejection</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('reject-req-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post(`/borrowing/requests/${reqId}/reject`, {
            rejection_reason: document.getElementById('rej-reason').value.trim(),
          });
          closeModal();
          showToast('Request rejected and asset restored to Available.', 'info');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });

  // Record Return Modal (CRITICAL WORKFLOW)
  document.querySelectorAll('.btn-record-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.getAttribute('data-return-id');
      const assetName = btn.getAttribute('data-asset-name');
      const assetId = btn.getAttribute('data-asset-id');

      openModal({
        title: `Record Equipment Return: ${assetName}`,
        maxWidth: 'max-w-xl',
        content: `
          <form id="record-return-form" class="space-y-4">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 leading-relaxed">
              <strong>Staff Physical Inspection:</strong> Inspect the physical chassis, power cord, accessories, and functional readiness before accepting return.
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Returned Physical Condition *</label>
              <select id="ret-condition" required class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Good" selected>Good — Clean, intact, all accessories verified</option>
                <option value="Minor Damage">Minor Damage — Scratched casing, worn cables</option>
                <option value="Major Damage">Major Damage — Cracked screen, missing parts, error code</option>
                <option value="Damaged">Damaged — Inoperable, requires repair</option>
              </select>
            </div>

            <div id="damage-warning-box" class="hidden p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 leading-relaxed">
              <strong>Notice:</strong> Selecting damage will mark the physical asset as <span class="font-bold underline">DAMAGED</span>. It will be immediately locked from further borrowing until a maintenance repair ticket is completed and manually certified ready.
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Return Inspection Notes</label>
              <textarea id="ret-notes" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Verified accessories, probes, tested on bench..."></textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Complete Return</button>
            </div>
          </form>
        `,
      });

      const condSelect = document.getElementById('ret-condition');
      const warningBox = document.getElementById('damage-warning-box');
      condSelect.addEventListener('change', () => {
        if (condSelect.value !== 'Good') {
          warningBox.classList.remove('hidden');
        } else {
          warningBox.classList.add('hidden');
        }
      });

      const form = document.getElementById('record-return-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const condition = condSelect.value;
        const notes = document.getElementById('ret-notes').value.trim();

        try {
          await api.post(`/borrowing/requests/${reqId}/return`, {
            returned_condition: condition,
            return_notes: notes || null,
          });
          closeModal();
          if (condition === 'Good') {
            showToast('Return recorded. Asset is now Available for checkout.', 'success');
          } else {
            showToast(`Return recorded with damage (${condition}). Asset flagged DAMAGED.`, 'warning');
          }
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}
