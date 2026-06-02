"""Subscription plan limits and usage tracking (session-based)."""

from datetime import date

FREE_DAILY_LIMIT = 7
FREE_MONTHLY_LIMIT = 49
# Canonical values are defined here; settings.py references these as a mirror.
BUSINESS_CONTACT_EMAIL = 'officialyashchavan@gmail.com'


def _reset_usage_counters_if_needed(request) -> None:
    today = date.today().isoformat()
    month = date.today().strftime('%Y-%m')
    if request.session.get('usage_day') != today:
        request.session['usage_day'] = today
        request.session['daily_count'] = 0
    if request.session.get('usage_month') != month:
        request.session['usage_month'] = month
        request.session['monthly_count'] = 0


def get_free_usage(request) -> dict:
    _reset_usage_counters_if_needed(request)
    daily_used = request.session.get('daily_count', 0)
    monthly_used = request.session.get('monthly_count', 0)
    return {
        'daily_used': daily_used,
        'daily_limit': FREE_DAILY_LIMIT,
        'daily_remaining': max(0, FREE_DAILY_LIMIT - daily_used),
        'monthly_used': monthly_used,
        'monthly_limit': FREE_MONTHLY_LIMIT,
        'monthly_remaining': max(0, FREE_MONTHLY_LIMIT - monthly_used),
    }


def check_free_can_predict(request) -> tuple[bool, str | None]:
    usage = get_free_usage(request)
    if usage['daily_remaining'] <= 0:
        return (
            False,
            f"You've reached your daily limit of {FREE_DAILY_LIMIT} predictions. "
            "Upgrade to Plus or try again tomorrow.",
        )
    if usage['monthly_remaining'] <= 0:
        return (
            False,
            f"You've reached your monthly limit of {FREE_MONTHLY_LIMIT} predictions. "
            "Upgrade to Plus for unlimited access.",
        )
    return True, None


def increment_free_usage(request) -> None:
    _reset_usage_counters_if_needed(request)
    request.session['daily_count'] = request.session.get('daily_count', 0) + 1
    request.session['monthly_count'] = request.session.get('monthly_count', 0) + 1
    request.session.modified = True


def usage_payload_for_plan(request, plan: str) -> dict:
    if plan == 'plus':
        return {
            'predictions_remaining': 9999,
            'predictions_limit': 9999,
            'predictions_used': 0,
            'daily_limit': None,
            'daily_remaining': None,
            'daily_used': None,
            'monthly_limit': None,
            'monthly_remaining': None,
            'monthly_used': None,
        }
    usage = get_free_usage(request)
    return {
        'predictions_remaining': min(usage['daily_remaining'], usage['monthly_remaining']),
        'predictions_limit': FREE_MONTHLY_LIMIT,
        'predictions_used': usage['monthly_used'],
        'daily_limit': usage['daily_limit'],
        'daily_remaining': usage['daily_remaining'],
        'daily_used': usage['daily_used'],
        'monthly_limit': usage['monthly_limit'],
        'monthly_remaining': usage['monthly_remaining'],
        'monthly_used': usage['monthly_used'],
    }


def reset_free_usage_session(request) -> None:
    request.session['daily_count'] = 0
    request.session['monthly_count'] = 0
    request.session['usage_day'] = date.today().isoformat()
    request.session['usage_month'] = date.today().strftime('%Y-%m')
    request.session.modified = True
