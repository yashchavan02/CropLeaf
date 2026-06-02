/**
 * CropLeaf API client — CSRF-aware fetch (live backend).
 */
const CropLeafAPI = (function () {
  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const input = document.querySelector('[name=csrfmiddlewaretoken]');
    return input ? input.value : '';
  }

  async function request(url, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (options.method && options.method !== 'GET') {
      headers['X-CSRFToken'] = getCsrfToken();
    }

    const res = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const err = new Error(
        (typeof data === 'object' && (data?.message || data?.detail)) ||
          'Request failed'
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    getCsrfToken,
    request,

    async getUser() {
      const el = document.getElementById('saas-user-data');
      if (el) {
        try {
          return await request('/api/user/');
        } catch (_) {
          try {
            return JSON.parse(el.textContent);
          } catch (e) {
            /* fall through */
          }
        }
      }
      return request('/api/user/');
    },

    async predict(formData) {
      return request('/api/predict/', { method: 'POST', body: formData });
    },

    async getHistory(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/history/?${qs}`);
    },

    async deleteHistory(id) {
      return request(`/api/history/${id}/`, { method: 'DELETE' });
    },

    async createCheckoutSession(plan) {
      return request('/api/create-checkout-session/', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
    },

    async setPlan(plan) {
      return request('/api/set-plan/', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
    },
  };
})();

window.CropLeafAPI = CropLeafAPI;
