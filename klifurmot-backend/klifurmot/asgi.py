"""
ASGI config for klifurmot project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Set Django settings module before importing anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'klifurmot.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Now import Channels routing
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings
import scoring.routing

# Custom origin validator that uses our ALLOWED_WEBSOCKET_ORIGINS setting
# class CustomOriginValidator(AllowedHostsOriginValidator):
#     def validate_origin(self, origin):
#         # In development or when DEBUG is True, allow all local origins
#         if settings.DEBUG:
#             if origin and any(host in origin for host in ['localhost', '127.0.0.1', '0.0.0.0']):
#                 return True
        
#         # Check against our custom allowed origins
#         allowed_origins = getattr(settings, 'ALLOWED_WEBSOCKET_ORIGINS', [])
        
#         # Parse the origin to handle both http/https and ws/wss
#         if origin:
#             # Remove protocol to compare domains
#             origin_domain = origin.replace('http://', '').replace('https://', '')
#             origin_domain = origin_domain.replace('ws://', '').replace('wss://', '')
            
#             for allowed in allowed_origins:
#                 allowed_domain = allowed.replace('http://', '').replace('https://', '')
#                 allowed_domain = allowed_domain.replace('ws://', '').replace('wss://', '')
                
#                 if origin_domain == allowed_domain:
#                     return True
        
#         # Fall back to the default ALLOWED_HOSTS check
#         return super().validate_origin(origin)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                scoring.routing.websocket_urlpatterns
            )
        )
    ),
})