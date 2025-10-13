from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock

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
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

class LogoutViewTest(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('logout')
        
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
        
        self.token = Token.objects.create(user=self.user)
    
    def test_logout_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Successfully logged out')
        self.assertIsNone(response.data['data'])
    
    def test_logout_token_deleted(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        token_key = self.token.key
        
        self.assertTrue(Token.objects.filter(key=token_key).exists())
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(key=token_key).exists())
    
    def test_logout_unauthenticated(self):
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid_token_12345')
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_already_logged_out(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        self.client.post(self.url)
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_multiple_times(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        token_key = self.token.key
        
        response1 = self.client.post(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_key}')
        response2 = self.client.post(self.url)
        self.assertEqual(response2.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_different_users(self):
        user2 = User.objects.create_user(
            username='anna',
            email='anna@gmail.com',
            password='annapassword123',
            is_active=True
        )
        
        user_account2 = UserAccount.objects.create(
            user=user2,
            full_name='Anna Björk',
            gender='KVK',
            nationality=self.country
        )
        
        token2 = Token.objects.create(user=user2)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())
        self.assertTrue(Token.objects.filter(key=token2.key).exists())
    
    def test_logout_wrong_http_method_get(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_logout_response_format(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.post(self.url)
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)

class GoogleLoginViewTest(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('google-login')
        
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.mock_google_data = {
            'email': 'test@gmail.com',
            'name': 'Test User',
            'sub': 'google_id_12345',
            'given_name': 'Test',
            'family_name': 'User'
        }
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_new_user(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('token', response.data['data'])
        self.assertIn('user', response.data['data'])
        
        self.assertTrue(User.objects.filter(email='test@gmail.com').exists())
        user = User.objects.get(email='test@gmail.com')
        self.assertTrue(UserAccount.objects.filter(user=user).exists())
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_existing_user(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com',
            password='pass123'
        )
        UserAccount.objects.create(
            user=existing_user,
            full_name='Existing User'
        )
        
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        self.assertEqual(User.objects.filter(email='test@gmail.com').count(), 1)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_returns_token(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data['data'])
        
        token_key = response.data['data']['token']
        self.assertTrue(Token.objects.filter(key=token_key).exists())
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_creates_user_account(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user = User.objects.get(email='test@gmail.com')
        user_account = UserAccount.objects.get(user=user)
        
        self.assertEqual(user_account.full_name, 'Test User')
        self.assertEqual(user_account.google_id, 'google_id_12345')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_updates_profile(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com'
        )
        user_account = UserAccount.objects.create(
            user=existing_user,
            full_name=''
        )
        
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user_account.refresh_from_db()
        self.assertEqual(user_account.full_name, 'Test User')
        self.assertEqual(user_account.google_id, 'google_id_12345')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_case_insensitive_email(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com'
        )
        UserAccount.objects.create(user=existing_user)
        
        mock_data = self.mock_google_data.copy()
        mock_data['email'] = 'TEST@GMAIL.COM'
        mock_verify.return_value = mock_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email__iexact='test@gmail.com').count(), 1)
    
    def test_google_login_missing_token(self):
        response = self.client.post(self.url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Validation_error')
    
    def test_google_login_empty_token(self):
        response = self.client.post(self.url, {
            'token': ''
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_invalid_token(self, mock_verify):
        mock_verify.side_effect = ValueError('Invalid token')
        
        response = self.client.post(self.url, {
            'token': 'invalid_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Invalid_token')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_expired_token(self, mock_verify):
        mock_verify.side_effect = ValueError('Token expired')
        
        response = self.client.post(self.url, {
            'token': 'expired_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_generates_unique_username(self, mock_verify):
        User.objects.create_user(username='test', email='other@example.com')
        
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        new_user = User.objects.get(email='test@gmail.com')
        self.assertNotEqual(new_user.username, 'test')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_no_name_provided(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data['name'] = ''
        mock_verify.return_value = mock_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user = User.objects.get(email='test@gmail.com')
        user_account = UserAccount.objects.get(user=user)
        self.assertIsNotNone(user_account)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_token_reuse(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response1 = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        token1 = response1.data['data']['token']
        
        response2 = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        token2 = response2.data['data']['token']
        
        self.assertEqual(token1, token2)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_response_format(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)
        
        data = response.data['data']
        self.assertIn('token', data)
        self.assertIn('user', data)
        self.assertIn('id', data['user'])
        self.assertIn('username', data['user'])
        self.assertIn('email', data['user'])
        self.assertIn('full_name', data['user'])


class MeViewTest(TestCase):
    """Test /me endpoint for getting and updating user profile"""
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('me')
        
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.country_us = Country.objects.create(
            country_code='US',
            name_en='United States',
            name_local='United States'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.user_account = UserAccount.objects.create(
            user=self.user,
            full_name='Test User',
            gender='KK',
            nationality=self.country,
            height_cm=180,
            wingspan_cm=185,
            date_of_birth='1990-01-01'
        )
        
        self.token = Token.objects.create(user=self.user)
    
    def test_get_profile_success(self):
        """Test successfully retrieving user profile"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Profile retrieved successfully')
        
        self.assertIn('data', response.data)
        self.assertIn('token', response.data['data'])
        self.assertIn('user', response.data['data'])
        self.assertIn('profile', response.data['data'])
        
        user_data = response.data['data']['user']
        self.assertEqual(user_data['id'], self.user.id)
        self.assertEqual(user_data['username'], 'testuser')
        self.assertEqual(user_data['email'], 'test@example.com')
        
        profile_data = response.data['data']['profile']
        self.assertEqual(profile_data['full_name'], 'Test User')
        self.assertEqual(profile_data['gender'], 'KK')
        self.assertEqual(profile_data['nationality'], 'IS')
        self.assertEqual(profile_data['height_cm'], 180)
        self.assertEqual(profile_data['wingspan_cm'], 185)
        self.assertEqual(profile_data['date_of_birth'], '1990-01-01')
    
    def test_get_profile_without_authentication(self):
        """Test that unauthenticated users cannot access profile"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_profile_with_invalid_token(self):
        """Test that invalid token is rejected"""
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid_token_here')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_profile_without_user_account(self):
        """Test getting profile for user without UserAccount"""
        user_no_account = User.objects.create_user(
            username='noaccountuser',
            email='noaccount@example.com',
            password='testpass123'
        )
        token_no_account = Token.objects.create(user=user_no_account)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_no_account.key}')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Profile_not_found')
    
    def test_update_profile_full_name(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'full_name': 'Updated Name'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Profile updated successfully')
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.full_name, 'Updated Name')
        
        self.assertEqual(response.data['data']['profile']['full_name'], 'Updated Name')
    
    def test_update_profile_gender(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'gender': 'KVK'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.gender, 'KVK')
    
    def test_update_profile_date_of_birth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'date_of_birth': '1995-05-15'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(str(self.user_account.date_of_birth), '1995-05-15')
    
    def test_update_profile_nationality(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'nationality': 'US'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.nationality.country_code, 'US')
    
    def test_update_profile_invalid_nationality(self):
        """Test updating with invalid nationality code"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'nationality': 'INVALID'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'Validation_error')
        self.assertIn('nationality', response.data['error']['details'])

    def test_update_profile_height_and_wingspan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'height_cm': 175,
            'wingspan_cm': 180
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.height_cm, 175)
        self.assertEqual(self.user_account.wingspan_cm, 180)
    
    def test_update_profile_multiple_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'full_name': 'New Full Name',
            'gender': 'KVK',
            'height_cm': 170,
            'wingspan_cm': 175,
            'nationality': 'US'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.full_name, 'New Full Name')
        self.assertEqual(self.user_account.gender, 'KVK')
        self.assertEqual(self.user_account.height_cm, 170)
        self.assertEqual(self.user_account.wingspan_cm, 175)
        self.assertEqual(self.user_account.nationality.country_code, 'US')
    
    def test_update_profile_without_authentication(self):
        response = self.client.patch(self.url, {
            'full_name': 'Hacker Name'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.full_name, 'Test User')
    
    def test_update_profile_empty_update(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    def test_update_profile_invalid_date_format(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'date_of_birth': 'invalid-date'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_update_profile_invalid_height(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'height_cm': -10
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_update_profile_invalid_wingspan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'wingspan_cm': -5
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_response_format_get(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.get(self.url)
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)
    
    def test_response_format_patch(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.patch(self.url, {
            'full_name': 'Test Name'
        }, format='json')
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)
    
    def test_method_not_allowed(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        response = self.client.put(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_token_included_in_response(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        response = self.client.get(self.url)
        self.assertEqual(response.data['data']['token'], self.token.key)
        
        response = self.client.patch(self.url, {'full_name': 'New Name'}, format='json')
        self.assertEqual(response.data['data']['token'], self.token.key)
    
    def test_partial_update_doesnt_affect_other_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        original_height = self.user_account.height_cm
        original_gender = self.user_account.gender
        
        response = self.client.patch(self.url, {
            'full_name': 'Different Name'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.full_name, 'Different Name')
        self.assertEqual(self.user_account.height_cm, original_height)
        self.assertEqual(self.user_account.gender, original_gender)
