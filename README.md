Uppsetning:

1. Búa til .env skrá í rót
   Á að líta svona út:

   DB_NAME=nafn_a_gagnagrunni
   DB_USER=notandanafn
   DB_PASSWORD=lykilord
   DB_HOST=localhost
   DB_PORT=5432

2. Virkja Python virtual environment
   Ef þú ert með venv möppu fyrir verkefnið (sem geymir local python umhverfi), virkjaðu það:
   Á Windows:
   venv\Scripts\activate
   Á macOS/Linux:
   source venv/bin/activate
   Ef þú ert ekki með venv, geturðu búið það til með:
   python -m venv venv

3. Setja upp nauðsynlegar pakkningar
   Settu upp öll þau Python-bókasöfn sem verkefnið þarfnast með:
   pip install -r requirements.txt

4. Keyra verkefnið
   Þegar allt er tilbúið geturðu keyrt Django serverinn með (Activate venv: .\venv\Scripts\activate):
   python manage.py runserver

   Síðan cd í klifurmot-frontend og keyra npm start
