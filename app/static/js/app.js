function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'info');
  const iconMap = { success: 'circle-check', error: 'circle-x', info: 'info' };
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', iconMap[type] || iconMap.info);
  icon.style.width = '16px';
  icon.style.height = '16px';
  icon.style.flexShrink = '0';
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + message));
  container.appendChild(toast);
  if (typeof lucide !== 'undefined') lucide.createIcons({ els: [icon] });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function handleFileUpload(input, previewId, progressId, statusId, checkBtnId, analysisId) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')) {
    showToast('Please upload a valid image file (JPG, PNG, WebP).', 'error');
    input.value = '';
    return;
  }

  const preview = document.getElementById(previewId);
  if (preview) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = 'block';
      const textEl = preview.parentElement?.querySelector('.upload-text');
      if (textEl) textEl.textContent = file.name;
    };
    reader.readAsDataURL(file);
  }

  const btn = document.getElementById(checkBtnId);
  if (btn) btn.disabled = true;

  const wrapper = document.getElementById(progressId);
  if (wrapper) wrapper.style.display = 'block';

  const fill = wrapper?.querySelector('.progress-bar-fill');
  const statusEl = document.getElementById(statusId);
  if (statusEl) statusEl.textContent = 'Starting analysis...';

  const analysisEl = document.getElementById(analysisId);
  if (analysisEl) analysisEl.style.display = 'flex';

  const steps = analysisEl ? analysisEl.querySelectorAll('.analysis-step') : [];
  const labels = ['Analyzing leaf patterns...', 'Detecting disease characteristics...', 'Generating prediction...'];

  let progress = 0;
  let stepIndex = -1;

  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      if (btn) btn.disabled = false;
    }
    if (fill) fill.style.width = progress + '%';
    if (statusEl) statusEl.textContent = Math.round(progress) + '%';

    const newStep = Math.min(Math.floor(progress / 34), 2);
    if (newStep !== stepIndex && steps.length) {
      if (stepIndex >= 0) {
        if (steps[stepIndex]) steps[stepIndex].classList.remove('active');
        if (steps[stepIndex]) steps[stepIndex].classList.add('done');
      }
      stepIndex = newStep;
      if (steps[stepIndex]) {
        steps[stepIndex].classList.add('active');
        if (statusEl) statusEl.textContent = labels[stepIndex];
      }
    }
  }, 200);

  if (steps.length && steps[0]) steps[0].classList.add('active');
}

// Scroll reveal with Intersection Observer
document.addEventListener('DOMContentLoaded', function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
});
