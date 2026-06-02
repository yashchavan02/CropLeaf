/** Password strength meter on registration. */
(function () {
  function initPasswordMeter() {
    const input = document.getElementById('id_password') || document.getElementById('password');
    const fill = document.querySelector('#passwordMeter .password-meter-fill');
    if (!input || !fill) return;

    input.addEventListener('input', function () {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      fill.style.width = (score / 4) * 100 + '%';
      fill.style.background = ['#E76F51', '#E76F51', '#D4AF37', '#2D6A4F'][Math.max(0, score - 1)] || '#e2e8f0';
    });
  }

  function initRememberMe() {
    const checkbox = document.getElementById('rememberMe');
    if (!checkbox) return;
    checkbox.checked = localStorage.getItem('cropleaf_remember') === '1';
    checkbox.addEventListener('change', function () {
      localStorage.setItem('cropleaf_remember', checkbox.checked ? '1' : '0');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPasswordMeter();
    initRememberMe();
  });
})();
