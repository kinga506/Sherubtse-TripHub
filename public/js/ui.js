// Small accessible interface behaviors; no API calls or trip data changes.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-mobile-nav]');
  if (toggle && nav) {
    const setOpen = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  }
  const toastRegion = document.getElementById('toast-region');
  function showToast(message) {
    if (!toastRegion) return;
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    const text = document.createElement('span'); text.textContent = message;
    const close = document.createElement('button'); close.type='button'; close.className='toast-close'; close.setAttribute('aria-label','Dismiss notification'); close.textContent='×';
    close.addEventListener('click', () => toast.remove());
    toast.append(text, close); toastRegion.appendChild(toast);
    close.focus();
  }
  document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
  document.querySelectorAll('[data-dialog-open]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }));
  document.querySelectorAll('[data-demo-form]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.reportValidity()) showToast('Demo form validated. Nothing was submitted.');
  }));
});


document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('registration-modal');

  if (!modal) return;

  const title = document.getElementById('registration-modal-title');
  const message = document.getElementById('registration-modal-message');
  const confirmButton = document.getElementById('registration-modal-confirm');
  const cancelButton = document.getElementById('registration-modal-cancel');

  let pendingForm = null;

  const messages = {
    open: {
      title: 'Open Trip Registration?',
      message: 'Eligible students will be able to submit requests to join this trip.',
      button: 'Open Registration'
    },
    close: {
      title: 'Close Trip Registration?',
      message: 'New student participation requests will no longer be accepted.',
      button: 'Close Registration'
    },
    reopen: {
      title: 'Reopen Available Slots?',
      message: 'Available vacancies will become accessible to eligible students again.',
      button: 'Reopen Slots'
    }
  };

  document.addEventListener('submit', function (event) {
    const form = event.target;

    if (!form.matches('[data-registration-confirm]')) return;

    const action = form.dataset.registrationConfirm;
    const info = messages[action];

    if (!info) return;

    event.preventDefault();

    pendingForm = form;

    title.textContent = info.title;
    message.textContent = info.message;
    confirmButton.textContent = info.button;

    modal.showModal();
  });

  cancelButton.addEventListener('click', function () {
    modal.close();
  });

  modal.addEventListener('close', function () {
    pendingForm = null;
  });

  confirmButton.addEventListener('click', function () {
    if (!pendingForm) return;

    const form = pendingForm;

    pendingForm = null;
    modal.close();

    // Submit directly after confirmation.
    form.submit();
  });
});
