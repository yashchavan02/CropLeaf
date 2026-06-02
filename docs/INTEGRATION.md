# CropLeaf SaaS Frontend — Django Integration Guide

## URL map

| Page | URL | Template | Auth |
|------|-----|----------|------|
| Landing | `/` | `marketing/landing.html` | Public |
| Dashboard | `/dashboard/` | `dashboard/home.html` | Required |
| New prediction | `/predict/` | `dashboard/predict.html` | Required |
| History | `/history/` | `dashboard/history.html` | Required |
| Reports (Pro) | `/reports/` | `dashboard/reports.html` | Required |
| Settings / Billing | `/settings/` | `dashboard/settings.html` | Required |
| API Access | `/api-access/` | `dashboard/api_access.html` | Required |
| Login | `/login/` | `auth/login.html` | Anonymous |
| Signup | `/register/` | `auth/register.html` | Anonymous |
| Legacy ML upload | `/upload/` | `app/uploads.html` | Optional |

## Static files

```
app/static/
  css/
    cropleaf-saas.css      # Design tokens & components
    tailwind.config.js       # Reference for building Tailwind locally
  js/
    api.js                   # Fetch + CSRF + mock mode
    auth.js
    predict.js
    dashboard.js
    subscription.js
    onboarding.js
    history.js
    reports.js
    app.js                   # Toasts, shared utilities
  manifest.json
  sw.js
```

Run `python manage.py collectstatic` before production.

## CSRF

All POST requests from JavaScript must send the CSRF token:

```html
<meta name="csrf-token" content="{{ csrf_token }}" />
```

`api.js` reads this automatically via `X-CSRFToken` header.

Django forms include `{% csrf_token %}` as usual.

## User context in templates

`app.context_processors.saas_user` injects `saas_user`:

```django
{{ saas_user.plan }}              {# free | pro | business #}
{{ saas_user.predictions_remaining }}
{{ saas_user.is_pro }}
```

Pass overrides via session after Stripe webhook:

```python
request.session['plan'] = 'pro'
request.session['predictions_remaining'] = 9999
```

## Mock vs live API

In `app/context_processors.py`:

```python
'cropleaf_use_mock': True,   # UI-only development
'cropleaf_use_mock': False,  # Hit /api/* endpoints
```

When `False`, `api.js` calls:

- `GET /api/user/`
- `POST /api/predict/` (multipart)
- `GET /api/history/`
- `POST /api/create-checkout-session/`

Stub implementations live in `app/api_views.py`. Wire `api_predict` to `app.utils.process_image` and your TensorFlow model.

## Stripe

1. Install `stripe` and set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` in settings/env.
2. Replace `api_checkout_session` with real Checkout Session creation.
3. Add webhook view to set `request.session['plan']` on `checkout.session.completed`.
4. Add `<meta name="stripe-key" content="{{ STRIPE_PUBLISHABLE_KEY }}">` to `layout/saas_head.html`.

`subscription.js` uses Stripe.js embedded checkout when mock is disabled.

## JWT (optional)

Current stack uses Django session auth. For HttpOnly JWT cookies:

1. Add `djangorestframework-simplejwt` or custom cookie JWT middleware.
2. Set `credentials: 'include'` in `api.js` (already set).
3. Do **not** store tokens in `localStorage`.

## Rate limiting

Configure in Django (e.g. `django-ratelimit`):

- Free: 5 predictions/minute
- Pro: 60/minute

Return HTTP 429; `predict.js` shows the upgrade modal.

## Models (recommended next step)

Add `UserProfile` and `PredictionHistory`:

```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    plan = models.CharField(max_length=20, default='free')
    predictions_this_month = models.IntegerField(default=0)

class PredictionHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='predictions/')
    disease = models.CharField(max_length=200)
    confidence = models.FloatField()
    severity = models.CharField(max_length=20)
    crop_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## Running locally

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/` for the landing page. Register, then use `/dashboard/` and `/predict/`.

## PWA

`manifest.json` and `sw.js` are registered from `layout/dashboard.html`. Serve static files with correct MIME types in production.

## Image EXIF

`predict.js` strips EXIF client-side via canvas before upload. Also strip server-side with Pillow for defense in depth.
