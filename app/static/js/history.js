/**
 * History page — search, filters, grid/list.
 */
(function () {
  let viewMode = 'grid';
  let allItems = [];

  async function loadHistory() {
    if (!document.getElementById('historyRoot')) return;
    try {
      const data = await CropLeafAPI.getHistory({ limit: 50 });
      allItems = data.results || [];
    } catch (_) {
      allItems = [];
    }
    render(allItems);
  }

  function render(items) {
    const container = document.getElementById('historyItems');
    if (!container) return;
    if (!items.length) {
      container.innerHTML =
        '<p class="text-slate-500">No predictions yet. <a href="/predict/" class="text-accent font-semibold">Run your first diagnosis</a></p>';
      return;
    }
    if (viewMode === 'grid') {
      container.className = 'history-grid';
      container.innerHTML = items
        .map(function (item) {
          return (
            '<article class="history-item">' +
            '<img src="' +
            item.image_url +
            '" alt="" />' +
            '<div class="p-3">' +
            '<div class="font-semibold text-sm text-primary">' +
            item.disease +
            '</div>' +
            '<div class="text-xs text-slate-500">' +
            Math.round((item.confidence || 0) * 100) +
            '% · ' +
            formatDate(item.created_at) +
            '</div></div></article>'
          );
        })
        .join('');
    } else {
      container.className = 'flex flex-col gap-3';
      container.innerHTML = items
        .map(function (item) {
          return (
            '<div class="flex items-center gap-4 p-4 bg-white rounded-xl border">' +
            '<img src="' +
            item.image_url +
            '" class="w-16 h-16 rounded-lg object-cover" alt="" />' +
            '<div class="flex-1"><div class="font-semibold">' +
            item.disease +
            '</div><div class="text-sm text-slate-500">' +
            formatDate(item.created_at) +
            '</div></div>' +
            '<span class="badge badge-mild">' +
            (item.severity || '—') +
            '</span></div>'
          );
        })
        .join('');
    }
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return '';
    }
  }

  function initFilters() {
    document.querySelectorAll('.history-filter').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.history-filter').forEach(function (c) {
          c.classList.remove('active');
        });
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        let filtered = allItems.slice();
        if (filter === 'healthy') filtered = allItems.filter(function (i) { return i.healthy; });
        else if (filter === 'diseased') filtered = allItems.filter(function (i) { return !i.healthy; });
        else if (filter === '30days') {
          const cutoff = Date.now() - 30 * 86400000;
          filtered = allItems.filter(function (i) {
            return new Date(i.created_at).getTime() >= cutoff;
          });
        }
        render(filtered);
      });
    });

    document.getElementById('historySearch')?.addEventListener('input', function (e) {
      const q = e.target.value.toLowerCase();
      render(
        allItems.filter(function (i) {
          return (
            (i.disease || '').toLowerCase().includes(q) ||
            (i.crop_type || '').toLowerCase().includes(q)
          );
        })
      );
    });

    document.getElementById('viewGrid')?.addEventListener('click', function () {
      viewMode = 'grid';
      render(allItems);
    });
    document.getElementById('viewList')?.addEventListener('click', function () {
      viewMode = 'list';
      render(allItems);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadHistory();
    initFilters();
  });
})();
