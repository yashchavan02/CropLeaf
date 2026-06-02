/**
 * Plan upgrades and modals (session-based).
 */
(function () {
  const BUSINESS_EMAIL = 'officialyashchavan@gmail.com';

  function businessMailto(subject) {
    const sub = encodeURIComponent(subject || 'CropLeaf Plus Plan');
    const body = encodeURIComponent(
      'Hi CropLeaf team,\n\nI would like to discuss the Plus plan.\n\nThanks,'
    );
    return 'mailto:' + BUSINESS_EMAIL + '?subject=' + sub + '&body=' + body;
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove('show');
  }

  function initModals() {
    document.querySelectorAll('[data-open-upgrade]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('upgradeModal')?.classList.add('show');
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeModal(btn.dataset.closeModal || 'upgradeModal');
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) backdrop.classList.remove('show');
      });
    });
  }

  function initCancelFlow() {
    document.getElementById('cancelSubscriptionBtn')?.addEventListener('click', function () {
      document.getElementById('retentionModal')?.classList.add('show');
    });
    document.getElementById('retentionDowngrade')?.addEventListener('click', async function () {
      try {
        await CropLeafAPI.setPlan('free');
        closeModal('retentionModal');
        if (typeof showToast === 'function') showToast('Downgraded to Free plan.', 'success');
        window.location.reload();
      } catch (e) {
        if (typeof showToast === 'function') showToast(e.message || 'Could not downgrade', 'error');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initModals();
    initCancelFlow();
  });
})();
