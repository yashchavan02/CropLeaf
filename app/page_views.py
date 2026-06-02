from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect


def landing(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'marketing/landing.html')


@login_required
def dashboard(request):
    return render(request, 'dashboard/home.html')


@login_required
def predict_page(request):
    return render(request, 'dashboard/predict.html')


@login_required
def history_page(request):
    return render(request, 'dashboard/history.html')


@login_required
def reports_page(request):
    return render(request, 'dashboard/reports.html')


@login_required
def settings_page(request):
    return render(request, 'dashboard/settings.html')


@login_required
def api_access_page(request):
    return render(request, 'dashboard/api_access.html')
