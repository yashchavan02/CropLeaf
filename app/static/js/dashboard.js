/**
 * Dashboard — stats, recent history, usage meter.
 */
(function () {
  async function loadDashboard() {
    const container = document.getElementById('dashboardRoot');
    if (!container) return;

    try {
      const [user, history] = await Promise.all([
        CropLeafAPI.getUser(),
        CropLeafAPI.getHistory({ limit: 5 }),
      ]);

      const name = user.name || user.username || 'Farmer';
      const welcome = document.getElementById('welcomeName');
      if (welcome) welcome.textContent = name;

      setStat('statPredictions', user.predictions_used ?? history.count ?? 0);
      setStat('statTrialDays', user.trial_days_left ?? '—');

      const diseases = (history.results || [])
        .filter((h) => !h.healthy)
        .map((h) => h.disease);
      const top = mode(diseases) || '—';
      setStat('statTopDisease', top);

      const confidences = (history.results || []).map((h) => h.confidence);
      const avg =
        confidences.length > 0
          ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
          : 92;
      setStat('statConfidence', avg + '%');

      renderRecent(history.results || []);
      updateUsageBar(user);
      const banner = document.getElementById('upgradeBanner');
      if (banner) banner.classList.toggle('hidden', user.plan !== 'free');
    } catch (e) {
      console.warn('Dashboard load:', e);
    }
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function mode(arr) {
    if (!arr.length) return null;
    const counts = {};
    arr.forEach((x) => (counts[x] = (counts[x] || 0) + 1));
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }

  function renderRecent(items) {
    const list = document.getElementById('recentPredictions');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<p class="text-slate-500 text-sm">No predictions yet. <a href="/predict/" class="text-accent font-semibold">Start your first diagnosis</a></p>';
      return;
    }
    list.innerHTML = items
      .map(
        (item) => `
      <a href="/history/?id=${item.id}" class="flex items-center gap-4 p-3 rounded-xl bg-white border border-slate-200 hover:shadow-md transition">
        <img src="${item.image_url}" alt="" class="w-14 h-14 rounded-lg object-cover" />
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-primary truncate">${item.disease}</div>
          <div class="text-xs text-slate-500">${formatDate(item.created_at)} · ${Math.round(item.confidence * 100)}%</div>
        </div>
        <span class="badge badge-${(item.severity || 'mild').toLowerCase()}">${item.severity}</span>
      </a>`
      )
      .join('');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return iso;
    }
  }

  function updateUsageBar(user) {
    const el = document.getElementById('usageMeterFill');
    const label = document.getElementById('usageMeterLabel');
    if (!el) return;
    if (user.plan === 'plus') {
      if (label) label.textContent = `${capitalize(user.plan)} Plan — Unlimited predictions`;
      el.style.width = '100%';
      return;
    }
    const monthlyUsed = user.monthly_used ?? 0;
    const monthlyLimit = user.monthly_limit ?? 49;
    const pct = Math.min(100, (monthlyUsed / monthlyLimit) * 100);
    el.style.width = pct + '%';
    if (label) {
      label.textContent =
        'Free — Today ' +
        (user.daily_remaining ?? 0) +
        '/' +
        (user.daily_limit ?? 7) +
        ' · Month ' +
        (user.monthly_remaining ?? 0) +
        '/' +
        (user.monthly_limit ?? 49);
    }
  }

  function capitalize(s) {
    return (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
  }

  function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('dashSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop?.classList.toggle('hidden');
      });
    }
    backdrop?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      backdrop.classList.add('hidden');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboardRoot')) {
      loadDashboard();
    }
    initSidebar();
  });

  window.CropLeafDashboard = { loadDashboard };
})();
