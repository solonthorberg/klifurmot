# Klifurmót

Klifurmót is a solution for climbing competition management for the Icelandic climbing community. Klifurmót handles the complete competition lifecycle from registration through real-time scoring to automated results publication, following the IFSC standards.

**Live test at [klifurmot.is](https://klifurmot.is)**

## Tech Stack

### Backend
- **Framework:** Django 5 + Django REST Framework
- **Database:** PostgreSQL
- **Real-time:** Django Channels (WebSocket) with channel layers
- **Auth:** JWT via `djangorestframework-simplejwt` with token rotation and blacklisting, Google OAuth 2.0
- **Storage:** Django Storages (S3-compatible for media uploads)
- **Static files:** WhiteNoise
- **Type checking:** Pyright

### Frontend
- **Framework:** React 19 with React Router 7
- **UI:** Material-UI 
- **Build tool:** Vite 6
- **HTTP client:** Axios with interceptor-based token refresh
- **State:** TanStack Query

### Infrastructure
- **ASGI server:** Daphne (WebSocket + HTTP)
- **CORS:** django-cors-headers
- **Config:** python-decouple with `.env` files
- **Database URLs:** dj-database-url
