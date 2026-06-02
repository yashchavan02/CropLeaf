/**
 * First-time onboarding modal (dashboard).
 */
(function () {
  const STORAGE_KEY = 'cropleaf_onboarding';

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function setState(patch) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getState(), ...patch }));
  }

  function showError(el, message) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function initOnboardingForm() {
    const form = document.getElementById('onboardingForm');
    if (!form) return;

    let step = 1;
    const step1 = document.getElementById('onboardingStep1');
    const step2 = document.getElementById('onboardingStep2');
    const cropsSelect = document.getElementById('onboardingCrops');
    const referralSelect = document.getElementById('onboardingReferral');
    const submitBtn = document.getElementById('onboardingSubmitBtn');
    const error1 = document.getElementById('onboardingError1');
    const error2 = document.getElementById('onboardingError2');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showError(error1, '');
      showError(error2, '');

      if (step === 1) {
        const crop = cropsSelect?.value?.trim();
        if (!crop) {
          showError(error1, 'Please select a crop to continue.');
          cropsSelect?.focus();
          return;
        }
        step1?.classList.add('hidden');
        step2?.classList.remove('hidden');
        if (cropsSelect) cropsSelect.disabled = true;
        if (referralSelect) {
          referralSelect.disabled = false;
          referralSelect.required = true;
        }
        if (submitBtn) submitBtn.textContent = 'Finish';
        step = 2;
        referralSelect?.focus();
        return;
      }

      const referral = referralSelect?.value?.trim();
      if (!referral) {
        showError(error2, 'Please select how you heard about us.');
        referralSelect?.focus();
        return;
      }

      setState({
        completed: true,
        crops: cropsSelect?.value,
        referral: referral,
      });
      document.getElementById('onboardingModal')?.classList.remove('show');
      window.location.href = '/predict/';
    });
  }

  function celebrateFirstPrediction() {
    document.addEventListener('cropleaf:prediction-complete', function () {
      const state = getState();
      if (state.firstPredictionDone) return;
      setState({ firstPredictionDone: true });
      if (typeof showToast === 'function') {
        showToast('First diagnosis complete!', 'success');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    celebrateFirstPrediction();

    const modal = document.getElementById('onboardingModal');
    if (!modal) return;

    initOnboardingForm();

    const state = getState();
    if (!state.completed) {
      setTimeout(function () {
        modal.classList.add('show');
      }, 500);
    }
  });
})();
