from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock

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

class GoogleLoginServiceTest(TestCase):
    
    def setUp(self):
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='Ísland'
        )
        
        self.mock_google_data = {
            'email': 'test@gmail.com',
            'name': 'Test User',
            'sub': 'google_id_12345',
        }
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_creates_new_user(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertIsNotNone(result['user'])
        self.assertIsNotNone(result['user_account'])
        self.assertIsNotNone(result['token'])
        
        user = result['user']
        self.assertEqual(user.email, 'test@gmail.com')
        self.assertTrue(User.objects.filter(email='test@gmail.com').exists())
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_creates_user_account(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        user_account = result['user_account']
        self.assertEqual(user_account.full_name, 'Test User')
        self.assertEqual(user_account.google_id, 'google_id_12345')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_returns_existing_user(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com'
        )
        UserAccount.objects.create(
            user=existing_user,
            full_name='Old Name'
        )
        
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertEqual(result['user'].id, existing_user.id)
        self.assertEqual(User.objects.filter(email='test@gmail.com').count(), 1)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_updates_missing_profile_data(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com'
        )
        user_account = UserAccount.objects.create(
            user=existing_user,
            full_name='',
            google_id=None
        )
        
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        user_account.refresh_from_db()
        self.assertEqual(user_account.full_name, 'Test User')
        self.assertEqual(user_account.google_id, 'google_id_12345')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_does_not_overwrite_existing_profile_data(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing',
            email='test@gmail.com'
        )
        user_account = UserAccount.objects.create(
            user=existing_user,
            full_name='My Custom Name',
            google_id='old_google_id'
        )
        
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        user_account.refresh_from_db()
        self.assertEqual(user_account.full_name, 'My Custom Name')
        self.assertEqual(user_account.google_id, 'old_google_id')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_generates_token(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertIn('token', result)
        self.assertTrue(Token.objects.filter(key=result['token']).exists())
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_reuses_token(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        result1 = services.google_login(google_token='fake_token')
        token1 = result1['token']
        
        result2 = services.google_login(google_token='fake_token')
        token2 = result2['token']
        
        self.assertEqual(token1, token2)
        
        user = result1['user']
        self.assertEqual(Token.objects.filter(user=user).count(), 1)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_normalizes_email_to_lowercase(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data['email'] = 'TEST@GMAIL.COM'
        mock_verify.return_value = mock_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertEqual(result['user'].email, 'test@gmail.com')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_handles_no_name(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data['name'] = ''
        mock_verify.return_value = mock_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertIsNotNone(result['user'])
        self.assertIsNotNone(result['user_account'])
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_invalid_token_raises_error(self, mock_verify):
        mock_verify.side_effect = ValueError('Invalid token')
        
        with self.assertRaises(ValueError) as context:
            services.google_login(google_token='invalid_token')
        
        self.assertIn('Invalid', str(context.exception))
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_generates_unique_username(self, mock_verify):
        User.objects.create_user(username='test', email='other@example.com')
        
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertNotEqual(result['user'].username, 'test')
        self.assertTrue(result['user'].username.startswith('test'))
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_handles_special_chars_in_email(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data['email'] = 'test+123@gmail.com'
        mock_verify.return_value = mock_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertIsNotNone(result['user'].username)
        self.assertTrue(len(result['user'].username) > 0)
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_multiple_username_collisions(self, mock_verify):
        User.objects.create_user(username='test', email='user1@example.com')
        User.objects.create_user(username='test1', email='user2@example.com')
        User.objects.create_user(username='test2', email='user3@example.com')
        
        mock_verify.return_value = self.mock_google_data
        
        result = services.google_login(google_token='fake_token')
        
        self.assertEqual(result['user'].username, 'test3')
    
    @patch('accounts.services.id_token.verify_oauth2_token')
    def test_google_login_transaction_rollback_on_error(self, mock_verify):
        mock_verify.return_value = self.mock_google_data
        
        initial_user_count = User.objects.count()
        
        with patch('accounts.services.UserAccount.objects.get_or_create') as mock_create:
            mock_create.side_effect = Exception('Database error')
            
            with self.assertRaises(Exception):
                services.google_login(google_token='fake_token')
        
        self.assertEqual(User.objects.count(), initial_user_count)
