/**
 * Reports — Chart.js from real prediction history (Plus).
 */
(function () {
  async function initReports() {
    const canvas = document.getElementById('diseaseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const gate = document.getElementById('reportsProGate');
    const content = document.getElementById('reportsContent');
    const user = await CropLeafAPI.getUser().catch(() => ({ plan: 'free' }));

    if (user.plan === 'free') {
      gate?.classList.remove('hidden');
      content?.classList.add('hidden');
      return;
    }

    gate?.classList.add('hidden');
    content?.classList.remove('hidden');

    let items = [];
    try {
      const data = await CropLeafAPI.getHistory({ limit: 100 });
      items = data.results || [];
    } catch (_) {}

    const summaryEl = document.getElementById('reportsSummary');
    if (!items.length) {
      if (summaryEl) {
        summaryEl.textContent = 'Run more predictions to populate analytics.';
      }
      return;
    }

    const counts = {};
    items.forEach(function (i) {
      const name = i.disease || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const values = Object.values(counts);

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Detections',
            data: values,
            backgroundColor: '#2D6A4F',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });

    const confidences = items.map(function (i) { return Math.round((i.confidence || 0) * 100); });
    const avg = Math.round(confidences.reduce(function (a, b) { return a + b; }, 0) / confidences.length);

    const trendCanvas = document.getElementById('confidenceChart');
    if (trendCanvas) {
      new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: items.slice(0, 10).reverse().map(function (_, idx) { return '#' + (idx + 1); }),
          datasets: [
            {
              label: 'Confidence %',
              data: confidences.slice(0, 10).reverse(),
              borderColor: '#D4AF37',
              tension: 0.3,
            },
          ],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }

    const statTotal = document.getElementById('statReportTotal');
    const statCommon = document.getElementById('statReportCommon');
    const statAvg = document.getElementById('statReportAvg');
    if (statTotal) statTotal.textContent = String(items.length);
    if (statCommon) statCommon.textContent = labels.sort(function (a, b) { return counts[b] - counts[a]; })[0] || '—';
    if (statAvg) statAvg.textContent = avg + '%';
  }

  document.addEventListener('DOMContentLoaded', initReports);
})();
