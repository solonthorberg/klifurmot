from datetime import date

CATEGORY_LABELS = {
    "U11": "U11",
    "U13": "U13",
    "U15": "U15",
    "U17": "U17",
    "U19": "U19",
    "U21": "U21",
    "Opinn": "Opinn flokkur"
}

GENDER_LABELS = {
    "KK": "KK",
    "KVK": "KVK"
}

def calculate_age(birth_date):
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age

def get_age_based_category(age):
    if age <= 11:
        return "U11"
    elif age <= 13:
        return "U13"
    elif age <= 15:
        return "U15"
    elif age <= 17:
        return "U17"
    elif age <= 19:
        return "U19"
    elif age <= 21:
        return "U21"
    else:
        return "Opinn"
