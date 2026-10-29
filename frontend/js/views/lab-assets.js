import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

// Current drill-down state
let currentFilter = null; // null = landing | { type:'dept', id, name, code } | { type:'category', value, name, icon }

// Common cross-department categories available in most labs
const COMMON_CATEGORIES = [
  {
    value: 'Computing',
    name: 'Computing Equipment',
    icon: '💻',
    desc: 'Laptops, desktops, tablets, workstations',
    color: 'blue',
  },
  {
    value: 'AV Equipment',
    name: 'Audio / Visual',
    icon: '📽️',
    desc: 'Projectors, screens, cameras, displays, microphones',
    color: 'indigo',
  },
  {
    value: 'Instruments',
    name: 'Test & Measurement',
    icon: '📊',
    desc: 'Oscilloscopes, multimeters, signal generators, LCR meters',
    color: 'purple',
  },
  {
    value: 'Networking',
    name: 'Networking & Connectivity',
    icon: '🌐',
    desc: 'Routers, switches, access points, patch panels',
    color: 'cyan',
  },
  {
    value: 'Robotics',
    name: 'Robotics & Embedded',
    icon: '🤖',
    desc: 'Arduino kits, Raspberry Pi, sensors, microcontrollers',
    color: 'emerald',
  },
  {
    value: 'Tools',
    name: 'Tools & Hand Equipment',
    icon: '🔧',
    desc: 'Screwdrivers, soldering irons, wire strippers, pliers',
    color: 'amber',
  },
  {
    value: 'Power',
    name: 'Power & Charging',
    icon: '⚡',
    desc: 'Extension boards, UPS units, adapters, battery banks',
    color: 'yellow',
  },
  {
    value: 'Accessories',
    name: 'Cables & Accessories',
    icon: '🔌',
    desc: 'HDMI, USB, VGA, Ethernet cables, converters, hubs',
    color: 'slate',
  },
  {
    value: 'Safety',
    name: 'Safety & PPE',
    icon: '🦺',
    desc: 'Safety glasses, antistatic gloves, lab coats, mats',
    color: 'rose',
  },
  {
    value: 'Miscellaneous',
    name: 'Miscellaneous',
    icon: '📦',
    desc: 'General-purpose equipment not listed above',
    color: 'gray',
  },
];

const COLOR_MAP = {
  blue:    { card: 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400', icon: 'bg-blue-100 text-blue-700', title: 'text-blue-900', badge: 'bg-blue-100 text-blue-700' },
  indigo:  { card: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400', icon: 'bg-indigo-100 text-indigo-700', title: 'text-indigo-900', badge: 'bg-indigo-100 text-indigo-700' },
  purple:  { card: 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400', icon: 'bg-purple-100 text-purple-700', title: 'text-purple-900', badge: 'bg-purple-100 text-purple-700' },
  cyan:    { card: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400', icon: 'bg-cyan-100 text-cyan-700', title: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
  emerald: { card: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400', icon: 'bg-emerald-100 text-emerald-700', title: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { card: 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400', icon: 'bg-amber-100 text-amber-700', title: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' },
  yellow:  { card: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400', icon: 'bg-yellow-100 text-yellow-700', title: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700' },
  slate:   { card: 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400', icon: 'bg-slate-100 text-slate-700', title: 'text-slate-900', badge: 'bg-slate-100 text-slate-700' },
  rose:    { card: 'border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-400', icon: 'bg-rose-100 text-rose-700', title: 'text-rose-900', badge: 'bg-rose-100 text-rose-700' },
  gray:    { card: 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-400', icon: 'bg-gray-100 text-gray-700', title: 'text-gray-900', badge: 'bg-gray-100 text-gray-700' },
};

const DEPT_COLORS = ['blue', 'purple', 'emerald', 'amber', 'indigo', 'cyan'];

// Badge colors for asset status
function statusBadge(status) {
  const map = {
    'Available':        'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'Borrowed':         'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'Overdue':          'bg-rose-100 text-rose-800 border border-rose-200 font-bold',
    'Pending Request':  'bg-amber-100 text-amber-800 border border-amber-200',
    'Under Maintenance':'bg-purple-100 text-purple-800 border border-purple-200',
    'Damaged':          'bg-rose-100 text-rose-900 border border-rose-300',
    'Retired':          'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border border-slate-200';
}

export async function renderLabAssets() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  if (currentFilter) {
    return await renderAssetList(user);
  }
  return await renderLanding();
}

/* ─── LANDING: department cards + common category cards ─── */
async function renderLanding() {
  const departments = await api.get('/departments');

  const deptCards = departments.map((d, i) => {
    const color = DEPT_COLORS[i % DEPT_COLORS.length];
    const c = COLOR_MAP[color];
    return `
      <button
        data-filter-type="dept"
        data-filter-id="${d.id}"
        data-filter-name="${d.name}"
        data-filter-code="${d.code}"
        data-filter-color="${color}"
        class="lab-filter-card text-left p-5 rounded-xl border-2 transition-all duration-150 cursor-pointer shadow-sm ${c.card} group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold ${c.icon} border border-opacity-30">
            ${d.code.substring(0, 2)}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm ${c.title} leading-tight">${d.name}</div>
            <div class="text-xs text-slate-500 mt-0.5 font-mono">${d.code}</div>
            ${d.description ? `<div class="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">${d.description}</div>` : ''}
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-xs font-semibold ${c.title} opacity-70 group-hover:opacity-100 transition-opacity">
          Browse ${d.code} Assets
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </div>
      </button>
    `;
  }).join('');

  const categoryCards = COMMON_CATEGORIES.map(cat => {
    const c = COLOR_MAP[cat.color];
    return `
      <button
        data-filter-type="category"
        data-filter-value="${cat.value}"
        data-filter-name="${cat.name}"
        data-filter-icon="${cat.icon}"
        data-filter-color="${cat.color}"
        class="lab-filter-card text-left p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer shadow-sm ${c.card} group"
      >
        <div class="text-2xl mb-2">${cat.icon}</div>
        <div class="font-bold text-sm ${c.title} leading-tight">${cat.name}</div>
        <div class="text-xs text-slate-500 mt-1 leading-relaxed">${cat.desc}</div>
        <div class="mt-3 flex items-center gap-1 text-xs font-semibold ${c.title} opacity-60 group-hover:opacity-100 transition-opacity">
          View Assets
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-10">

      <!-- Page Header -->
      <div class="pb-3 border-b border-slate-200">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Laboratory Assets</h1>
        <p class="text-xs text-slate-500 mt-0.5">Browse and request equipment from any department laboratory or by equipment type</p>
      </div>

      <!-- Browse by Department -->
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-1 h-6 bg-blue-700 rounded-full"></div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Browse by Department</h2>
            <p class="text-xs text-slate-500">Select a department to see its laboratory assets</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${deptCards}
        </div>
      </div>

      <!-- Browse by Common Equipment Type -->
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-1 h-6 bg-emerald-600 rounded-full"></div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Browse by Equipment Type</h2>
            <p class="text-xs text-slate-500">Commonly available resources across most laboratories</p>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${categoryCards}
        </div>
      </div>

    </div>
  `;
}

/* ─── ASSET LIST: after a dept/category box is clicked ─── */
async function renderAssetList(user) {
  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';

  // Build API query params based on filter type
  const params = {};
  if (currentFilter.type === 'dept') {
    params.department_id = currentFilter.id;
  } else {
    params.category = currentFilter.value;
  }

  // Also load settings for borrow form
  const [assets, settings] = await Promise.all([
    api.get('/assets', params),
    api.get('/settings').catch(() => ({ max_borrowing_days: 7, max_active_assets: 3 })),
  ]);

  const c = COLOR_MAP[currentFilter.color] || COLOR_MAP.blue;
  const label = currentFilter.type === 'dept'
    ? `${currentFilter.name} (${currentFilter.code})`
    : `${currentFilter.icon || ''} ${currentFilter.name}`;

  const maxDays = settings.max_borrowing_days || 7;

  const rows = assets.length === 0
    ? `<tr><td colspan="7" class="text-center py-14 text-slate-400">
         <div class="text-3xl mb-2">📭</div>
         <div class="font-semibold">No assets found in this category.</div>
         <div class="text-xs mt-1">Check other departments or categories.</div>
       </td></tr>`
    : assets.map(a => {
        const canBorrow = a.status === 'Available' && !isStaffOrAdmin;
        const statusClass = statusBadge(a.status);
        return `
          <tr>
            <td class="font-mono text-xs font-semibold text-slate-700">
              ${a.asset_code}
              <div class="text-[10px] text-slate-400 font-normal">${a.category}</div>
            </td>
            <td>
              <div class="font-bold text-slate-900 text-sm">${a.name}</div>
              ${a.model_number ? `<div class="text-[11px] text-slate-500">${a.model_number}</div>` : ''}
            </td>
            <td class="text-xs text-slate-700">
              <div class="font-semibold">${a.department_name || '—'}</div>
              <div class="text-slate-400">${a.laboratory_name || ''}</div>
            </td>
            <td class="text-xs text-slate-600">${a.location || '—'}</td>
            <td>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClass}">
                ${a.status}
              </span>
            </td>
            <td class="text-xs text-slate-600">${a.condition || '—'}</td>
            <td class="text-right whitespace-nowrap">
              ${canBorrow ? `
                <button
                  data-borrow-asset-id="${a.id}"
                  data-borrow-asset-name="${a.name}"
                  data-borrow-asset-code="${a.asset_code}"
                  data-max-days="${maxDays}"
                  class="btn-quick-borrow px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
                >
                  Request to Borrow
                </button>
              ` : `<span class="text-xs text-slate-400 font-medium">${a.status === 'Available' && isStaffOrAdmin ? 'Staff View' : a.status}</span>`}
            </td>
          </tr>
        `;
      }).join('');

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-5">

      <!-- Back + Breadcrumb -->
      <div class="flex items-center gap-3">
        <button id="btn-back-to-landing" class="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back to Lab Assets
        </button>
        <span class="text-slate-300">/</span>
        <span class="text-xs font-semibold text-slate-600">${label}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">${label}</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            ${assets.length} asset${assets.length !== 1 ? 's' : ''} found
            ${!isStaffOrAdmin ? ' · Click "Request to Borrow" on any Available item' : ''}
          </p>
        </div>
      </div>

      <!-- Asset Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name / Model</th>
              <th>Department / Lab</th>
              <th>Location</th>
              <th>Status</th>
              <th>Condition</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachLabAssetListeners() {
  // Dept/Category card clicks (landing page)
  document.querySelectorAll('.lab-filter-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-filter-type');
      if (type === 'dept') {
        currentFilter = {
          type: 'dept',
          id: card.getAttribute('data-filter-id'),
          name: card.getAttribute('data-filter-name'),
          code: card.getAttribute('data-filter-code'),
          color: card.getAttribute('data-filter-color') || 'blue',
        };
      } else {
        currentFilter = {
          type: 'category',
          value: card.getAttribute('data-filter-value'),
          name: card.getAttribute('data-filter-name'),
          icon: card.getAttribute('data-filter-icon'),
          color: card.getAttribute('data-filter-color') || 'blue',
        };
      }
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  });

  // Back button
  const backBtn = document.getElementById('btn-back-to-landing');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentFilter = null;
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // Borrow request buttons (for students/faculty in the asset list)
  document.querySelectorAll('.btn-quick-borrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const assetId = btn.getAttribute('data-borrow-asset-id');
      const assetName = btn.getAttribute('data-borrow-asset-name');
      const assetCode = btn.getAttribute('data-borrow-asset-code');
      const maxDays = parseInt(btn.getAttribute('data-max-days')) || 7;

      openModal({
        title: `Request to Borrow: ${assetName}`,
        maxWidth: 'max-w-lg',
        content: `
          <form id="quick-borrow-form" class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
              <strong>Asset:</strong> ${assetName} <span class="font-mono ml-1">(${assetCode})</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason for Borrowing *</label>
              <textarea id="borrow-purpose" required rows="3"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Final year project — circuit design and testing for EEE lab assignment..."></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Duration Required (days) *</label>
              <input type="number" id="borrow-days" required min="1" max="${maxDays}" value="3"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
              <p class="text-[11px] text-slate-500 mt-1">Maximum allowed: ${maxDays} days</p>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-sm">Submit Request</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('quick-borrow-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const purpose = document.getElementById('borrow-purpose').value.trim();
        const days = parseInt(document.getElementById('borrow-days').value);
        if (!purpose) { showToast('Please enter a purpose for borrowing.', 'error'); return; }
        try {
          await api.post('/borrowing/requests', {
            asset_id: parseInt(assetId),
            duration_days: days,
            intended_purpose: purpose,
          });
          closeModal();
          showToast(`Borrowing request submitted for "${assetName}". Awaiting staff approval.`, 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}
