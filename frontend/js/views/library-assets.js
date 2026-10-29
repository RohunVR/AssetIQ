import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let currentFilter = null; // null = landing | { value, name, icon, color }

// These match the exact category strings stored in the database
const LIBRARY_CATEGORIES = [
  {
    value: 'Textbooks',
    name: 'Textbooks',
    icon: '📗',
    desc: 'Core undergraduate and postgraduate course textbooks',
    color: 'blue',
  },
  {
    value: 'Computer Science & IT',
    name: 'Computer Science & IT',
    icon: '💻',
    desc: 'Programming, algorithms, OS, networks, databases, AI',
    color: 'indigo',
  },
  {
    value: 'Electronics & Communication',
    name: 'Electronics & Communication',
    icon: '⚡',
    desc: 'Circuit design, signals, VLSI, microprocessors, communication',
    color: 'purple',
  },
  {
    value: 'Mathematics & Statistics',
    name: 'Mathematics & Statistics',
    icon: '📐',
    desc: 'Calculus, linear algebra, discrete math, numerical methods',
    color: 'cyan',
  },
  {
    value: 'Management & Economics',
    name: 'Management & Economics',
    icon: '📊',
    desc: 'Engineering management, HR, marketing, financial management',
    color: 'emerald',
  },
  {
    value: 'General Science & Physics',
    name: 'General Science & Physics',
    icon: '🔬',
    desc: 'Physics, chemistry, biology, environmental science',
    color: 'teal',
  },
  {
    value: 'Research & Thesis',
    name: 'Research & Thesis',
    icon: '🎓',
    desc: 'Research methodology, academic writing, dissertation guides',
    color: 'amber',
  },
  {
    value: 'Journals & Periodicals',
    name: 'Journals & Periodicals',
    icon: '📰',
    desc: 'IEEE, ACM, Nature, Science and other academic journals',
    color: 'rose',
  },
  {
    value: 'Project Reports',
    name: 'Project Reports',
    icon: '📋',
    desc: 'Final year and postgraduate project documentation',
    color: 'orange',
  },
  {
    value: 'Reference Books',
    name: 'Reference Books',
    icon: '📚',
    desc: 'Handbooks, encyclopedias, dictionaries, standards',
    color: 'slate',
  },
];

const COLOR_MAP = {
  blue:    { card: 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400', icon: 'bg-blue-100 text-blue-700', title: 'text-blue-900', back: 'text-blue-700 hover:text-blue-900' },
  indigo:  { card: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400', icon: 'bg-indigo-100 text-indigo-700', title: 'text-indigo-900', back: 'text-indigo-700 hover:text-indigo-900' },
  purple:  { card: 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400', icon: 'bg-purple-100 text-purple-700', title: 'text-purple-900', back: 'text-purple-700 hover:text-purple-900' },
  cyan:    { card: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400', icon: 'bg-cyan-100 text-cyan-700', title: 'text-cyan-900', back: 'text-cyan-700 hover:text-cyan-900' },
  emerald: { card: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400', icon: 'bg-emerald-100 text-emerald-700', title: 'text-emerald-900', back: 'text-emerald-700 hover:text-emerald-900' },
  teal:    { card: 'border-teal-200 bg-teal-50 hover:bg-teal-100 hover:border-teal-400', icon: 'bg-teal-100 text-teal-700', title: 'text-teal-900', back: 'text-teal-700 hover:text-teal-900' },
  amber:   { card: 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400', icon: 'bg-amber-100 text-amber-700', title: 'text-amber-900', back: 'text-amber-700 hover:text-amber-900' },
  rose:    { card: 'border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-400', icon: 'bg-rose-100 text-rose-700', title: 'text-rose-900', back: 'text-rose-700 hover:text-rose-900' },
  orange:  { card: 'border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-400', icon: 'bg-orange-100 text-orange-700', title: 'text-orange-900', back: 'text-orange-700 hover:text-orange-900' },
  slate:   { card: 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400', icon: 'bg-slate-100 text-slate-700', title: 'text-slate-900', back: 'text-slate-700 hover:text-slate-900' },
};

function statusBadge(status) {
  const map = {
    'Available':         'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'Borrowed':          'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'Overdue':           'bg-rose-100 text-rose-800 border border-rose-200 font-bold',
    'Pending Request':   'bg-amber-100 text-amber-800 border border-amber-200',
    'Under Maintenance': 'bg-purple-100 text-purple-800 border border-purple-200',
    'Damaged':           'bg-rose-100 text-rose-900 border border-rose-300',
    'Retired':           'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border border-slate-200';
}

export async function renderLibraryAssets() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';
  if (currentFilter) return await renderBookList(user);
  return renderLanding();
}

/* ─── LANDING ─── */
function renderLanding() {
  const categoryCards = LIBRARY_CATEGORIES.map(cat => {
    const c = COLOR_MAP[cat.color];
    return `
      <button
        data-lib-cat-value="${cat.value}"
        data-lib-cat-name="${cat.name}"
        data-lib-cat-icon="${cat.icon}"
        data-lib-cat-color="${cat.color}"
        class="lib-cat-card text-left p-5 rounded-xl border-2 transition-all duration-150 cursor-pointer shadow-sm ${c.card} group"
      >
        <div class="text-3xl mb-3">${cat.icon}</div>
        <div class="font-bold text-sm ${c.title} leading-tight">${cat.name}</div>
        <div class="text-xs text-slate-500 mt-1.5 leading-relaxed">${cat.desc}</div>
        <div class="mt-3 flex items-center gap-1 text-xs font-semibold ${c.title} opacity-60 group-hover:opacity-100 transition-opacity">
          Browse Collection
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-8">

      <!-- Page Header -->
      <div class="pb-3 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl flex-shrink-0">📖</div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Library Assets</h1>
            <p class="text-xs text-slate-500 mt-0.5">Browse books, journals, and resources from the institutional library</p>
          </div>
        </div>
      </div>

      <!-- Info Bar -->
      <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="text-xs text-amber-900 leading-relaxed">
          <strong>Borrowing Policy:</strong> Submit a request for any available item. The librarian will review and approve.
          Books: up to 14 days · Journals & Reports: 7 days · Reference books are for in-library use only.
        </div>
      </div>

      <!-- Category Grid -->
      <div>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-1 h-6 bg-amber-600 rounded-full"></div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Library Collection Categories</h2>
            <p class="text-xs text-slate-500">Select a category to browse available items</p>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          ${categoryCards}
        </div>
      </div>

      <!-- Quick Info Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-3">
          <div class="text-2xl">⏰</div>
          <div>
            <div class="font-bold text-sm text-slate-900">Borrowing Period</div>
            <div class="text-xs text-slate-500 mt-0.5">Books & Textbooks: 14 days<br>Journals & Reports: 7 days</div>
          </div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-3">
          <div class="text-2xl">📍</div>
          <div>
            <div class="font-bold text-sm text-slate-900">Library Location</div>
            <div class="text-xs text-slate-500 mt-0.5">Central Library, Ground Floor<br>Open: Mon–Sat, 8AM–8PM</div>
          </div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-3">
          <div class="text-2xl">👤</div>
          <div>
            <div class="font-bold text-sm text-slate-900">Librarian</div>
            <div class="text-xs text-slate-500 mt-0.5">Ms. Priya Raghavan<br>Ext. 100 · librarian@college.edu</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

/* ─── BOOK LIST: after a category card is clicked ─── */
async function renderBookList(user) {
  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'LAB_STAFF';

  const [assets, settings] = await Promise.all([
    api.get('/assets', { category: currentFilter.value }).catch(() => []),
    api.get('/settings').catch(() => ({ max_borrowing_days: 14, max_active_assets: 3 })),
  ]);

  // Filter to only library assets (department = LIB)
  const books = assets.filter(a => a.department_name === 'Central Library');
  const maxDays = settings.max_borrowing_days || 14;
  const c = COLOR_MAP[currentFilter.color] || COLOR_MAP.amber;
  const label = `${currentFilter.icon} ${currentFilter.name}`;

  const rows = books.length === 0
    ? `<tr><td colspan="7" class="text-center py-14 text-slate-400">
         <div class="text-3xl mb-2">📭</div>
         <div class="font-semibold">No books found in this category.</div>
         <div class="text-xs mt-1">Contact the library desk for assistance.</div>
       </td></tr>`
    : books.map(a => {
        const canBorrow = a.status === 'Available' && !isStaffOrAdmin;
        // Parse out author from description field "Author(s): ..."
        const author = (a.description || '').replace('Author(s): ', '');
        return `
          <tr>
            <td class="font-mono text-xs font-semibold text-slate-600">${a.asset_code}</td>
            <td>
              <div class="font-bold text-slate-900 text-sm leading-tight">${a.name}</div>
              <div class="text-xs text-slate-500 mt-0.5 italic">${author}</div>
            </td>
            <td class="text-xs text-slate-600 font-medium">${a.location || '—'}</td>
            <td>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(a.status)}">
                ${a.status}
              </span>
            </td>
            <td class="text-xs text-slate-600">${a.condition || '—'}</td>
            <td class="text-right">
              ${canBorrow ? `
                <button
                  data-borrow-asset-id="${a.id}"
                  data-borrow-asset-name="${a.name}"
                  data-borrow-asset-code="${a.asset_code}"
                  data-max-days="${maxDays}"
                  class="btn-lib-borrow px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
                >
                  Request to Borrow
                </button>
              ` : `<span class="text-xs text-slate-400 font-medium">${a.status === 'Available' && isStaffOrAdmin ? '—' : a.status !== 'Available' ? a.status : '—'}</span>`}
            </td>
          </tr>
        `;
      }).join('');

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-5">

      <!-- Breadcrumb / Back -->
      <div class="flex items-center gap-3">
        <button id="btn-lib-back" class="flex items-center gap-1.5 text-xs font-semibold ${c.back} transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back to Library
        </button>
        <span class="text-slate-300">/</span>
        <span class="text-xs font-semibold text-slate-600">${label}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">${label}</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            ${books.length} item${books.length !== 1 ? 's' : ''} in this collection
            ${!isStaffOrAdmin ? ' · Click "Request to Borrow" on Available items' : ''}
          </p>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Title & Author</th>
              <th>Shelf Location</th>
              <th>Status</th>
              <th>Condition</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachLibraryAssetListeners() {
  // Category card clicks (landing page)
  document.querySelectorAll('.lib-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      currentFilter = {
        value: card.getAttribute('data-lib-cat-value'),
        name: card.getAttribute('data-lib-cat-name'),
        icon: card.getAttribute('data-lib-cat-icon'),
        color: card.getAttribute('data-lib-cat-color') || 'amber',
      };
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  });

  // Back button
  const backBtn = document.getElementById('btn-lib-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentFilter = null;
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // Borrow request buttons
  document.querySelectorAll('.btn-lib-borrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const assetId   = btn.getAttribute('data-borrow-asset-id');
      const assetName = btn.getAttribute('data-borrow-asset-name');
      const assetCode = btn.getAttribute('data-borrow-asset-code');
      const maxDays   = parseInt(btn.getAttribute('data-max-days')) || 14;

      openModal({
        title: `Request to Borrow`,
        maxWidth: 'max-w-lg',
        content: `
          <form id="lib-borrow-form" class="space-y-4">
            <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
              <div class="font-bold text-sm mb-0.5">${assetName}</div>
              <div class="font-mono text-[11px]">${assetCode} · Central Library</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason *</label>
              <textarea id="lib-borrow-purpose" required rows="3"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="e.g. Reference for final year project, exam preparation, self-study..."></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Duration Required (days) *</label>
              <input type="number" id="lib-borrow-days" required min="1" max="${maxDays}" value="7"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none">
              <p class="text-[11px] text-slate-500 mt-1">Maximum: ${maxDays} days</p>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold shadow-sm">Submit Request</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('lib-borrow-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const purpose = document.getElementById('lib-borrow-purpose').value.trim();
        const days    = parseInt(document.getElementById('lib-borrow-days').value);
        if (!purpose) { showToast('Please enter a reason for borrowing.', 'error'); return; }
        try {
          await api.post('/borrowing/requests', {
            asset_id: parseInt(assetId),
            duration_days: days,
            intended_purpose: purpose,
          });
          closeModal();
          showToast(`Request submitted. The librarian will review and approve shortly.`, 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}
