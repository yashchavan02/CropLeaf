import json
import uuid

from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from app.plans import (
    BUSINESS_CONTACT_EMAIL,
    check_free_can_predict,
    increment_free_usage,
    reset_free_usage_session,
    usage_payload_for_plan,
)
from app.prediction_service import (
    add_session_history,
    ensure_usage_session,
    get_session_history,
    media_url_for_saved_name,
    run_prediction_from_path,
)
from app.utils import SMALL_IMAGE_ERROR


def _user_payload(user, request):
    ensure_usage_session(request)
    plan = request.session.get('plan', 'free')
    payload = {
        'name': user.first_name or user.username,
        'email': user.email,
        'username': user.username,
        'plan': plan,
        'subscription_end_date': request.session.get('subscription_end_date'),
        'trial_days_left': request.session.get('trial_days_left', 30),
        'is_pro': plan == 'plus',
        'is_plus': plan == 'plus',
        'business_contact_email': BUSINESS_CONTACT_EMAIL,
    }
    payload.update(usage_payload_for_plan(request, plan))
    return payload


@login_required
@require_http_methods(['GET'])
def api_user(request):
    return JsonResponse(_user_payload(request.user, request))


@require_http_methods(['POST'])
def api_login(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST
    email = data.get('email', '')
    password = data.get('password', '')
    user = authenticate(request, username=email, password=password)
    if user is None:
        try:
            u = User.objects.get(email=email)
            user = authenticate(request, username=u.username, password=password)
        except User.DoesNotExist:
            pass
    if user is None:
        return JsonResponse({'message': 'Invalid credentials'}, status=401)
    login(request, user)
    ensure_usage_session(request)
    return JsonResponse({'success': True, 'user': _user_payload(user, request)})


@require_http_methods(['POST'])
def api_signup(request):
    return JsonResponse(
        {'message': 'Use the registration page at /register/.'},
        status=501,
    )


@login_required
@require_http_methods(['POST'])
def api_predict(request):
    ensure_usage_session(request)
    plan = request.session.get('plan', 'free')

    if plan == 'free':
        allowed, limit_message = check_free_can_predict(request)
        if not allowed:
            return JsonResponse(
                {'message': limit_message, 'requires_upgrade': True},
                status=429,
            )

    if 'image' not in request.FILES:
        return JsonResponse(
            {'message': 'No image detected. Please upload a clear leaf photo.'},
            status=400,
        )

    image_file = request.FILES['image']

    if image_file.size > 15 * 1024 * 1024:
        return JsonResponse(
            {'message': 'File exceeds 15MB limit.'},
            status=400,
        )

    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if image_file.content_type not in allowed_types:
        return JsonResponse(
            {'message': 'Supported formats: JPG, PNG, WebP.'},
            status=400,
        )

    saved_name = f"predictions/{request.user.id}/{uuid.uuid4()}.jpg"
    saved_path = default_storage.save(saved_name, image_file)
    full_path = default_storage.path(saved_path)
    temp_files: list = []

    try:
        payload, temp_files = run_prediction_from_path(full_path)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception:
        return JsonResponse({'message': 'Analysis failed. Please try another image.'}, status=500)
    finally:
        for path in temp_files:
            if default_storage.exists(path):
                try:
                    default_storage.delete(path)
                except OSError:
                    pass

    if plan == 'free':
        increment_free_usage(request)

    image_url = media_url_for_saved_name(saved_name)
    if payload.get('image_static'):
        image_url = f"/static/{payload['image_static']}"

    history_item = {
        'id': uuid.uuid4().hex[:12],
        'disease': payload['disease'],
        'confidence': payload['confidence'],
        'severity': payload['severity'],
        'crop_type': request.POST.get('crop_type', '') or 'Auto',
        'created_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        'image_url': image_url,
        'healthy': payload['healthy'],
    }
    add_session_history(request, history_item)

    response = {k: v for k, v in payload.items() if k not in ('image_static', 'healthy')}
    return JsonResponse(response)


@login_required
@require_http_methods(['GET'])
def api_history(request):
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 20))
    items = get_session_history(request)
    start = (page - 1) * limit
    return JsonResponse({
        'results': items[start : start + limit],
        'count': len(items),
        'page': page,
    })


@login_required
@require_http_methods(['DELETE'])
def api_history_delete(request, pk):
    history = [i for i in get_session_history(request) if i.get('id') != pk]
    request.session['prediction_history'] = history
    request.session.modified = True
    return JsonResponse({'success': True})


@login_required
@require_http_methods(['POST'])
def api_checkout_session(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = {}
    if data.get('plan') != 'plus':
        return JsonResponse({'message': 'Invalid plan'}, status=400)

    request.session['plan'] = 'plus'
    request.session.modified = True

    return JsonResponse({
        'success': True,
        'plan': 'plus',
        'message': 'Plus plan activated.',
    })


@login_required
@require_http_methods(['POST'])
def api_set_plan(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = {}
    plan = data.get('plan', 'free')

    request.session['plan'] = plan
    if plan == 'free':
        reset_free_usage_session(request)
    request.session.modified = True
    return JsonResponse({'success': True, 'user': _user_payload(request.user, request)})
