import { api } from '../api.js';
import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export async function renderDepartments() {
  const user = auth.getUser();
  if (!user) return '<div class="p-6">Please log in.</div>';

  const departments = await api.get('/departments');
  const isAdmin = user.role === 'ADMIN';

  return `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Academic Departments & Laboratories</h1>
          <p class="text-xs text-slate-500 mt-0.5">Institutional organizational hierarchy and specialized laboratory facilities</p>
        </div>
        ${isAdmin ? `
          <div class="flex items-center gap-2">
            <button id="btn-add-dept" class="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors">
              + New Department
            </button>
            <button id="btn-add-lab" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors">
              + New Laboratory
            </button>
          </div>
        ` : ''}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${departments.map(d => `
          <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  ${d.code}
                </span>
                <span class="text-xs text-slate-400 font-medium">
                  ${(d.laboratories || []).length} Labs
                </span>
              </div>
              <h3 class="font-bold text-base text-slate-900 tracking-tight mb-1.5">${d.name}</h3>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">${d.description || 'Department facility.'}</p>

              <div class="space-y-2 border-t border-slate-100 pt-3">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Laboratories:</div>
                <div class="space-y-1.5">
                  ${(d.laboratories || []).length === 0 ? `
                    <div class="text-xs text-slate-400 italic">No laboratories registered yet.</div>
                  ` : d.laboratories.map(lab => `
                    <div class="p-2 bg-slate-50 border border-slate-200/80 rounded flex items-center justify-between text-xs">
                      <div>
                        <div class="font-semibold text-slate-800">${lab.name}</div>
                        <div class="text-[11px] text-slate-500">${lab.location || 'Location unassigned'}</div>
                      </div>
                      <span class="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">${lab.code}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function attachDepartmentListeners() {
  const addDeptBtn = document.getElementById('btn-add-dept');
  if (addDeptBtn) {
    addDeptBtn.addEventListener('click', () => {
      openModal({
        title: 'Add New Academic Department',
        content: `
          <form id="create-dept-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
              <input type="text" id="dept-code" required placeholder="e.g. MECH, CIVIL, CHEM" class="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
              <input type="text" id="dept-name" required placeholder="e.g. Mechanical Engineering" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea id="dept-desc" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Save Department</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('create-dept-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/departments', {
            code: document.getElementById('dept-code').value.trim().toUpperCase(),
            name: document.getElementById('dept-name').value.trim(),
            description: document.getElementById('dept-desc').value.trim() || null,
          });
          closeModal();
          showToast('Department created successfully.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  const addLabBtn = document.getElementById('btn-add-lab');
  if (addLabBtn) {
    addLabBtn.addEventListener('click', async () => {
      const departments = await api.get('/departments');
      openModal({
        title: 'Register New Laboratory',
        content: `
          <form id="create-lab-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <select id="lab-dept" required class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                ${departments.map(d => `<option value="${d.id}">${d.code} - ${d.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Laboratory Code *</label>
              <input type="text" id="lab-code" required placeholder="e.g. LAB-VLSI" class="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Laboratory Name *</label>
              <input type="text" id="lab-name" required placeholder="e.g. VLSI Design & Microelectronics Lab" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Building & Room Location</label>
              <input type="text" id="lab-loc" placeholder="e.g. Block B, Room 204" class="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="btn-cancel px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" class="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs">Save Laboratory</button>
            </div>
          </form>
        `,
      });

      const form = document.getElementById('create-lab-form');
      form.querySelector('.btn-cancel').addEventListener('click', () => closeModal());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/departments/laboratories', {
            department_id: parseInt(document.getElementById('lab-dept').value, 10),
            code: document.getElementById('lab-code').value.trim().toUpperCase(),
            name: document.getElementById('lab-name').value.trim(),
            location: document.getElementById('lab-loc').value.trim() || null,
          });
          closeModal();
          showToast('Laboratory registered successfully.', 'success');
          window.dispatchEvent(new CustomEvent('view:reload'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
}
