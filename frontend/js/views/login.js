import { auth } from '../auth.js';
import { showToast } from '../components/toast.js';

// Demo profiles — clicking fills fields only; user must click Sign In
const DEMO_PROFILES = [
  {
    icon: '👑',
    label: 'Admin',
    name: 'Dr. Eleanor Vance',
    dept: 'Central Administration',
    email: 'admin@college.edu',
    password: 'Admin@123',
    accent: 'border-rose-300 bg-rose-50/60 hover:bg-rose-100/60',
    textAccent: 'text-rose-800',
    subAccent: 'text-rose-600',
  },
  {
    icon: '📚',
    label: 'Librarian',
    name: 'Ms. Priya Raghavan',
    dept: 'Central Library',
    email: 'librarian@college.edu',
    password: 'Library@123',
    accent: 'border-amber-300 bg-amber-50/60 hover:bg-amber-100/60',
    textAccent: 'text-amber-900',
    subAccent: 'text-amber-700',
  },
  {
    icon: '🔬',
    label: 'Lab Staff — CSE',
    name: 'Robert Sterling',
    dept: 'Computer Science & Engineering',
    email: 'staff.cse@college.edu',
    password: 'Staff@123',
    accent: 'border-purple-300 bg-purple-50/60 hover:bg-purple-100/60',
    textAccent: 'text-purple-900',
    subAccent: 'text-purple-600',
  },
  {
    icon: '🔬',
    label: 'Lab Staff — ECE',
    name: 'Dr. Meera Nambiar',
    dept: 'Electronics & Communication',
    email: 'staff.ece@college.edu',
    password: 'Staff@123',
    accent: 'border-purple-300 bg-purple-50/60 hover:bg-purple-100/60',
    textAccent: 'text-purple-900',
    subAccent: 'text-purple-600',
  },
  {
    icon: '🔬',
    label: 'Lab Staff — AIML',
    name: 'Dr. Riya Khanna',
    dept: 'AI & Machine Learning',
    email: 'staff.aiml@college.edu',
    password: 'Staff@123',
    accent: 'border-purple-300 bg-purple-50/60 hover:bg-purple-100/60',
    textAccent: 'text-purple-900',
    subAccent: 'text-purple-600',
  },
  {
    icon: '🎓',
    label: 'Faculty — CSE',
    name: 'Prof. Alan Turing',
    dept: 'Computer Science & Engineering',
    email: 'faculty.cse@college.edu',
    password: 'Faculty@123',
    accent: 'border-blue-300 bg-blue-50/60 hover:bg-blue-100/60',
    textAccent: 'text-blue-900',
    subAccent: 'text-blue-600',
  },
  {
    icon: '🎒',
    label: 'Student — CSE',
    name: 'Rahul Sharma',
    dept: 'Computer Science & Engineering',
    email: 'student.cse@college.edu',
    password: 'Student@123',
    accent: 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60',
    textAccent: 'text-emerald-900',
    subAccent: 'text-emerald-600',
  },
  {
    icon: '🎒',
    label: 'Student — ECE',
    name: 'Ananya Iyer',
    dept: 'Electronics & Communication',
    email: 'student.ece@college.edu',
    password: 'Student@123',
    note: '⚠ Overdue item',
    accent: 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60',
    textAccent: 'text-emerald-900',
    subAccent: 'text-emerald-600',
  },
];

export function renderLogin() {
  const profileCards = DEMO_PROFILES.map((p, i) => `
    <button type="button"
      class="demo-profile-card w-full text-left p-2.5 rounded-lg border ${p.accent} transition-all duration-150 cursor-pointer group"
      data-demo-index="${i}">
      <div class="flex items-start gap-2">
        <span class="text-base leading-none mt-0.5">${p.icon}</span>
        <div class="min-w-0">
          <div class="text-[11px] font-bold ${p.textAccent} leading-tight truncate">${p.label}</div>
          <div class="text-[10px] ${p.subAccent} font-medium truncate">${p.name}</div>
          <div class="text-[10px] text-slate-400 truncate">${p.dept}</div>
          ${p.note ? `<div class="text-[10px] text-rose-600 font-semibold mt-0.5">${p.note}</div>` : ''}
        </div>
      </div>
    </button>
  `).join('');

  return `
    <div class="min-h-screen bg-slate-900 flex items-stretch">

      <!-- Left Panel: Demo Profile Cards -->
      <div class="hidden lg:flex flex-col w-72 xl:w-80 bg-slate-800 border-r border-slate-700 p-5 shrink-0">
        <!-- Branding -->
        <div class="flex items-center gap-3 mb-5">
          <img src="/static/assets/logo.svg" alt="AssetIQ" class="h-9 w-9 drop-shadow-md">
          <div>
            <div class="text-sm font-extrabold text-white tracking-tight">AssetIQ</div>
            <div class="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Asset Management Portal</div>
          </div>
        </div>

        <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-2 px-0.5">
          ⚡ Project Evaluation — Quick Fill
        </div>
        <p class="text-[10px] text-slate-500 mb-3 px-0.5 leading-relaxed">
          Click a profile to fill credentials into the login form, then press <strong class="text-slate-300">Sign In</strong>.
        </p>

        <div class="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-0.5">
          ${profileCards}
        </div>

        <div class="mt-4 pt-3 border-t border-slate-700">
          <p class="text-[10px] text-slate-500 text-center leading-relaxed">
            AssetIQ v1.0 • College Laboratory &amp;<br>Institutional Asset Management System
          </p>
        </div>
      </div>

      <!-- Center: Login Form -->
      <div class="flex flex-1 flex-col justify-center items-center px-6 py-12">
        <!-- Logo for mobile (hidden on lg+) -->
        <div class="lg:hidden text-center mb-8">
          <img src="/static/assets/logo.svg" alt="AssetIQ" class="mx-auto h-14 w-14 drop-shadow-md">
          <h2 class="mt-3 text-2xl font-extrabold text-white tracking-tight">AssetIQ Portal</h2>
          <p class="mt-1 text-xs text-slate-400 font-medium tracking-wide uppercase">
            Smart Inventory &amp; Institutional Asset Management
          </p>
        </div>

        <div class="w-full max-w-sm">
          <!-- Login Card -->
          <div class="bg-white rounded-xl shadow-2xl border border-slate-200 p-8">
            <!-- Desktop heading inside card -->
            <div class="hidden lg:block mb-6 text-center">
              <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Sign in to AssetIQ</h2>
              <p class="text-xs text-slate-500 mt-1">Enter your institutional credentials below</p>
            </div>

            <form id="login-form" class="space-y-4">
              <div>
                <label for="login-email" class="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
                <input id="login-email" type="email" required placeholder="name@college.edu"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
              </div>

              <div>
                <label for="login-password" class="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input id="login-password" type="password" required placeholder="••••••••"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
              </div>

              <!-- Selected profile indicator (shown when a demo profile is clicked) -->
              <div id="selected-profile-hint" class="hidden rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 font-medium">
                ✓ Credentials filled — click <strong>Sign In</strong> to continue
              </div>

              <div>
                <button type="submit"
                  class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                  Sign In to Portal
                </button>
              </div>
            </form>
          </div>

          <!-- Mobile quick-fill cards (only visible below lg) -->
          <div class="lg:hidden mt-6">
            <p class="text-[11px] text-slate-400 text-center mb-3 font-semibold tracking-wide uppercase">⚡ Quick Fill for Evaluation</p>
            <div class="grid grid-cols-2 gap-2">
              ${DEMO_PROFILES.map((p, i) => `
                <button type="button"
                  class="demo-profile-card text-left p-2 rounded border ${p.accent} transition-colors"
                  data-demo-index="${i}">
                  <div class="text-[11px] font-bold ${p.textAccent}">${p.icon} ${p.label}</div>
                  <div class="text-[10px] ${p.subAccent}">${p.name}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <p class="mt-5 text-center text-[11px] text-slate-500">
            Department of Computer Science &amp; Engineering &bull; AssetIQ v1.0 Production
          </p>
        </div>
      </div>
    </div>
  `;
}

export function attachLoginListeners() {
  // Login form submit
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      try {
        await auth.login(email, pass);
      } catch (err) {
        // handled in auth
      }
    });
  }

  // Demo profile cards — fill fields only, do NOT auto-login
  document.querySelectorAll('.demo-profile-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-demo-index'), 10);
      const profile = DEMO_PROFILES[idx];
      if (!profile) return;

      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-password');
      const hint = document.getElementById('selected-profile-hint');

      if (emailEl) emailEl.value = profile.email;
      if (passEl) passEl.value = profile.password;
      if (hint) hint.classList.remove('hidden');

      // Visual selected state: reset all cards then highlight clicked
      document.querySelectorAll('.demo-profile-card').forEach(c => {
        c.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1');
      });
      card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
    });
  });
}
