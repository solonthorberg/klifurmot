from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Country, UserAccount
from athletes.models import Climber

class LoginViewTest(TestCase):
    """Test login endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('login')
        
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
        
        self.valid_credentials = {
            'email': 'mundi@gmail.com',
            'password': 'secretpassword123'
        }
    
    def test_login_success(self):
        response = self.client.post(self.url, self.valid_credentials, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Login successful')
        self.assertIn('token', response.data['data'])
        self.assertIn('user', response.data['data'])
        
        user_data = response.data['data']['user']
        self.assertEqual(user_data['username'], 'mundi')
        self.assertEqual(user_data['email'], 'mundi@gmail.com')
        self.assertEqual(user_data['full_name'], 'Gudmundur Freyr')
    
    def test_login_invalid_password(self):
        data = {
            'email': 'mundi@gmail.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Invalid_credentials')
    
    def test_login_nonexistent_email(self):
        data = {
            'email': 'notexist@gmail.com',
            'password': 'somepassword'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Invalid_credentials')
    
    def test_login_missing_email(self):
        data = {'password': 'secretpassword123'}
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Validation_error')
        self.assertIn('email', ''.join(response.data['error']['details']))
    
    def test_login_missing_password(self):
        data = {'email': 'mundi@gmail.com'}
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Validation_error')
        self.assertIn('password', ''.join(response.data['error']['details']))
    
    def test_login_empty_email(self):
        data = {
            'email': '',
            'password': 'secretpassword123'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_login_empty_password(self):
        data = {
            'email': 'mundi@gmail.com',
            'password': ''
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        
        response = self.client.post(self.url, self.valid_credentials, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Invalid_credentials')
    
    def test_login_case_insensitive_email(self):
        data = {
            'email': 'MUNDI@GMAIL.COM',
            'password': 'secretpassword123'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    def test_login_invalid_email_format(self):
        data = {
            'email': 'not-an-email',
            'password': 'secretpassword123'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_login_token_reuse(self):
        response1 = self.client.post(self.url, self.valid_credentials, format='json')
        token1 = response1.data['data']['token']
        
        response2 = self.client.post(self.url, self.valid_credentials, format='json')
        token2 = response2.data['data']['token']
        
        self.assertEqual(token1, token2)
    

class RegisterViewTest(TestCase):
    """Test registration endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')
        
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.valid_data = {
            'full_name': 'Gudmundur Freyr Arnarson',
            'username': 'Mundi',
            'email': 'mundi@gmail.com',
            'password': 'secretpassword123',
            'password2': 'secretpassword123',
            'gender': 'KK',
            'date_of_birth': '1990-01-15',
            'nationality': 'IS',
        }
    
    def test_register_success(self):
        response = self.client.post(self.url, self.valid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('token', response.data['data'])
        self.assertIn('user', response.data['data'])
    
    def test_register_missing_required_fields(self):
        data = {'username': 'Mundi'}
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_register_password_mismatch(self):
        data = {
            **self.valid_data,
            'password2': 'DifferentPass123'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_register_duplicate_username(self):
        self.client.post(self.url, self.valid_data, format='json')
        
        response = self.client.post(self.url, self.valid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Duplicate_user')
    
    def test_register_invalid_email(self):
        data = {
            **self.valid_data,
            'email': 'invalid-email'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(response.data['success'])
