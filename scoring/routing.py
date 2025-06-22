from django.urls import re_path
from .consumers import ResultsConsumer

websocket_urlpatterns = [
    re_path(r'ws/results/(?P<competition_id>\w+)/$', ResultsConsumer.as_asgi()),
]
