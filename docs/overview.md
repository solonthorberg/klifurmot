# Klifurmot Documenation Overview

## Overview

Klifurmot is a solution for climbing competition management for the Icelandic climbing community. Klifurmot handles the complete competition from registration through real-time scoring to automated results publication, following the World Climbing standards.

The structure of a climbing competition is based on the offical World Climbing rules: https://www.worldclimbing.com/resources/competitions

## Backend

The backend is built on top of Django REST Framework (5.2.1) using Python (3.14.4). PostgreSQL is used for the database. For real-time results Django Channels is utilized.

### klifurmot project configuration directory

klifurmot uses ASGI: https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/

### accounts app

An app for authentication and authorization for users on the platform.

### athletes app

An app where an athlete account lives, where fetching an athletes info etc.

### competitions app

An app for everything competition related actions, such as creating, modifying, deleting competitions with categories, rounds and boulders.

### core app

An app with helper functions for the REST API.

### judges app

An app for everything judge related authentication.

### scoring app

An app for everything relating to athletes in a competition, such as start list, scoring and round actions.

## Frontend
