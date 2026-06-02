from django.urls import path
from app.views import (
    login_view, register_view, logout_view, profiledata, my_404_page,
    change_password_view, delete_account_view,
)
from app.page_views import (
    landing, dashboard, predict_page, history_page, reports_page,
    settings_page, api_access_page,
)
from app.api_views import (
    api_user, api_login, api_signup, api_predict, api_history,
    api_history_delete, api_checkout_session, api_set_plan,
)

urlpatterns = [
    path('', landing, name='home'),
    path('dashboard/', dashboard, name='dashboard'),
    path('predict/', predict_page, name='predict'),
    path('history/', history_page, name='history'),
    path('reports/', reports_page, name='reports'),
    path('settings/', settings_page, name='settings'),
    path('api-access/', api_access_page, name='api_access'),

    # Auth
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/<int:pk>/', profiledata, name='profile'),
    path('change-password/', change_password_view, name='change_password'),
    path('delete-account/', delete_account_view, name='delete_account'),

    # REST API
    path('api/user/', api_user, name='api_user'),
    path('api/login/', api_login, name='api_login'),
    path('api/signup/', api_signup, name='api_signup'),
    path('api/predict/', api_predict, name='api_predict'),
    path('api/history/', api_history, name='api_history'),
    path('api/history/<int:pk>/', api_history_delete, name='api_history_delete'),
    path('api/create-checkout-session/', api_checkout_session, name='api_checkout'),
    path('api/set-plan/', api_set_plan, name='api_set_plan'),
]
