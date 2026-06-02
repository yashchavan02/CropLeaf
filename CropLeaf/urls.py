from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from app.views import my_404_page, my_500_page

handler404 = my_404_page
handler500 = my_500_page

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('app.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
