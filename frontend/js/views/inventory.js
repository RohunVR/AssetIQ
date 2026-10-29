import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let filterState = {
  search: '',
  category: '',
  low_stock_only: false,
};

export async function renderInventory() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';
  if (!isStaffOrAdmin) {
    return `
      <div class="p-6 max-w-4xl mx-auto">
        <div class="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
          <strong>Access Restricted:</strong> Consumable laboratory inventory is managed internally by departmental laboratory staff and administrators. Students and faculty do not directly manage consumable stocks in V1.
        </div>
      </div>
    `;
  }

  const items = await api.get('/inventory', {
    search: filterState.search,
    category: filterState.category,
    low_stock_only: filterState.low_stock_only ? 'true' : '',
  });

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Title & Header Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Consumables & Component Inventory</h1>
          <p class="text-xs text-slate-500 mt-0.5">Quantity-based physical stock management with automated low-stock alerting</p>
        </div>
        <button id="btn-add-inventory" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Consumable Item
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar bg-white shadow-xs">
        <div class="relative flex-1 min-w-[200px]">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="filter-inv-search" value="${filterState.search}" placeholder="Search consumable by name, code, category..." class="filter-input w-full pl-9 pr-3 text-xs">
        </div>

        <label class="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer border border-slate-300 rounded px-3 py-1.5 bg-slate-50 hover:bg-slate-100">
          <input type="checkbox" id="filter-low-stock" ${filterState.low_stock_only ? 'checked' : ''} class="rounded text-blue-600 focus:ring-blue-500">
          <span>Show Low-Stock Alerts Only</span>
        </label>

        <button id="btn-clear-inv-filters" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium">
          Reset
        </button>
      </div>

      <!-- Inventory Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Consumable Item</th>
              <th>Category</th>
              <th>Department / Lab</th>
              <th>Current Stock</th>
              <th>Min Threshold</th>
              <th>Stock Status</th>
              <th class="text-right">Stock Actions</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                  No inventory consumables found. Click "Add Consumable Item" to register stock.
                </td>
              </tr>
            ` : items.map(item => `
              <tr class="${item.is_low_stock ? 'bg-amber-50/40' : ''}">
                <td class="font-mono text-xs font-semibold text-slate-700">${item.item_code}</td>
                <td>
                  <div class="font-semibold text-slate-900">${item.name}</div>
                  <div class="text-[11px] text-slate-500">${item.location || 'Storage Cabinet'}</div>
                </td>
                <td class="text-xs text-slate-600">${item.category}</td>
                <td>
                  <div class="text-xs font-medium text-slate-900">${item.department_code || 'Central'}</div>
                  <div class="text-[11px] text-slate-500">${item.laboratory_name || 'General'}</div>
                </td>
                <td>
                  <div class="font-bold text-sm ${item.is_low_stock ? 'text-amber-700' : 'text-slate-900'}">
                    ${item.quantity} <span class="text-xs font-normal text-slate-500">${item.unit}</span>
                  </div>
                </td>
                <td class="text-xs font-medium text-slate-600">
                  ${item.min_threshold} ${item.unit}
                </td>
                <td>
                  ${item.is_low_stock ? `
                    <span class="badge badge-low-stock">
                      <svg class="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      Low Stock Alert
                    </span>
                  ` : `
                    <span class="badge badge-normal-stock">Sufficient</span>
                  `}
                </td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5">
                    <button data-stockin-id="${item.id}" data-item-name="${item.name}" data-unit="${item.unit}" class="btn-stock-in px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold transition-colors">
                      + Receive
                    </button>
                    <button data-stockout-id="${item.id}" data-item-name="${item.name}" data-unit="${item.unit}" data-current="${item.quantity}" class="btn-stock-out px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold transition-colors">
                      - Issue
                    </button>
                    <button data-txns-id="${item.id}" data-item-name="${item.name}" class="btn-view-txns p-1 text-slate-500 hover:text-slate-800 rounded transition-colors" title="Audit Log">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    </button>
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

export function attachInventoryListeners() {
  const searchInput = document.getElementById('filter-inv-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filterState.search = e.target.value;
        window.dispatchEvent(new CustomEvent('view:reload'));
      }, 300);
    });
  }

  const lowStockCheckbox = document.getElementById('filter-low-stock');
  if (lowStockCheckbox) {
    lowStockCheckbox.addEventListener('change', (e) => {
      filterState.low_stock_only = e.target.checked;
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  const clearBtn = document.getElementById('btn-clear-inv-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filterState = { search: '', category: '', low_stock_only: false };
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // Receive Stock (+X)
  document.querySelectorAll('.btn-stock-in').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-stockin-id');
      const itemName = btn.getAttribute('data-item-name');
      const unit = btn.getAttribute('data-unit');

      openModal({
        title: `Receive Stock: ${itemName}`,
        content: `
          <form id="stock-in-form" class="space-y-4">
            <p class="text-xs text-slate-600">
              Record new consignment intake or replenishment received from institutional procurement or vendors.
            </p>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Quantity to Receive (${unit}) *</label>
              <input type="number" id="in-qty" min="1" value="10" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Source / Procurement Reference *</label>
              <input type="text" id="in-reason" required placeholder="e.g. Central Store Delivery PO-8812, Vendor delivery" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea id="in-notes" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Batch number, invoice details, etc."></textarea>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold shadow-xs">Confirm Stock In</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('stock-in-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post(`/inventory/${itemId}/stock-in`, {
            quantity: parseInt(document.getElementById('in-qty').value, 10),
            reason: document.getElementById('in-reason').value.trim(),
            reference_notes: document.getElementById('in-notes').value.trim() || null,
          });
          closeModal();
          showToast(`Stock added successfully for ${itemName}.`, 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });

  // Issue Stock (-X)
  document.querySelectorAll('.btn-stock-out').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-stockout-id');
      const itemName = btn.getAttribute('data-item-name');
      const unit = btn.getAttribute('data-unit');
      const currentQty = parseInt(btn.getAttribute('data-current'), 10);

      openModal({
        title: `Issue Stock: ${itemName}`,
        content: `
          <form id="stock-out-form" class="space-y-4">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
              Available in Stock: <span class="font-bold text-slate-900">${currentQty} ${unit}</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Quantity to Issue (${unit}) *</label>
              <input type="number" id="out-qty" min="1" max="${currentQty}" value="1" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Course / Lab Experiment / Purpose *</label>
              <input type="text" id="out-reason" required placeholder="e.g. ECE 304 Digital Circuits Practical Session 2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reference Notes</label>
              <textarea id="out-notes" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Issued to student batch B-2, instructor Dr. Kumar..."></textarea>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-amber-700 hover:bg-amber-800 text-white rounded font-semibold shadow-xs">Confirm Issue</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('stock-out-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post(`/inventory/${itemId}/stock-out`, {
            quantity: parseInt(document.getElementById('out-qty').value, 10),
            reason: document.getElementById('out-reason').value.trim(),
            reference_notes: document.getElementById('out-notes').value.trim() || null,
          });
          closeModal();
          showToast(`Stock issued successfully. Quantity updated.`, 'info');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });

  // Audit Transactions History
  document.querySelectorAll('.btn-view-txns').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-txns-id');
      const itemName = btn.getAttribute('data-item-name');
      try {
        const txns = await api.get(`/inventory/${itemId}/transactions`);
        openModal({
          title: `Stock Audit Trail: ${itemName}`,
          maxWidth: 'max-w-2xl',
          content: `
            <div class="space-y-4 text-xs">
              <div class="border border-slate-200 rounded-md overflow-hidden">
                <table class="w-full text-left">
                  <thead class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2.5">Date</th>
                      <th class="p-2.5">Action</th>
                      <th class="p-2.5">Change</th>
                      <th class="p-2.5">New Balance</th>
                      <th class="p-2.5">Staff</th>
                      <th class="p-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${txns.length === 0 ? `
                      <tr><td colspan="6" class="p-4 text-center text-slate-400">No stock movements recorded yet.</td></tr>
                    ` : txns.map(t => `
                      <tr>
                        <td class="p-2.5 text-slate-500">${t.created_at ? t.created_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td class="p-2.5 font-bold ${t.transaction_type === 'STOCK_IN' ? 'text-emerald-700' : 'text-amber-700'}">${t.transaction_type}</td>
                        <td class="p-2.5 font-mono font-semibold ${t.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}">
                          ${t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change}
                        </td>
                        <td class="p-2.5 font-mono font-bold text-slate-900">${t.new_quantity}</td>
                        <td class="p-2.5 text-slate-700">${t.user_name || 'Staff'}</td>
                        <td class="p-2.5 text-slate-600">${t.reason || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div class="flex justify-end pt-2">
                <button type="button" class="btn-close-txns px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900">Close</button>
              </div>
            </div>
          `,
        });
        document.querySelector('.btn-close-txns').addEventListener('click', () => closeModal());
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Add Consumable Item
  const addInvBtn = document.getElementById('btn-add-inventory');
  if (addInvBtn) {
    addInvBtn.addEventListener('click', async () => {
      const departments = await api.get('/departments');
      const user = auth.getUser();
      const isStaff = user.role === 'LAB_STAFF';

      openModal({
        title: 'Add New Consumable Item',
        content: `
          <form id="create-inv-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Item Code *</label>
                <input type="text" id="inv-code" required placeholder="e.g. INV-ECE-010" class="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                <input type="text" id="inv-name" required placeholder="e.g. 5V Relay Modules" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <input type="text" id="inv-cat" required placeholder="e.g. Components, Wires, Batteries" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select id="inv-dept" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  ${departments.map(d => `<option value="${d.id}" ${isStaff && user.department_id == d.id ? 'selected' : ''}>${d.code} - ${d.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Initial Quantity</label>
                <input type="number" id="inv-qty" min="0" value="0" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Min Threshold *</label>
                <input type="number" id="inv-threshold" min="0" value="10" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                <input type="text" id="inv-unit" required placeholder="pcs, boxes, rolls" value="pcs" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Storage Location</label>
              <input type="text" id="inv-loc" placeholder="e.g. Drawer 3, Bin B, Lab 102" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Save Item</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('create-inv-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/inventory', {
            item_code: document.getElementById('inv-code').value.trim(),
            name: document.getElementById('inv-name').value.trim(),
            category: document.getElementById('inv-cat').value.trim(),
            department_id: parseInt(document.getElementById('inv-dept').value, 10),
            quantity: parseInt(document.getElementById('inv-qty').value, 10) || 0,
            min_threshold: parseInt(document.getElementById('inv-threshold').value, 10) || 10,
            unit: document.getElementById('inv-unit').value.trim() || 'pcs',
            location: document.getElementById('inv-loc').value.trim() || null,
          });
          closeModal();
          showToast('Consumable item registered in inventory.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
}
