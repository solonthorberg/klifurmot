Uppsetning:

1. Búa til .env skrá í rót
   Á að líta svona út:

   DB_NAME=nafn_a_gagnagrunni
   DB_USER=notandanafn
   DB_PASSWORD=lykilord
   DB_HOST=localhost
   DB_PORT=5432

   REACT_APP_GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_ID=

   VITE_API_URL=

2. Virkja Python virtual environment
   Ef þú ert ekki með venv:
   python -m venv venv

3. Setja upp nauðsynlegar pakkningar
   Settu upp öll þau Python-bókasöfn sem verkefnið þarfnast með:
   pip install -r requirements.txt

4. Gera migrations til að setja upp schemaið
   Í rótinni þarf að keyra python manage.py makemigrations og síðan python manage.py migrate

5. Keyra verkefnið
   daphne -p 8000 klifurmot.asgi:application

6. Install dependencies
   cd klifurmot-frontend
   npm install
   npm run dev

7. Búa til superuser
   python manage.py createsuperuser
   Getur síðan farið á localhost/admin og skráð þig inn

8. Til að hafa live scoring þarf að ná í docker
   docker run -d -p 6379:6379 redis

   Til að athuga hvort það virkar:
   docker exec -it redis redis-cli
   skrifa síðan:
   ping
   Ættir að fá "PONG" tilbaka.
