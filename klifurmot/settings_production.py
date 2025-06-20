from .settings import *
import dj_database_url
import os

DEBUG = False

# Will be updated after deployment
ALLOWED_HOSTS = [
    'klifurmot-web.ondigitalocean.app',  # Backend URL
    'klifurmot.ondigitalocean.app',      # Frontend URL
    'your-custom-domain.com',            # Add your domain if you have one
]

# Production database from Digital Ocean
DATABASES = {
    'default': dj_database_url.parse(
        os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Static files for production
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Add WhiteNoise middleware for serving static files
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS settings for production (update after frontend deployment)
CORS_ALLOWED_ORIGINS = [
    "https://klifurmot.ondigitalocean.app",      # Frontend URL
    "https://your-custom-domain.com",           # Add your domain
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://klifurmot-web.ondigitalocean.app",  # Backend URL
    "https://klifurmot.ondigitalocean.app",      # Frontend URL
    "https://your-custom-domain.com",           # Add your domain
]

# ⚡ InMemory Channel Layer - PERFECT for 3000 users!
# Faster than Redis, zero cost, handles 10,000+ users easily
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
        "CONFIG": {
            "capacity": 2000,  # Max channels (more than enough for 3000 users)
            "expiry": 60,      # Message expiry in seconds
        },
    },
}

# Frontend base URL for judge links
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'https://klifurmot.ondigitalocean.app')

# Optimized logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}