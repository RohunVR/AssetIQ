// Modal Manager for AssetIQ

let currentModal = null;

export function openModal({ title, content, maxWidth = 'max-w-xl', onClose = null }) {
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'active-modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-content ${maxWidth} bg-white shadow-2xl rounded-lg border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-800 flex items-center gap-2">
          ${title}
        </h3>
        <button id="modal-close-btn" class="text-slate-400 hover:text-slate-600 rounded-md p-1 focus:outline-none transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto max-h-[75vh]" id="modal-body-container">
        ${content}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  const closeBtn = backdrop.querySelector('#modal-close-btn');
  closeBtn.addEventListener('click', () => closeModal(onClose));

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal(onClose);
    }
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(onClose);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  currentModal = { backdrop, onClose, escHandler };
  return backdrop;
}

export function closeModal(callback = null) {
  if (currentModal) {
    if (currentModal.escHandler) {
      document.removeEventListener('keydown', currentModal.escHandler);
    }
    if (currentModal.backdrop && currentModal.backdrop.parentNode) {
      currentModal.backdrop.parentNode.removeChild(currentModal.backdrop);
    }
    document.body.style.overflow = '';
    const cb = callback || currentModal.onClose;
    if (typeof cb === 'function') {
      cb();
    }
    currentModal = null;
  }
}
