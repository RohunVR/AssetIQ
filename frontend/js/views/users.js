import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let filterState = {
  search: '',
  role: '',
  department_id: '',
};

export async function renderUsers() {
  const user = auth.getUser();
  if (!user || user.role !== 'ADMIN') {
    return '<div class="p-6 text-sm text-rose-600">Access denied: Admin role required.</div>';
  }

  const [users, departments] = await Promise.all([
    api.get('/users', filterState),
    api.get('/departments'),
  ]);

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional User Directory</h1>
          <p class="text-xs text-slate-500 mt-0.5">Manage administrators, lab staff, faculty, and student authorization accounts</p>
        </div>
        <button id="btn-create-user" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          Register New User
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-bar bg-white shadow-xs">
        <div class="relative flex-1 min-w-[200px]">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="filter-user-search" value="${filterState.search}" placeholder="Search user name, email, student/staff ID..." class="filter-input w-full pl-9 pr-3 text-xs">
        </div>

        <select id="filter-user-role" class="filter-input text-xs">
          <option value="">All Roles</option>
          <option value="ADMIN" ${filterState.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
          <option value="LAB_STAFF" ${filterState.role === 'LAB_STAFF' ? 'selected' : ''}>Lab Staff</option>
          <option value="FACULTY" ${filterState.role === 'FACULTY' ? 'selected' : ''}>Faculty</option>
          <option value="STUDENT" ${filterState.role === 'STUDENT' ? 'selected' : ''}>Student</option>
        </select>

        <select id="filter-user-dept" class="filter-input text-xs">
          <option value="">All Departments</option>
          ${departments.map(d => `<option value="${d.id}" ${filterState.department_id == d.id ? 'selected' : ''}>${d.code} - ${d.name}</option>`).join('')}
        </select>

        <button id="btn-clear-user-filters" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium">
          Reset
        </button>
      </div>

      <!-- Users Table -->
      <div class="table-container">
        <table class="institutional-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Institutional ID</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `
              <tr><td colspan="7" class="text-center py-10 text-slate-400">No users found.</td></tr>
            ` : users.map(u => {
              const rolePill = {
                'ADMIN': 'bg-rose-100 text-rose-800 border-rose-300',
                'LAB_STAFF': 'bg-purple-100 text-purple-800 border-purple-300',
                'FACULTY': 'bg-blue-100 text-blue-800 border-blue-300',
                'STUDENT': 'bg-emerald-100 text-emerald-800 border-emerald-300',
              }[u.role] || 'bg-slate-100 text-slate-800 border-slate-300';

              return `
                <tr>
                  <td>
                    <div class="font-bold text-slate-900 text-xs">${u.full_name}</div>
                    <div class="text-[11px] text-slate-500">${u.phone || 'No phone'}</div>
                  </td>
                  <td class="font-mono text-xs text-slate-700">${u.email}</td>
                  <td>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full border ${rolePill}">
                      ${u.role}
                    </span>
                  </td>
                  <td class="text-xs text-slate-600">${u.department_name || 'Central / Institute-wide'}</td>
                  <td class="font-mono text-xs text-slate-600">${u.student_or_staff_id || '—'}</td>
                  <td>
                    <span class="badge ${u.is_active ? 'badge-available' : 'badge-retired'}">
                      ${u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                      <button data-edit-user-id="${u.id}" class="btn-edit-user p-1 text-slate-500 hover:text-blue-700 rounded transition-colors" title="Edit User">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button data-toggle-id="${u.id}" data-user-name="${u.full_name}" data-active="${u.is_active}" class="btn-toggle-active px-2 py-1 text-[11px] ${u.is_active ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} border rounded font-semibold transition-colors">
                        ${u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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

export function attachUserListeners() {
  const searchInput = document.getElementById('filter-user-search');
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

  ['role', 'dept'].forEach(f => {
    const el = document.getElementById(`filter-user-${f}`);
    if (el) {
      el.addEventListener('change', (e) => {
        if (f === 'role') filterState.role = e.target.value;
        if (f === 'dept') filterState.department_id = e.target.value;
        window.dispatchEvent(new CustomEvent('view:reload'));
      });
    }
  });

  const clearBtn = document.getElementById('btn-clear-user-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filterState = { search: '', role: '', department_id: '' };
      window.dispatchEvent(new CustomEvent('view:reload'));
    });
  }

  // Create User
  const createBtn = document.getElementById('btn-create-user');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const departments = await api.get('/departments');
      // Role descriptions for helper text
      const roleDescriptions = {
        STUDENT: 'Requires department assignment. Can browse and request equipment.',
        FACULTY: 'Requires department assignment. Can browse and submit borrowing requests.',
        LAB_STAFF: 'Requires department assignment. Manages assets, approves requests, and records maintenance.',
        ADMIN: 'Institution-wide access. No department required.',
      };

      openModal({
        title: 'Register New Institutional User',
        maxWidth: 'max-w-xl',
        content: `
          <form id="create-user-form" class="space-y-4">

            <!-- Role selector at top with description -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
              <select id="usr-role" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="LAB_STAFF">Lab Staff / Librarian</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p id="role-desc" class="mt-1.5 text-[11px] text-slate-500 leading-relaxed">${roleDescriptions.STUDENT}</p>
            </div>

            <!-- Department field (hidden for ADMIN) -->
            <div id="dept-field-section">
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Department <span id="dept-required-star" class="text-rose-500">*</span>
              </label>
              <select id="usr-dept" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">— Select Department —</option>
                ${departments.map(d => `<option value="${d.id}">${d.code} — ${d.name}</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input type="text" id="usr-name" required placeholder="e.g. Dr. Rajesh Kumar" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input type="email" id="usr-email" required placeholder="e.g. rajesh@college.edu" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  <span id="id-field-label">Student ID</span>
                </label>
                <input type="text" id="usr-id-code" placeholder="e.g. STU-2023-091" class="w-full text-xs p-2 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input type="text" id="usr-phone" placeholder="e.g. +91 98765 00000" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Initial Password * <span class="text-slate-400 font-normal">(minimum 6 characters)</span></label>
              <input type="password" id="usr-pass" required minlength="6" placeholder="••••••••" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Register User</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('create-user-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());

      // Dynamic role-based field adaptation
      const roleSelect = document.getElementById('usr-role');
      const deptSection = document.getElementById('dept-field-section');
      const deptSelect = document.getElementById('usr-dept');
      const roleDescEl = document.getElementById('role-desc');
      const idLabelEl = document.getElementById('id-field-label');
      const idInput = document.getElementById('usr-id-code');

      const idLabels = { STUDENT: 'Student ID', FACULTY: 'Faculty ID', LAB_STAFF: 'Staff ID', ADMIN: 'Admin ID' };
      const idPlaceholders = { STUDENT: 'e.g. STU-2023-091', FACULTY: 'e.g. FAC-CSE-201', LAB_STAFF: 'e.g. STF-CSE-101', ADMIN: 'e.g. ADM-001' };

      function updateFormForRole(role) {
        const needsDept = role !== 'ADMIN';
        deptSection.classList.toggle('hidden', !needsDept);
        deptSelect.required = needsDept;
        if (!needsDept) deptSelect.value = '';

        if (roleDescEl) roleDescEl.textContent = roleDescriptions[role] || '';
        if (idLabelEl) idLabelEl.textContent = idLabels[role] || 'Institutional ID';
        if (idInput) idInput.placeholder = idPlaceholders[role] || 'e.g. ID-001';
      }

      // Initialize for default role (STUDENT)
      updateFormForRole(roleSelect.value);

      roleSelect.addEventListener('change', () => updateFormForRole(roleSelect.value));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/users', {
            full_name: document.getElementById('usr-name').value.trim(),
            email: document.getElementById('usr-email').value.trim(),
            role: document.getElementById('usr-role').value,
            department_id: document.getElementById('usr-dept').value ? parseInt(document.getElementById('usr-dept').value, 10) : null,
            student_or_staff_id: document.getElementById('usr-id-code').value.trim() || null,
            phone: document.getElementById('usr-phone').value.trim() || null,
            password: document.getElementById('usr-pass').value,
          });
          closeModal();
          showToast('User account registered successfully.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  // Edit User Profile
  document.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-edit-user-id');
      try {
        const [users, departments] = await Promise.all([
          api.get('/users'),
          api.get('/departments'),
        ]);
        const targetUser = users.find(u => u.id == userId);
        if (!targetUser) {
          showToast('User not found.', 'error');
          return;
        }

        const roleDescriptions = {
          STUDENT: 'Requires department assignment. Can browse and request equipment.',
          FACULTY: 'Requires department assignment. Can browse and submit borrowing requests.',
          LAB_STAFF: 'Requires department assignment. Manages assets, approves requests, and records maintenance.',
          ADMIN: 'Institution-wide access. No department required.',
        };

        openModal({
          title: `Edit User Profile — ${targetUser.full_name}`,
          maxWidth: 'max-w-xl',
          content: `
            <form id="edit-user-form" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                <select id="edit-usr-role" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="STUDENT" ${targetUser.role === 'STUDENT' ? 'selected' : ''}>Student</option>
                  <option value="FACULTY" ${targetUser.role === 'FACULTY' ? 'selected' : ''}>Faculty</option>
                  <option value="LAB_STAFF" ${targetUser.role === 'LAB_STAFF' ? 'selected' : ''}>Lab Staff / Librarian</option>
                  <option value="ADMIN" ${targetUser.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                </select>
                <p id="edit-role-desc" class="mt-1.5 text-[11px] text-slate-500 leading-relaxed">${roleDescriptions[targetUser.role] || ''}</p>
              </div>

              <div id="edit-dept-field-section" class="${targetUser.role === 'ADMIN' ? 'hidden' : ''}">
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span class="text-rose-500">*</span>
                </label>
                <select id="edit-usr-dept" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Select Department —</option>
                  ${departments.map(d => `<option value="${d.id}" ${targetUser.department_id == d.id ? 'selected' : ''}>${d.code} — ${d.name}</option>`).join('')}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input type="text" id="edit-usr-name" value="${targetUser.full_name}" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input type="email" id="edit-usr-email" value="${targetUser.email}" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    <span id="edit-id-field-label">${targetUser.role === 'STUDENT' ? 'Student ID' : targetUser.role === 'FACULTY' ? 'Faculty ID' : targetUser.role === 'LAB_STAFF' ? 'Staff ID' : 'Admin ID'}</span>
                  </label>
                  <input type="text" id="edit-usr-id-code" value="${targetUser.student_or_staff_id || ''}" class="w-full text-xs p-2 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input type="text" id="edit-usr-phone" value="${targetUser.phone || ''}" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Change Password <span class="text-slate-400 font-normal">(leave blank to keep current password)</span></label>
                <input type="password" id="edit-usr-pass" minlength="6" placeholder="••••••••" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
                <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Update Profile</button>
              </div>
            </form>
          `,
        });

        const form = document.getElementById('edit-user-form');
        form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());

        const roleSelect = document.getElementById('edit-usr-role');
        const deptSection = document.getElementById('edit-dept-field-section');
        const deptSelect = document.getElementById('edit-usr-dept');
        const roleDescEl = document.getElementById('edit-role-desc');
        const idLabelEl = document.getElementById('edit-id-field-label');
        const idLabels = { STUDENT: 'Student ID', FACULTY: 'Faculty ID', LAB_STAFF: 'Staff ID', ADMIN: 'Admin ID' };

        roleSelect.addEventListener('change', () => {
          const role = roleSelect.value;
          const needsDept = role !== 'ADMIN';
          deptSection.classList.toggle('hidden', !needsDept);
          deptSelect.required = needsDept;
          if (!needsDept) deptSelect.value = '';
          if (roleDescEl) roleDescEl.textContent = roleDescriptions[role] || '';
          if (idLabelEl) idLabelEl.textContent = idLabels[role] || 'Institutional ID';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const payload = {
              full_name: document.getElementById('edit-usr-name').value.trim(),
              email: document.getElementById('edit-usr-email').value.trim(),
              role: document.getElementById('edit-usr-role').value,
              department_id: document.getElementById('edit-usr-dept').value ? parseInt(document.getElementById('edit-usr-dept').value, 10) : null,
              student_or_staff_id: document.getElementById('edit-usr-id-code').value.trim() || null,
              phone: document.getElementById('edit-usr-phone').value.trim() || null,
            };
            const newPass = document.getElementById('edit-usr-pass').value;
            if (newPass) payload.password = newPass;

            await api.put(`/users/${userId}`, payload);
            closeModal();
            showToast('User profile updated successfully.', 'success');
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

  // Toggle Active/Deactivate
  document.querySelectorAll('.btn-toggle-active').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-toggle-id');
      const userName = btn.getAttribute('data-user-name');
      const isActive = btn.getAttribute('data-active') === 'true';

      const action = isActive ? 'deactivate' : 'activate';
      if (!confirm(`Are you sure you want to ${action} the account for ${userName}?`)) {
        return;
      }

      try {
        await api.patch(`/users/${userId}/toggle-active`, {});
        showToast(`User account ${isActive ? 'deactivated' : 'activated'}.`, 'info');
        window.dispatchEvent(new CustomEvent('view:reload'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
