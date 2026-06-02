/**
 * Prediction flow — upload, API, results.
 */
(function () {
  let currentFile = null;
  let previewDataUrl = null;
  let previewVisible = false;
  let rotation = 0;

  async function stripExif(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.92);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  function validateFile(file) {
    const max = 15 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file) return 'No file selected.';
    if (!allowed.includes(file.type)) {
      return 'Supported formats: JPG, PNG, WebP (max 15MB).';
    }
    if (file.size > max) return 'File exceeds 15MB limit.';
    return null;
  }

  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const STATUS_ICONS = {
    empty: 'image-plus',
    loading: 'loader-circle',
    ready: 'check-circle',
    error: 'alert-circle',
    analyzing: 'sparkles',
  };

  function setUploadStatus(state, opts) {
    opts = opts || {};
    const box = document.getElementById('uploadStatus');
    const title = document.getElementById('uploadStatusTitle');
    const detail = document.getElementById('uploadStatusDetail');
    const iconWrap = document.getElementById('uploadStatusIcon');
    const zone = document.getElementById('uploadZone');
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (!box) return;

    box.className = 'upload-status upload-status--' + state;

    const messages = {
      empty: {
        title: 'No image uploaded',
        detail: 'Drag & drop or choose a file to get started.',
      },
      loading: {
        title: 'Reading image…',
        detail: opts.name ? 'Processing "' + opts.name + '"…' : 'Please wait.',
      },
      ready: {
        title: 'Image uploaded successfully',
        detail: opts.name
          ? '"' + opts.name + '" (' + formatFileSize(opts.size) + ') — ready to analyze.'
          : 'Your image is ready. Click Analyze Now or preview it first.',
      },
      error: {
        title: 'Upload failed',
        detail: opts.message || 'Please try another image.',
      },
      analyzing: {
        title: 'Analyzing image…',
        detail: 'Running AI diagnosis. This may take a few seconds.',
      },
    };

    const msg = messages[state] || messages.empty;
    if (title) title.textContent = msg.title;
    if (detail) detail.textContent = msg.detail;

    if (iconWrap) {
      const iconName = STATUS_ICONS[state] || STATUS_ICONS.empty;
      iconWrap.innerHTML =
        '<i data-lucide="' + iconName + '" style="width:22px;height:22px;"></i>';
      if (typeof lucide !== 'undefined') lucide.createIcons({ els: [iconWrap] });
    }

    if (zone) zone.classList.toggle('has-file', state === 'ready' || state === 'analyzing');

    if (analyzeBtn) {
      analyzeBtn.disabled = state !== 'ready';
    }
  }

  function setPreviewVisible(visible) {
    previewVisible = visible;
    const container = document.getElementById('previewContainer');
    const btnText = document.getElementById('togglePreviewBtnText');
    if (container) container.classList.toggle('hidden', !visible);
    if (btnText) {
      btnText.textContent = visible ? 'Hide preview' : 'Preview uploaded image';
    }
    if (visible && previewDataUrl) {
      const preview = document.getElementById('previewImage');
      if (preview) {
        preview.src = previewDataUrl;
        preview.style.transform = 'rotate(' + rotation + 'deg)';
      }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function prepareUploadedFile(file) {
    const toggleBtn = document.getElementById('togglePreviewBtn');

    rotation = 0;
    setPreviewVisible(false);
    setUploadStatus('loading', { name: file.name });

    const reader = new FileReader();
    reader.onload = (e) => {
      previewDataUrl = e.target.result;
      setUploadStatus('ready', { name: file.name, size: file.size });
      if (typeof showToast === 'function') {
        showToast('Image uploaded. You can analyze or preview it.', 'success');
      }
    };
    reader.onerror = () => {
      currentFile = null;
      previewDataUrl = null;
      setUploadStatus('error', { message: 'Could not read this file. Please try again.' });
      if (toggleBtn) toggleBtn.classList.add('hidden');
    };
    reader.readAsDataURL(file);

    if (toggleBtn) toggleBtn.classList.remove('hidden');
  }

  function clearUpload() {
    currentFile = null;
    previewDataUrl = null;
    rotation = 0;
    setPreviewVisible(false);
    setUploadStatus('empty');
    const toggleBtn = document.getElementById('togglePreviewBtn');
    const input = document.getElementById('fileInput');
    const camera = document.getElementById('cameraInput');
    const preview = document.getElementById('previewImage');
    if (toggleBtn) toggleBtn.classList.add('hidden');
    if (input) input.value = '';
    if (camera) camera.value = '';
    if (preview) {
      preview.removeAttribute('src');
      preview.classList.add('hidden');
    }
    const zone = document.getElementById('uploadZone');
    if (zone) zone.classList.remove('has-file', 'has-preview');
  }

  function hideNewImageButtons() {
    document.querySelectorAll('.js-new-image-btn').forEach(function (btn) {
      btn.classList.add('hidden');
    });
  }

  function showNewImageButtons() {
    document.querySelectorAll('.js-new-image-btn').forEach(function (btn) {
      btn.classList.remove('hidden');
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function resetForNewPrediction() {
    clearUpload();
    hideNewImageButtons();

    const placeholder = document.getElementById('resultsPlaceholder');
    const results = document.getElementById('resultsPanel');
    const loading = document.getElementById('resultsLoading');
    if (placeholder) placeholder.classList.remove('hidden');
    if (results) results.classList.add('hidden');
    if (loading) loading.classList.add('hidden');

    document.querySelectorAll('.result-tabs .tab').forEach(function (t, i) {
      t.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('hidden', p.dataset.panel !== 'diagnosis');
    });

    const zone = document.getElementById('uploadZone');
    if (zone) {
      zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (typeof showToast === 'function') {
      showToast('Upload a new leaf image to run another diagnosis.', 'info');
    }
  }

  function initNewImageButtons() {
    document.querySelectorAll('.js-new-image-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        resetForNewPrediction();
        document.getElementById('fileInput')?.click();
      });
    });
  }

  function setAnalyzing(active) {
    const placeholder = document.getElementById('resultsPlaceholder');
    const loading = document.getElementById('resultsLoading');
    const results = document.getElementById('resultsPanel');
    if (placeholder) placeholder.classList.toggle('hidden', active);
    if (loading) loading.classList.toggle('hidden', !active);
    if (results && active) results.classList.add('hidden');
    if (active) animateLoadingSteps();
  }

  function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-step');
    const texts = [
      'Scanning leaf patterns...',
      'Comparing with disease database...',
      'Preparing results...',
    ];
    let i = 0;
    const label = document.getElementById('loadingStatusText');
    const interval = setInterval(() => {
      steps.forEach((s, idx) => {
        s.classList.toggle('font-semibold', idx === i);
        s.classList.toggle('text-accent', idx === i);
      });
      if (label) label.textContent = texts[i] || texts[texts.length - 1];
      i++;
      if (i > texts.length) clearInterval(interval);
    }, 900);
  }

  function severityClass(severity) {
    const s = (severity || 'mild').toLowerCase();
    if (s === 'none') return 'badge-mild';
    if (['severe', 'moderate', 'mild'].includes(s)) return 'badge-' + s;
    return 'badge-mild';
  }

  function renderResults(data) {
    setAnalyzing(false);
    const panel = document.getElementById('resultsPanel');
    if (!panel) return;
    panel.classList.remove('hidden');

    const diseaseEl = document.getElementById('resultDisease');
    const confEl = document.getElementById('resultConfidence');
    const severityEl = document.getElementById('resultSeverity');
    const treatmentEl = document.getElementById('tabTreatment');
    const preventionEl = document.getElementById('tabPrevention');
    const diagnosisEl = document.getElementById('tabDiagnosis');

    const pct = Math.round((data.confidence || 0) * 100);

    if (diseaseEl) diseaseEl.textContent = data.disease || 'Unknown';
    if (confEl) confEl.textContent = pct + '%';
    if (severityEl) {
      severityEl.textContent = data.severity || '—';
      severityEl.className = 'badge mt-2 ' + severityClass(data.severity);
    }
    if (diagnosisEl) {
      diagnosisEl.innerHTML =
        '<p><strong>' +
        (data.disease || 'Unknown') +
        '</strong> detected with ' +
        pct +
        '% model confidence.</p>';
    }
    if (treatmentEl) {
      treatmentEl.innerHTML = '<p>' + (data.treatment || '—') + '</p>';
    }
    if (preventionEl) {
      preventionEl.innerHTML = '<p>' + (data.prevention || '—') + '</p>';
    }

    updateConfidenceRing(data.confidence || 0);
    showNewImageButtons();

    if ((data.confidence || 1) < 0.6 && typeof showToast === 'function') {
      showToast(
        'Model is uncertain (confidence below 60%). Try a closer photo of the affected area.',
        'error'
      );
    }

    updateCreditsLabel();
    document.dispatchEvent(new CustomEvent('cropleaf:prediction-complete', { detail: data }));
  }

  async function updateCreditsLabel() {
    try {
      const user = await CropLeafAPI.getUser();
      const el = document.getElementById('creditsLabel');
      if (!el) return;
      if (user.plan === 'plus') {
        el.textContent = 'Unlimited predictions on your plan';
      } else {
        el.textContent =
          'Free plan: ' +
          (user.daily_remaining ?? 0) +
          '/' +
          (user.daily_limit ?? 7) +
          ' today · ' +
          (user.monthly_remaining ?? 0) +
          '/' +
          (user.monthly_limit ?? 49) +
          ' this month';
      }
    } catch (_) {}
  }

  function updateConfidenceRing(confidence) {
    const ring = document.getElementById('confidenceRing');
    if (!ring) return;
    const pct = Math.round(confidence * 100);
    const circ = 2 * Math.PI * 52;
    const offset = circ - confidence * circ;
    const circle = ring.querySelector('.ring-progress');
    const val = ring.querySelector('.ring-value');
    if (circle) {
      circle.setAttribute('stroke-dasharray', String(circ));
      circle.setAttribute('stroke-dashoffset', String(offset));
    }
    if (val) val.textContent = pct + '%';
  }

  async function analyze() {
    if (!currentFile) {
      if (typeof showToast === 'function') {
        showToast('No image detected. Please upload a clear leaf photo.', 'error');
      }
      return;
    }

    try {
      const user = await CropLeafAPI.getUser();
      if (
        user.plan === 'free' &&
        ((user.daily_remaining ?? 0) <= 0 || (user.monthly_remaining ?? 0) <= 0)
      ) {
        document.getElementById('upgradeModal')?.classList.add('show');
        if (typeof showToast === 'function') {
          showToast(
            (user.daily_remaining ?? 0) <= 0
              ? 'Daily limit reached (10/day). Upgrade to Plus or try tomorrow.'
              : 'Monthly limit reached (50/month). Upgrade to Plus for unlimited access.',
            'error'
          );
        }
        return;
      }
    } catch (_) {}

    const btn = document.getElementById('analyzeBtn');
    if (btn) btn.disabled = true;
    setUploadStatus('analyzing');
    setAnalyzing(true);

    try {
      const blob = await stripExif(currentFile);
      const fd = new FormData();
      fd.append('image', blob, 'leaf.jpg');
      const crop = document.getElementById('cropType');
      if (crop?.value) fd.append('crop_type', crop.value);

      const data = await CropLeafAPI.predict(fd);
      renderResults(data);
      if (currentFile) {
        setUploadStatus('ready', { name: currentFile.name, size: currentFile.size });
      }
      if (typeof showToast === 'function') showToast('Diagnosis complete!', 'success');
    } catch (err) {
      if (err.status === 429) {
        document.getElementById('upgradeModal')?.classList.add('show');
      } else if (typeof showToast === 'function') {
        showToast(err.message || 'Analysis failed.', 'error');
      }
      setAnalyzing(false);
      if (currentFile) {
        setUploadStatus('ready', { name: currentFile.name, size: currentFile.size });
      }
    } finally {
      if (btn && currentFile) btn.disabled = false;
    }
  }

  function initDropZone() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    const camera = document.getElementById('cameraInput');
    if (!zone || !input) return;

    zone.addEventListener('click', (e) => {
      if (e.target.closest('[data-camera-trigger]')) return;
      input.click();
    });
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => handleFile(input.files[0]));
    if (camera) {
      camera.addEventListener('change', () => handleFile(camera.files[0]));
    }
  }

  function handleFile(file) {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      clearUpload();
      setUploadStatus('error', { message: err });
      if (typeof showToast === 'function') showToast(err, 'error');
      return;
    }
    currentFile = file;
    prepareUploadedFile(file);
  }

  function initPreviewToggle() {
    document.getElementById('togglePreviewBtn')?.addEventListener('click', () => {
      if (!previewDataUrl) return;
      setPreviewVisible(!previewVisible);
    });
  }

  function initTabs() {
    document.querySelectorAll('.result-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        document.querySelectorAll('.result-tabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach((p) => {
          p.classList.toggle('hidden', p.dataset.panel !== name);
        });
      });
    });
  }

  function initRotate() {
    document.getElementById('rotateBtn')?.addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      const img = document.getElementById('previewImage');
      if (img) img.style.transform = 'rotate(' + rotation + 'deg)';
    });
  }

  function loadExampleImage() {
    document.getElementById('useExampleBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = document.getElementById('useExampleBtn')?.dataset.example;
      if (!url) return;
      try {
        setUploadStatus('loading', { name: 'example.jpg' });
        const res = await fetch(url);
        if (!res.ok) throw new Error('Could not load example');
        const blob = await res.blob();
        currentFile = new File([blob], 'example-leaf.jpg', { type: 'image/jpeg' });
        prepareUploadedFile(currentFile);
      } catch (_) {
        setUploadStatus('error', { message: 'Could not load the example image.' });
        if (typeof showToast === 'function') showToast('Could not load example image.', 'error');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('uploadZone')) return;
    initDropZone();
    initTabs();
    initRotate();
    initPreviewToggle();
    initNewImageButtons();
    hideNewImageButtons();
    loadExampleImage();
    document.getElementById('analyzeBtn')?.addEventListener('click', analyze);
    updateCreditsLabel();
    setUploadStatus('empty');
  });

  window.CropLeafPredict = { analyze, renderResults };
})();
