from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.authtoken.models import Token

from accounts import services
from accounts.models import UserAccount, Country

class LoginServiceTest(TestCase):
    
    def setUp(self):
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.user = User.objects.create_user(
            username='mundi',
            email='mundi@gmail.com',
            password='secretpassword123',
            is_active=True
        )
        
        self.user_account = UserAccount.objects.create(
            user=self.user,
            full_name='Gudmundur Freyr',
            gender='KK',
            nationality=self.country
        )
    
    def test_login_success(self):
        result = services.login(
            email='mundi@gmail.com',
            password='secretpassword123'
        )
        
        self.assertEqual(result['user'].id, self.user.id)
        self.assertEqual(result['user_account'].id, self.user_account.id)
        self.assertIsInstance(result['token'], str)
    
    def test_login_case_insensitive_email(self):
        result = services.login(
            email='MUNDI@GMAIL.COM',
            password='secretpassword123'
        )
        
        self.assertEqual(result['user'].email, 'mundi@gmail.com')
    
    def test_login_token_reuse(self):
        result1 = services.login(email='mundi@gmail.com', password='secretpassword123')
        result2 = services.login(email='mundi@gmail.com', password='secretpassword123')
        
        self.assertEqual(result1['token'], result2['token'])
        self.assertEqual(Token.objects.filter(user=self.user).count(), 1)
    
    def test_login_invalid_password(self):
        with self.assertRaises(ValueError):
            services.login(email='mundi@gmail.com', password='wrongpassword')
    
    def test_login_nonexistent_email(self):
        with self.assertRaises(ValueError):
            services.login(email='notexist@gmail.com', password='somepassword')
    
    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        
        with self.assertRaises(ValueError):
            services.login(email='mundi@gmail.com', password='secretpassword123')
    
    def test_login_user_without_user_account(self):
        orphan_user = User.objects.create_user(
            username='orphan',
            email='orphan@gmail.com',
            password='password123',
            is_active=True
        )
        
        with self.assertRaises(ValueError):
            services.login(email='orphan@gmail.com', password='password123')

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
