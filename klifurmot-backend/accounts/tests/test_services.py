from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError

from accounts import services
from accounts.models import UserAccount, Country


class RegisterServiceTest(TestCase):
    """Test user registration service"""
    
    def setUp(self):
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.valid_data = {
            'full_name': 'Gudmundur Freyr Arnarsson',
            'username': 'Mundi',
            'email': 'mundi@gmail.com',
            'password': 'secretPassword123',
            'gender': 'KK',
            'date_of_birth': '1990-01-15',
            'nationality': 'IS',
        }
    
    def test_register_success(self):
        result = services.register(**self.valid_data)
        
        self.assertIsNotNone(result['user'])
        self.assertIsNotNone(result['user_account'])
        self.assertIsNotNone(result['token'])
        self.assertEqual(result['user'].username, 'Mundi')
        self.assertEqual(result['user'].email, 'mundi@gmail.com')
    
    def test_register_duplicate_username(self):
        services.register(**self.valid_data)
        
        with self.assertRaises(IntegrityError):
            services.register(**self.valid_data)
    
    def test_register_with_optional_fields(self):
        data = {
            **self.valid_data,
            'height_cm': 180,
            'wingspan_cm': 185,
        }
        
        result = services.register(**data)
        
        self.assertEqual(result['user_account'].height_cm, 180)
        self.assertEqual(result['user_account'].wingspan_cm, 185)
