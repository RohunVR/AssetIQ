import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let filterState = {
  search: '',
  department_id: '',
  laboratory_id: '',
  category: '',
  status: '',
  condition: '',
};

export async function renderAssets() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';

  // Fetch departments, categories, and assets in parallel
  let [assets, departments, categories, settings] = await Promise.all([
    api.get('/assets', filterState),
    api.get('/departments'),
    api.get('/assets/categories'),
    api.get('/settings').catch(() => ({ max_borrowing_days: 7, max_active_assets: 3 })),
  ]);

  const maxDays = settings.max_borrowing_days || 7;
  const maxAssets = settings.max_active_assets || 3;

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Title & Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Laboratory & Institutional Assets</h1>
          <p class="text-xs text-slate-500 mt-0.5">Centralized institutional physical equipment registry across all laboratories</p>
        </div>
        ${isStaffOrAdmin ? `
          <button id="btn-add-asset" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Register New Asset
          </button>
        ` : ''}
      </div>

      <!-- Institutional Filter Toolbar -->
      <div class="filter-bar bg-white shadow-xs">
        <!-- Search -->
        <div class="relative flex-1 min-w-[200px]">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="filter-search" value="${filterState.search}" placeholder="Search asset ID, model, name, serial..." class="filter-input w-full pl-9 pr-3 text-xs">
        </div>

        <!-- Department Filter -->
        <select id="filter-dept" class="filter-input text-xs">
          <option value="">All Departments</option>
          ${departments.map(d => `<option value="${d.id}" ${filterState.department_id == d.id ? 'selected' : ''}>${d.code} - ${d.name}</option>`).join('')}
        </select>

        <!-- Category Filter -->
        <select id="filter-cat" class="filter-input text-xs">
          <option value="">All Categories</option>
          ${categories.map(c => `<option value="${c}" ${filterState.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <!-- Status Filter -->
        <select id="filter-status" class="filter-input text-xs">
          <option value="">All Statuses</option>
          <option value="Available" ${filterState.status === 'Available' ? 'selected' : ''}>Available</option>
          <option value="Pending Request" ${filterState.status === 'Pending Request' ? 'selected' : ''}>Pending Request</option>
          <option value="Borrowed" ${filterState.status === 'Borrowed' ? 'selected' : ''}>Borrowed</option>
          <option value="Overdue" ${filterState.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Under Maintenance" ${filterState.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
          <option value="Damaged" ${filterState.status === 'Damaged' ? 'selected' : ''}>Damaged</option>
          <option value="Retired" ${filterState.status === 'Retired' ? 'selected' : ''}>Retired</option>
        </select>

        <!-- Condition Filter -->
        <select id="filter-cond" class="filter-input text-xs">
          <option value="">All Conditions</option>
          <option value="Good" ${filterState.condition === 'Good' ? 'selected' : ''}>Good</option>
          <option value="Minor Damage" ${filterState.condition === 'Minor Damage' ? 'selected' : ''}>Minor Damage</option>
          <option value="Major Damage" ${filterState.condition === 'Major Damage' ? 'selected' : ''}>Major Damage</option>
          <option value="Damaged" ${filterState.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
        </select>

        <!-- Reset Button -->
        <button id="btn-clear-filters" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium">
          Reset Filters
        </button>
      </div>

      <!-- Assets Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Equipment Name</th>
              <th>Category</th>
              <th>Department / Lab</th>
              <th>Location</th>
              <th>Condition</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${assets.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>No equipment matched your search or filters.</span>
                  </div>
                </td>
              </tr>
            ` : assets.map(a => {
              const statusBadgeClass = {
                'Available': 'badge-available',
                'Pending Request': 'badge-pending',
                'Borrowed': 'badge-borrowed',
                'Overdue': 'badge-overdue',
                'Under Maintenance': 'badge-maintenance',
                'Damaged': 'badge-damaged',
                'Retired': 'badge-retired',
              }[a.status] || 'badge-retired';

              return `
                <tr>
                  <td class="font-mono text-xs font-semibold text-slate-700">${a.asset_code}</td>
                  <td>
                    <div class="font-semibold text-slate-900">${a.name}</div>
                    ${a.model_number ? `<div class="text-[11px] text-slate-500 font-mono">Mod: ${a.model_number}</div>` : ''}
                  </td>
                  <td class="text-xs text-slate-600">${a.category}</td>
                  <td>
                    <div class="text-xs font-medium text-slate-900">${a.department_code || 'N/A'}</div>
                    <div class="text-[11px] text-slate-500">${a.laboratory_name || 'Department Pool'}</div>
                  </td>
                  <td class="text-xs text-slate-500">${a.location || '—'}</td>
                  <td>
                    <span class="text-xs font-medium ${a.condition === 'Good' ? 'text-emerald-700' : 'text-amber-700 font-semibold'}">
                      ${a.condition}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${statusBadgeClass}">${a.status}</span>
                    ${a.current_borrower_name ? `
                      <div class="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]" title="Borrowed by ${a.current_borrower_name}">
                        By: ${a.current_borrower_name}
                      </div>
                    ` : ''}
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                      <!-- Details Button -->
                      <button data-detail-id="${a.id}" class="btn-asset-detail px-2 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium transition-colors">
                        Details
                      </button>

                      <!-- Borrow Button (For Student/Faculty on Available items) -->
                      ${a.status === 'Available' ? `
                        <button data-borrow-id="${a.id}" data-asset-name="${a.name}" data-asset-code="${a.asset_code}" class="btn-borrow-asset px-2.5 py-1 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold transition-colors shadow-xs">
                          Request Loan
                        </button>
                      ` : ''}

                      <!-- Staff Edit Actions -->
                      ${isStaffOrAdmin ? `
                        <button data-edit-id="${a.id}" class="btn-edit-asset p-1 text-slate-500 hover:text-blue-700 rounded transition-colors" title="Edit Asset">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
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

export function attachAssetListeners() {
  // Filter handlers
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filterState.search = e.target.value;
        window.dispatchEvent(new CustomEvent('view:reload'));
      }, 350);
    });
  }

  ['dept', 'cat', 'status', 'cond'].forEach(f => {
    const el = document.getElementById(`filter-${f}`);
    if (el) {
      el.addEventListener('change', (e) => {
        if (f === 'dept') filterState.department_id = e.target.value;
        if (f === 'cat') filterState.category = e.target.value;
        if (f === 'status') filterState.status = e.target.value;
        if (f === 'cond') filterState.condition = e.target.value;
        window.dispatchEvent(new CustomEvent('view:reload'));
      });
    }
  });

  const clearBtn = document.getElementById('btn-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filterState = { search: '', department_id: '', laboratory_id: '', category: '', status: '', condition: '' };
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // View Details Modal
  document.querySelectorAll('.btn-asset-detail').forEach(btn => {
    btn.addEventListener('click', async () => {
      const assetId = btn.getAttribute('data-detail-id');
      try {
        const a = await api.get(`/assets/${assetId}`);
        openModal({
          title: `Asset Record: ${a.asset_code}`,
          maxWidth: 'max-w-2xl',
          content: `
            <div class="space-y-5 text-xs text-slate-700">
              <!-- Top Header Block -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-bold text-slate-900">${a.name}</h4>
                  <p class="text-slate-500 font-mono text-[11px]">Tag ID: ${a.asset_code} | Cat: ${a.category}</p>
                </div>
                <div>
                  <span class="badge ${a.status === 'Available' ? 'badge-available' : a.status === 'Borrowed' ? 'badge-borrowed' : a.status === 'Overdue' ? 'badge-overdue' : 'badge-maintenance'}">
                    ${a.status}
                  </span>
                </div>
              </div>

              <!-- Specifications & Metadata Grid -->
              <div class="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div><span class="font-semibold text-slate-500">Department:</span> ${a.department_name || 'N/A'}</div>
                <div><span class="font-semibold text-slate-500">Laboratory:</span> ${a.laboratory_name || 'Department Central'}</div>
                <div><span class="font-semibold text-slate-500">Storage Location:</span> ${a.location || 'N/A'}</div>
                <div><span class="font-semibold text-slate-500">Physical Condition:</span> <span class="font-semibold text-slate-900">${a.condition}</span></div>
                <div><span class="font-semibold text-slate-500">Serial Number:</span> <span class="font-mono">${a.serial_number || 'N/A'}</span></div>
                <div><span class="font-semibold text-slate-500">Model Number:</span> <span class="font-mono">${a.model_number || 'N/A'}</span></div>
                <div><span class="font-semibold text-slate-500">Purchase Date:</span> ${a.purchase_date || 'N/A'}</div>
                <div><span class="font-semibold text-slate-500">Cost:</span> ₹${a.cost ? a.cost.toLocaleString() : '0.00'}</div>
              </div>

              <!-- Description -->
              <div>
                <span class="font-semibold text-slate-700 block mb-1">Equipment Description & Specifications:</span>
                <p class="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 leading-relaxed">${a.description || 'No description provided.'}</p>
              </div>

              <!-- Recent Borrowing History -->
              <div>
                <span class="font-bold text-slate-900 block mb-1.5 uppercase tracking-wide text-[11px]">Recent Borrowing History:</span>
                <div class="border border-slate-200 rounded-md overflow-hidden">
                  <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th class="p-2">User</th>
                        <th class="p-2">Status</th>
                        <th class="p-2">Issued</th>
                        <th class="p-2">Due Date</th>
                        <th class="p-2">Return Condition</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${(a.borrowing_history || []).length === 0 ? `
                        <tr><td colspan="5" class="p-3 text-center text-slate-400">No borrowing records yet.</td></tr>
                      ` : a.borrowing_history.map(b => `
                        <tr>
                          <td class="p-2 font-medium">${b.user_name}</td>
                          <td class="p-2"><span class="badge ${b.status === 'Approved' ? 'badge-borrowed' : b.status === 'Overdue' ? 'badge-overdue' : 'badge-retired'}">${b.status}</span></td>
                          <td class="p-2 text-slate-500">${b.issued_at ? b.issued_at.slice(0, 10) : '—'}</td>
                          <td class="p-2 font-medium">${b.due_date ? b.due_date.slice(0, 10) : '—'}</td>
                          <td class="p-2">${b.returned_condition || '—'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Maintenance Log -->
              <div>
                <span class="font-bold text-slate-900 block mb-1.5 uppercase tracking-wide text-[11px]">Maintenance & Calibration Log:</span>
                <div class="border border-slate-200 rounded-md overflow-hidden">
                  <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th class="p-2">Ticket</th>
                        <th class="p-2">Reason</th>
                        <th class="p-2">Status</th>
                        <th class="p-2">Technician</th>
                        <th class="p-2">Ready Verified</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${(a.maintenance_history || []).length === 0 ? `
                        <tr><td colspan="5" class="p-3 text-center text-slate-400">No maintenance tickets logged.</td></tr>
                      ` : a.maintenance_history.map(m => `
                        <tr>
                          <td class="p-2 font-mono font-semibold">${m.ticket_code}</td>
                          <td class="p-2">${m.reason}</td>
                          <td class="p-2"><span class="badge badge-maintenance">${m.status}</span></td>
                          <td class="p-2 text-slate-600">${m.technician_name || 'Internal'}</td>
                          <td class="p-2 font-bold ${m.is_ready_for_use ? 'text-emerald-700' : 'text-amber-700'}">${m.is_ready_for_use ? 'Yes (Verified)' : 'Pending Inspection'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-200 flex justify-end">
                <button type="button" class="btn-close-modal px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900">Close</button>
              </div>
            </div>
          `,
        });
        document.querySelector('.btn-close-modal').addEventListener('click', () => closeModal());
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Borrow Equipment Modal
  document.querySelectorAll('.btn-borrow-asset').forEach(btn => {
    btn.addEventListener('click', async () => {
      const assetId = btn.getAttribute('data-borrow-id');
      const assetName = btn.getAttribute('data-asset-name');
      const assetCode = btn.getAttribute('data-asset-code');
      const settings = await api.get('/settings').catch(() => ({ max_borrowing_days: 7, max_active_assets: 3 }));
      const maxDays = settings.max_borrowing_days || 7;

      openModal({
        title: `Submit Borrowing Request`,
        content: `
          <form id="borrow-request-form" class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div class="font-bold text-xs text-blue-900">${assetName}</div>
              <div class="text-[11px] text-blue-700 font-mono">Tag: ${assetCode}</div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Requested Duration (Days) * 
                <span class="text-slate-400 font-normal">(Institutional Limit: max ${maxDays} days)</span>
              </label>
              <input type="number" id="borrow-duration" min="1" max="${maxDays}" value="${Math.min(7, maxDays)}" required class="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Intended Academic Purpose / Project *</label>
              <textarea id="borrow-purpose" required rows="3" class="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Capstone design demonstration, Lab 4 practical exam preparation..."></textarea>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 leading-relaxed">
              <strong>Institutional Policy Note:</strong> Upon submission, the request is routed to laboratory staff for approval. You will receive an issue receipt with a due date. Late returns trigger an automated <span class="text-rose-700 font-bold">OVERDUE</span> status on your student record.
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Submit Request</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('borrow-request-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = parseInt(document.getElementById('borrow-duration').value, 10);
        const purpose = document.getElementById('borrow-purpose').value.trim();

        try {
          await api.post('/borrowing/requests', {
            asset_id: parseInt(assetId, 10),
            duration_days: duration,
            intended_purpose: purpose,
          });
          closeModal();
          showToast('Borrowing request submitted successfully. Awaiting staff approval.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });

  // Add Asset Modal (Staff / Admin)
  const addBtn = document.getElementById('btn-add-asset');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const departments = await api.get('/departments');
      const user = auth.getUser();
      const isStaff = user.role === 'LAB_STAFF';

      openModal({
        title: 'Register New Laboratory Asset',
        maxWidth: 'max-w-2xl',
        content: `
          <form id="create-asset-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Asset ID / Code Tag *</label>
                <input type="text" id="asset-code" required placeholder="e.g. AST-CSE-010" class="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Asset Name *</label>
                <input type="text" id="asset-name" required placeholder="e.g. HP Z-Book Workstation" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <input type="text" id="asset-cat" required placeholder="e.g. Computing, Instruments, AV" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select id="asset-dept" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  ${departments.map(d => `<option value="${d.id}" ${isStaff && user.department_id == d.id ? 'selected' : ''}>${d.code} - ${d.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Assigned Laboratory</label>
                <select id="asset-lab" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">General Department Pool</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Storage Location</label>
                <input type="text" id="asset-loc" placeholder="e.g. Rack 2, Shelf B, Room 301" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
                <input type="text" id="asset-sn" placeholder="e.g. SN-998231" class="w-full text-xs p-2 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Model Number</label>
                <input type="text" id="asset-model" placeholder="e.g. TBS1102B" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                <input type="number" id="asset-cost" step="0.01" value="0.00" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Description & Specifications</label>
              <textarea id="asset-desc" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Hardware specs, accessories included, calibration limits..."></textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Register Asset</button>
            </div>
          </form>
        `,
      });

      const deptSelect = document.getElementById('asset-dept');
      const labSelect = document.getElementById('asset-lab');

      async function updateLabs() {
        const deptId = deptSelect.value;
        labSelect.innerHTML = '<option value="">General Department Pool</option>';
        if (!deptId) return;
        try {
          const labs = await api.get('/departments/laboratories', { department_id: deptId });
          labs.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = `${l.code} - ${l.name}`;
            labSelect.appendChild(opt);
          });
        } catch (e) {}
      }

      deptSelect.addEventListener('change', updateLabs);
      updateLabs();

      const form = document.getElementById('create-asset-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/assets', {
            asset_code: document.getElementById('asset-code').value.trim(),
            name: document.getElementById('asset-name').value.trim(),
            category: document.getElementById('asset-cat').value.trim(),
            department_id: parseInt(document.getElementById('asset-dept').value, 10),
            laboratory_id: document.getElementById('asset-lab').value ? parseInt(document.getElementById('asset-lab').value, 10) : null,
            location: document.getElementById('asset-loc').value.trim() || null,
            serial_number: document.getElementById('asset-sn').value.trim() || null,
            model_number: document.getElementById('asset-model').value.trim() || null,
            cost: parseFloat(document.getElementById('asset-cost').value) || 0,
            description: document.getElementById('asset-desc').value.trim() || null,
            condition: 'Good',
            status: 'Available',
          });
          closeModal();
          showToast('Asset registered successfully into institutional registry.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  // Edit Asset Modal
  document.querySelectorAll('.btn-edit-asset').forEach(btn => {
    btn.addEventListener('click', async () => {
      const assetId = btn.getAttribute('data-edit-id');
      try {
        const a = await api.get(`/assets/${assetId}`);
        openModal({
          title: `Edit Asset: ${a.asset_code}`,
          maxWidth: 'max-w-xl',
          content: `
            <form id="edit-asset-form" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Equipment Name *</label>
                <input type="text" id="edit-name" value="${a.name}" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input type="text" id="edit-cat" value="${a.category}" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input type="text" id="edit-loc" value="${a.location || ''}" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Physical Condition</label>
                  <select id="edit-cond" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Good" ${a.condition === 'Good' ? 'selected' : ''}>Good</option>
                    <option value="Minor Damage" ${a.condition === 'Minor Damage' ? 'selected' : ''}>Minor Damage</option>
                    <option value="Major Damage" ${a.condition === 'Major Damage' ? 'selected' : ''}>Major Damage</option>
                    <option value="Damaged" ${a.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select id="edit-status" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Available" ${a.status === 'Available' ? 'selected' : ''}>Available</option>
                    <option value="Pending Request" ${a.status === 'Pending Request' ? 'selected' : ''}>Pending Request</option>
                    <option value="Borrowed" ${a.status === 'Borrowed' ? 'selected' : ''}>Borrowed</option>
                    <option value="Overdue" ${a.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                    <option value="Under Maintenance" ${a.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                    <option value="Damaged" ${a.status === 'Damaged' ? 'selected' : ''}>Damaged</option>
                    <option value="Retired" ${a.status === 'Retired' ? 'selected' : ''}>Retired</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea id="edit-desc" rows="3" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">${a.description || ''}</textarea>
              </div>

              <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
                <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Save Changes</button>
              </div>
            </form>
          `,
        });

        const form = document.getElementById('edit-asset-form');
        form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await api.put(`/assets/${assetId}`, {
              name: document.getElementById('edit-name').value.trim(),
              category: document.getElementById('edit-cat').value.trim(),
              location: document.getElementById('edit-loc').value.trim() || null,
              condition: document.getElementById('edit-cond').value,
              status: document.getElementById('edit-status').value,
              description: document.getElementById('edit-desc').value.trim() || null,
            });
            closeModal();
            showToast('Asset record updated.', 'success');
            window.dispatchEvent(new CustomEvent('view:reload'));
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
