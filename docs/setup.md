# Klifurmot Setup

## .env Setup

Locate your self to the `/klifurmot` directory and follow these steps:

1. Create a environment variable file named `.env`. See `env.example` for structure.

## Database

Create a database in PostgreSQL named `klifurmot`.

## Backend Setup

Locate your self to the `/klifurmot-backend` directory and follow these steps:

1. Create a virtual environment `python -m venv venv` and then activate it.
2. Run `pip install -r requirements.txt`.
3. Migrate to DB `python manage.py migrate`.
4. Create a super user `python manage.py createsuperuser`.
5. Start server `daphne -b 0.0.0.0 -p 8000 klifurmot.asgi:application`.

## Frontend Setup

1. Install dependencies `npm install`.
2. Start server `npm run dev`.
3. Build for production `npm run build`.
