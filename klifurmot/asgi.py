"""
ASGI config for klifurmot project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from scoring.routing import websocket_urlpatterns  # or wherever your consumer is

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "klifurmot.settings")
django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # ✅ Serve Django Admin/API over HTTP
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})

