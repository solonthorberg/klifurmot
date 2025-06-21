from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token
from django.http import JsonResponse

def api_root(request):
    """API root endpoint that provides basic information about available endpoints"""
    return JsonResponse({
        'message': 'Klifurmót API',
        'version': '1.0',
        'status': 'running',
        'endpoints': {
            'competitions': '/api/competitions/',
            'athletes': '/api/athletes/',
            'accounts': '/api/accounts/',
            'scoring': '/api/scoring/',
            'admin': '/admin/',
            'api_token': '/api/token/',
        }
    })

urlpatterns = [
    path('', api_root, name='api-root'),  # Handle root URL
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/athletes/', include('athletes.urls')),
    path('api/scoring/', include('scoring.urls')),
    path('api/competitions/', include('competitions.urls')),
    path('api/token/', obtain_auth_token),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)