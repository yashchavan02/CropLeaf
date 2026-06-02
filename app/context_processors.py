from app.plans import (
    BUSINESS_CONTACT_EMAIL,
    FREE_DAILY_LIMIT,
    FREE_MONTHLY_LIMIT,
    usage_payload_for_plan,
)
from app.prediction_service import ensure_usage_session


def saas_user(request):
    defaults = {
        'plan': 'free',
        'predictions_remaining': FREE_MONTHLY_LIMIT,
        'predictions_limit': FREE_MONTHLY_LIMIT,
        'predictions_used': 0,
        'daily_limit': FREE_DAILY_LIMIT,
        'daily_remaining': FREE_DAILY_LIMIT,
        'daily_used': 0,
        'monthly_limit': FREE_MONTHLY_LIMIT,
        'monthly_remaining': FREE_MONTHLY_LIMIT,
        'monthly_used': 0,
        'subscription_end_date': None,
        'trial_days_left': 30,
        'is_pro': False,
        'is_plus': False,
    }

    if request.user.is_authenticated:
        ensure_usage_session(request)
        plan = request.session.get('plan', 'free')
        usage = usage_payload_for_plan(request, plan)
        profile = {
            'plan': plan,
            'trial_days_left': request.session.get('trial_days_left', 30),
            'subscription_end_date': request.session.get('subscription_end_date'),
            **usage,
        }
        profile['is_pro'] = plan == 'plus'
        profile['is_plus'] = plan == 'plus'
    else:
        profile = defaults

    return {
        'saas_user': profile,
        'business_contact_email': BUSINESS_CONTACT_EMAIL,
        'free_daily_limit': FREE_DAILY_LIMIT,
        'free_monthly_limit': FREE_MONTHLY_LIMIT,
    }
