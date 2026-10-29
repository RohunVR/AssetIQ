import { auth } from '../auth.js';

export function renderSidebar(currentTab = 'dashboard') {
  const user = auth.getUser();
  if (!user) return '';

  const role = user.role;
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'LAB_STAFF';
  const isStudentOrFaculty = role === 'STUDENT' || role === 'FACULTY';

  const navItem = (id, label, iconSvg, badgeCount = 0) => {
    const isActive = currentTab === id;
    const activeClasses = isActive
      ? 'bg-blue-800 text-white font-semibold shadow-sm'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white';
    
    return `
      <li>
        <a href="#/${id}" data-tab="${id}" class="nav-link flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm transition-all duration-150 ${activeClasses}">
          <div class="flex items-center gap-3">
            <span class="w-5 h-5 flex-shrink-0 opacity-80">${iconSvg}</span>
            <span>${label}</span>
          </div>
          ${badgeCount > 0 ? `<span class="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">${badgeCount}</span>` : ''}
        </a>
      </li>
    `;
  };

  return `
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-screen sticky top-0 text-slate-200 select-none">
      <!-- Header / Crest -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <img src="/static/assets/logo.svg" alt="AssetIQ Crest" class="w-10 h-10 flex-shrink-0 drop-shadow">
        <div>
          <h1 class="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            AssetIQ
            <span class="text-[10px] bg-blue-600/30 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded font-mono font-medium">v1.0</span>
          </h1>
          <p class="text-[11px] text-slate-400 font-medium tracking-wide uppercase">College Laboratory Portal</p>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <!-- Section: Overview -->
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overview</div>
          <ul class="space-y-1">
            ${navItem(
              'dashboard',
              'Dashboard',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`
            )}
          </ul>
        </div>

        <!-- Section: Browse Assets -->
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Browse Assets</div>
          <ul class="space-y-1">
            ${navItem(
              'lab-assets',
              'Lab Assets',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`
            )}
            ${navItem(
              'library-assets',
              'Library Assets',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`
            )}
          </ul>
        </div>

        <!-- Section: Equipment & Stock (Staff/Admin management) -->
        ${(isAdmin || isStaff) ? `
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inventory & Stock</div>
          <ul class="space-y-1">
            ${navItem(
              'inventory',
              'Consumables Inventory',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
            )}
          </ul>
        </div>
        ` : ''}

        <!-- Section: Operations -->
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operations & Workflow</div>
          <ul class="space-y-1">
            ${(isAdmin || isStaff) ? navItem(
              'borrowing',
              'Borrowing & Returns',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`
            ) : navItem(
              'my-loans',
              'My Requests & Loans',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`
            )}
            ${(isAdmin || isStaff) ? navItem(
              'maintenance',
              'Maintenance Records',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
            ) : ''}
          </ul>
        </div>

        <!-- Section: Administration (Admin Only) -->
        ${isAdmin ? `
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Administration</div>
          <ul class="space-y-1">
            ${navItem(
              'users',
              'User Directory',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
            )}
            ${navItem(
              'departments',
              'Departments & Labs',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`
            )}
            ${navItem(
              'settings',
              'Borrowing Limits',
              `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>`
            )}
          </ul>
        </div>
        ` : ''}
      </div>

      <!-- User Profile Card in Footer -->
      <div class="p-3 border-t border-slate-800 bg-slate-950/60">
        <div class="flex items-center justify-between p-2 rounded-md bg-slate-800/60 border border-slate-700/60">
          <div class="min-w-0 pr-2">
            <div class="text-xs font-semibold text-white truncate">${user.full_name}</div>
            <div class="text-[11px] text-slate-400 truncate">${user.department_name || user.role}</div>
          </div>
          <button id="sidebar-logout-btn" title="Sign Out" class="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>
  `;
}
