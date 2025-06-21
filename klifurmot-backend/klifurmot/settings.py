from pathlib import Path
import os
from decouple import config
import dj_database_url

GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="fallback-or-blank")

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-i0r$poq*ya7^hq1d)ouvq9-o&hoezt$j*-n@$#m*aod_)65xd)')

DEBUG = config('DEBUG', default=True, cast=bool)

# ALLOWED_HOSTS configuration with fallback
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# Add the Digital Ocean domain explicitly
if not any('klifurmot-ygk2g.ondigitalocean.app' in host for host in ALLOWED_HOSTS):
    ALLOWED_HOSTS.append('klifurmot-ygk2g.ondigitalocean.app')

# For production, also add wildcard for ondigitalocean.app
if not DEBUG:
    ALLOWED_HOSTS.extend([
        'klifurmot-ygk2g.ondigitalocean.app',
        '.ondigitalocean.app',  # Allow any subdomain of ondigitalocean.app
    ])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_extensions',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'accounts',
    'competitions',
    'athletes',
    'scoring',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add WhiteNoise for production
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_CREDENTIALS = True

# Dynamic CORS settings based on environment
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
    ]
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:5173",
    ]
else:
    # Production CORS settings
    CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', 
        default='https://klifurmot-ygk2g.ondigitalocean.app',
        cast=lambda v: [s.strip() for s in v.split(',')]
    )
    CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS',
        default='https://klifurmot-ygk2g.ondigitalocean.app',
        cast=lambda v: [s.strip() for s in v.split(',')]
    )

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}

ROOT_URLCONF = 'klifurmot.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'klifurmot.wsgi.application'

# Database configuration - handles both development and production
DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    # Production: Use DATABASE_URL (Digital Ocean managed database)
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Development: Use individual environment variables
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='klifurmot'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files setup
STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')] if os.path.exists(os.path.join(BASE_DIR, 'static')) else []
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Production static files settings
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

if not DEBUG:
    # Production: Use Digital Ocean Spaces
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Digital Ocean Spaces settings
    AWS_ACCESS_KEY_ID = config('SPACES_ACCESS_KEY')
    AWS_SECRET_ACCESS_KEY = config('SPACES_SECRET_KEY')
    AWS_STORAGE_BUCKET_NAME = config('SPACES_BUCKET_NAME', default='klifurmot-media')
    AWS_S3_ENDPOINT_URL = config('SPACES_ENDPOINT_URL', default='https://lon1.digitaloceanspaces.com')
    AWS_S3_REGION_NAME = config('SPACES_REGION', default='lon1')
    
    # CDN domain (if using CDN)
    AWS_S3_CUSTOM_DOMAIN = config('SPACES_CDN_DOMAIN', default=None)
    
    # File settings
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',  # Cache for 1 day
    }
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_FILE_OVERWRITE = False  # Don't overwrite files with same name
    
    # Media URL configuration
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
    else:
        MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/'
else:
    # Development: Use local media files
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

ASGI_APPLICATION = "klifurmot.asgi.application"

# Channel layers - optimized for 3000 users
REDIS_URL = config('REDIS_URL', default=None)

if REDIS_URL:
    # Production: Use Redis if available
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    # Development/Production without Redis: Use InMemory (perfect for 3000 users)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
            "CONFIG": {
                "capacity": 2000,  # More than enough for 3000 users
                "expiry": 60,      # Message expiry in seconds
            },
        },
    }

# Frontend base URL for judge links
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='http://localhost:5173')

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if not DEBUG else 'DEBUG',
    },
}