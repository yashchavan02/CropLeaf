import json
from urllib.parse import quote
import tensorflow as tf
from datetime import timedelta
from django.urls import reverse
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from app.forms import RegistrationForm, ProfileEditForm
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout
from app.utils import anonymous_required, safe_next_url
from app.prediction_service import ensure_usage_session

tf.config.set_visible_devices([], 'GPU')


@anonymous_required
def register_view(request):
    nxturl = safe_next_url(request, 'GET')
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        nxturl = safe_next_url(request, 'POST')

        if form.is_valid():
            user = form.save()
            user.first_name = form.cleaned_data['name']
            user.save(update_fields=['first_name'])

            auth_login(request, user)
            ensure_usage_session(request)
            request.session.set_expiry(timedelta(days=7))
            return redirect(nxturl or 'dashboard')
        else:
            ffield = None
            this_error = None
            for ename in form.errors:
                ffield = ename
                this_error = form.errors[ename]
                break

            error = {ffield: this_error}

            request.session['just_form_data'] = request.POST
            request.session['just_form_errors'] = json.dumps(error)

            url = reverse('register')
            if nxturl:
                url += f'?next={nxturl}'
            return redirect(url)

    else:
        data = request.session.pop('just_form_data', None)
        errors_json = request.session.pop('just_form_errors', None)

        if data:
            form = RegistrationForm(data)
            if errors_json:
                errors = json.loads(errors_json)
                for field, errs in errors.items():
                    form._errors = {field: form.error_class(errs)}
        else:
            form = RegistrationForm()

        return render(request, 'auth/register.html', {'form': form, 'next': nxturl})


@anonymous_required
def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)
            ensure_usage_session(request)
            request.session.set_expiry(timedelta(days=3))

            nxturl = safe_next_url(request)
            return redirect(nxturl or 'dashboard')
        else:
            messages.error(request, "Oops! Login failed, please check your credentials")

            nxturl = safe_next_url(request)
            if nxturl:
                safenxturl = quote(nxturl, safe="/")
                url = f"{reverse('login')}?next={safenxturl}"
                return redirect(url)
            return redirect('login')

    return render(request, 'auth/login.html', {
        'next': safe_next_url(request, 'GET') or ''
    })


@login_required
def logout_view(request):
    auth_logout(request)
    return redirect('home')


@login_required
def profiledata(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except (User.DoesNotExist, ValueError, TypeError):
        messages.error(request, "User not found.")
        return render(request, 'app/404.html', status=404)

    if request.user != user and not request.user.is_staff:
        return render(request, 'app/403.html', status=403)

    if request.method == 'POST':
        form = ProfileEditForm(request.POST, instance=user)
        if form.is_valid():
            if form.has_changed():
                form.save()
                messages.success(request, "Profile updated successfully.")
            else:
                messages.info(request, "No changes detected.")
            return redirect('profile', pk=pk)
    else:
        form = ProfileEditForm(instance=user)

    return render(request, 'app/profile.html', {'user': user, 'form': form})


def my_404_page(request, exception):
    return render(request, 'app/404.html', status=404)


def my_500_page(request):
    return render(request, 'app/500.html', status=500)


@login_required
def change_password_view(request):
    form = PasswordChangeForm(user=request.user)
    if request.method == 'POST':
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            update_session_auth_hash(request, form.user)
            messages.success(request, "Password changed successfully.")
            return redirect('profile', pk=request.user.pk)

    return render(request, 'app/change_password.html', {'form': form})


@login_required
def delete_account_view(request):
    if request.method == 'POST':
        user = request.user
        auth_logout(request)
        user.delete()
        messages.success(request, "Your account has been permanently deleted.")
        return redirect('home')

    return render(request, 'app/delete_account.html')
