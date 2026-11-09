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
  function showToast(message, focus=true) {
    if (!toastRegion) return;
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    const text = document.createElement('span'); text.textContent = message;
    const close = document.createElement('button'); close.type='button'; close.className='toast-close'; close.setAttribute('aria-label','Dismiss notification'); close.textContent='×';
    close.addEventListener('click', () => toast.remove());
    toast.append(text, close); toastRegion.appendChild(toast);
    if (focus) close.focus();
  }
  document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
  document.querySelectorAll('[data-toast-on-load]').forEach(source => showToast(source.textContent.trim(), false));
  document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const field = document.getElementById(button.getAttribute('aria-controls'));
    if (!field) return;
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide password' : 'Show password';
    button.setAttribute('aria-pressed', String(show));
  }));
  document.querySelectorAll('[data-login-form]').forEach(form => form.addEventListener('submit', () => {
    const submit = form.querySelector('[data-login-submit]');
    const status = form.querySelector('[data-login-loading]');
    if (submit) { submit.disabled = true; submit.textContent = 'Logging in…'; }
    if (status) status.textContent = 'Signing you in…';
    form.setAttribute('aria-busy', 'true');
  }));
  document.querySelectorAll('[data-dialog-open]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }));
  document.querySelectorAll('[data-demo-form]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.reportValidity()) showToast('Demo form validated. Nothing was submitted.');
  }));
  const visibilityDialog=document.getElementById('public-visibility-modal');
  if(visibilityDialog){
    const visibilityForm=document.getElementById('public-visibility-form');
    const actionField=document.getElementById('public-visibility-action');
    const title=document.getElementById('public-visibility-modal-title');
    const message=document.getElementById('public-visibility-modal-message');
    const warning=document.getElementById('public-visibility-registration-warning');
    const confirm=document.getElementById('public-visibility-confirm');
    const reason=document.getElementById('public-visibility-reason');
    document.querySelectorAll('[data-public-visibility-trigger]').forEach(button=>button.addEventListener('click',()=>{
      const tripId=button.dataset.tripId;
      const action=button.dataset.nextAction;
      if(!/^\d+$/.test(tripId)||!['hide','show'].includes(action))return;
      visibilityForm.action=`/workspace/trips/${tripId}/public-visibility`;
      actionField.value=action;
      title.textContent=action==='hide'?'Hide this trip from College Trips?':'Show this trip on College Trips?';
      message.textContent=action==='hide'
        ?'The trip will disappear from the public College Trips page. This will not cancel the trip, close registration, or change existing participant records or internal trip management.'
        :'The trip will return to College Trips only if it still meets the public eligibility rules. The server checks its status again when you confirm.';
      warning.hidden=!(action==='hide'&&button.dataset.registrationOpen==='true');
      reason.value='';
      confirm.textContent=action==='hide'?'Hide trip':'Show trip';
      visibilityDialog.showModal();
    }));
    visibilityDialog.querySelector('[data-public-visibility-cancel]').addEventListener('click',()=>visibilityDialog.close());
    visibilityDialog.addEventListener('close',()=>{reason.value='';});
  }
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
