"""Build API-friendly prediction payloads from the TensorFlow model."""

from django.conf import settings
from django.core.files.storage import default_storage

from app.plans import FREE_DAILY_LIMIT, FREE_MONTHLY_LIMIT, usage_payload_for_plan
from app.utils import SMALL_IMAGE_ERROR, crop, process_image


def _find_crop_info(disease_name: str):
    name_lower = disease_name.lower()
    for entry in crop:
        if entry['title'].lower() == name_lower:
            return entry
        if name_lower in entry['title'].lower() or entry['title'].lower() in name_lower:
            return entry
    return None


def _severity_label(disease_name: str, confidence: float) -> str:
    if 'healthy' in disease_name.lower():
        return 'None'
    if confidence >= 0.85:
        return 'Severe'
    if confidence >= 0.65:
        return 'Moderate'
    return 'Mild'


def run_prediction_from_path(full_path: str) -> tuple[dict, list]:
    """Run model on a saved image path; returns (payload, temp_files_to_delete)."""
    out = process_image(full_path, return_confidence=True)
    disease_name, temp_files, confidence = out

    if 'doesn' in disease_name.lower() and 'seem' in disease_name.lower():
        raise ValueError(SMALL_IMAGE_ERROR)

    healthy = 'healthy' in disease_name.lower()
    info = _find_crop_info(disease_name)
    description = info['description'] if info else ''

    if healthy:
        treatment = 'No treatment needed. Continue standard care and monitoring.'
        prevention = 'Maintain good irrigation, nutrition, and scouting practices.'
    else:
        treatment = (
            description[:500] + ('…' if len(description) > 500 else '')
            if description
            else 'Consult your local extension officer for treatment options.'
        )
        prevention = (
            'Use certified disease-free seed, rotate crops, remove infected plant debris, '
            'and avoid overhead irrigation where possible.'
        )

    payload = {
        'disease': disease_name,
        'confidence': round(confidence, 4),
        'severity': _severity_label(disease_name, confidence),
        'treatment': treatment,
        'prevention': prevention,
        'healthy': healthy,
        'requires_plus': False,
        'image_static': info['image_path'] if info else None,
    }
    return payload, temp_files


def get_session_history(request) -> list:
    return list(request.session.get('prediction_history', []))


def add_session_history(request, item: dict) -> None:
    history = get_session_history(request)
    history.insert(0, item)
    request.session['prediction_history'] = history[:50]
    request.session.modified = True


def ensure_usage_session(request) -> None:
    if 'plan' not in request.session:
        request.session['plan'] = 'free'
    if 'trial_days_left' not in request.session:
        request.session['trial_days_left'] = 30
    from app.plans import _reset_usage_counters_if_needed

    _reset_usage_counters_if_needed(request)
    request.session.modified = True


def media_url_for_saved_name(name: str) -> str:
    return f"{settings.MEDIA_URL}{name}"
