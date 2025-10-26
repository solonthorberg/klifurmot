from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.urls import reverse
from unittest.mock import patch

from accounts.models import UserAccount, Country


def get_tokens_for_user(user):
    """Helper function to generate JWT tokens for a user"""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }


class LoginViewTest(TestCase):
    
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
    
    def test_login_success(self):
        response = self.client.post(self.url, {
            'email': 'mundi@gmail.com',
            'password': 'secretpassword123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Login successful')
        
        self.assertIn('data', response.data)
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        self.assertIn('user', response.data['data'])
    
    def test_login_case_insensitive_email(self):
        response = self.client.post(self.url, {
            'email': 'MUNDI@GMAIL.COM',
            'password': 'secretpassword123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    def test_login_invalid_password(self):
        response = self.client.post(self.url, {
            'email': 'mundi@gmail.com',
            'password': 'wrongpassword'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
    
    def test_login_missing_fields(self):
        response = self.client.post(self.url, {
            'email': 'mundi@gmail.com'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])


class RegisterViewTest(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')
        
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.valid_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'ComplexPass123!',
            'password2': 'ComplexPass123!',
            'full_name': 'Test User',
            'gender': 'KK',
            'date_of_birth': '1990-01-01',
            'nationality': 'IS',
        }
    
    def test_register_success(self):
        response = self.client.post(self.url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'User registered successfully')
        
        self.assertIn('data', response.data)
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        self.assertIn('user', response.data['data'])
        
        self.assertTrue(User.objects.filter(email='test@example.com').exists())
    
    def test_register_duplicate_email(self):
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
        
        self.tokens = get_tokens_for_user(self.user)
    
    def test_logout_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.post(self.url, {
            'refresh': self.tokens['refresh']
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Successfully logged out')
        self.assertIsNone(response.data['data'])
    
    def test_logout_unauthenticated(self):
        response = self.client.post(self.url, {
            'refresh': self.tokens['refresh']
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_12345')
        
        response = self.client.post(self.url, {
            'refresh': self.tokens['refresh']
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_different_users(self):
        user2 = User.objects.create_user(
            username='anna',
            email='anna@gmail.com',
            password='annapassword123',
            is_active=True
        )
        
        UserAccount.objects.create(
            user=user2,
            full_name='Anna Björk',
            gender='KVK',
            nationality=self.country
        )
        
        tokens2 = get_tokens_for_user(user2)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        response = self.client.post(self.url, {
            'refresh': self.tokens['refresh']
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens2["access"]}')
        response2 = self.client.get(reverse('me'))
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
    
    def test_logout_response_format(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.post(self.url, {
            'refresh': self.tokens['refresh']
        }, format='json')
        
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
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
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
    def test_google_login_returns_jwt_tokens(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        response = self.client.post(self.url, {
            'token': 'fake_google_token'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        
        access_token = response.data['data']['access']
        refresh_token = response.data['data']['refresh']
        self.assertIsInstance(access_token, str)
        self.assertIsInstance(refresh_token, str)
        self.assertTrue(len(access_token) > 100)
        self.assertTrue(len(refresh_token) > 100)
    
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
        self.assertIn('access', data)
        self.assertIn('refresh', data)
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
        
        self.tokens = get_tokens_for_user(self.user)
    
    def test_get_profile_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Profile retrieved successfully')
        
        self.assertIn('data', response.data)
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
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_profile_with_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_here')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_profile_without_user_account(self):
        user_no_account = User.objects.create_user(
            username='noaccountuser',
            email='noaccount@example.com',
            password='testpass123'
        )
        tokens_no_account = get_tokens_for_user(user_no_account)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens_no_account["access"]}')
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_profile_full_name(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {
            'full_name': 'Updated Name'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Profile updated successfully')
        
        self.user_account.refresh_from_db()
        self.assertEqual(self.user_account.full_name, 'Updated Name')
    
    def test_update_profile_multiple_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
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
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    def test_update_profile_invalid_date_format(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {
            'date_of_birth': 'invalid-date'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_update_profile_invalid_height(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {
            'height_cm': -10
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_update_profile_invalid_wingspan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {
            'wingspan_cm': -5
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_response_format_get(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.get(self.url)
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)
    
    def test_response_format_patch(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.patch(self.url, {
            'full_name': 'Test Name'
        }, format='json')
        
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('data', response.data)
        self.assertIn('timestamp', response.data)
    
    def test_method_not_allowed(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        response = self.client.put(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_partial_update_doesnt_affect_other_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.tokens["access"]}')
        
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
