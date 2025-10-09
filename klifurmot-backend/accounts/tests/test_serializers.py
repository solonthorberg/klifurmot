from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date, timedelta

from accounts.serializers import RegisterSerializer, LoginSerializer
from accounts.models import Country


class LoginSerializerTest(TestCase):
    """Test LoginSerializer"""

    def setUp(self):
        self.valid_data = {
            'email': 'mundi@gmail.com',
            'password': 'secretpassword123'
        }

    # Email
   def test_email_required(self):
        data = {**self.valid_data}
        del data['email']
        serializer = LoginSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

   def test_email_converts_to_lowercase(self):
        data = {**self.valid_data, 'email': 'Mundi@Gmail.COM'}
        serializer = LoginSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['email'], 'mundi@gmail.com')

    def test_email_empty(self):
        data = {**self.valid_data, 'email': ''}
        serializer = LoginSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_email_empty_after_strip(self):
        data = {**self.valid_data, 'email': '   '}
        serializer = LoginSerializer(data=data)
    
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    # Password
    def test_password_required(self):
        data = {**self.valid_data}
        del data['password']
        serializer = LoginSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    def test_password_empty(self):
        data = {**self.valid_data, 'password': ''}
        serializer = LoginSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)


class RegisterSerializerTest(TestCase):
    """Test RegisterSerializer validation"""
    
    def setUp(self):
        self.country = Country.objects.create(
            country_code='IS',
            name_en='Iceland',
            name_local='ísland'
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
    
    # Name
    def test_valid_data(self):
        serializer = RegisterSerializer(data=self.valid_data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['username'], 'Mundi')
        self.assertEqual(serializer.validated_data['email'], 'mundi@gmail.com')
    
    def test_valid_data_with_optional_fields(self):
        data = {
            **self.valid_data,
            'height_cm': 180,
            'wingspan_cm': 185,
        }
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['height_cm'], 180)
        self.assertEqual(serializer.validated_data['wingspan_cm'], 185)
    
    
    def test_full_name_required(self):
        data = {**self.valid_data}
        del data['full_name']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('full_name', serializer.errors)
    
    def test_full_name_too_short(self):
        data = {**self.valid_data, 'full_name': 'AB'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('full_name', serializer.errors)
    
    def test_full_name_too_long(self):
        data = {**self.valid_data, 'full_name': 'A' * 101}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('full_name', serializer.errors)
    
    def test_full_name_strips_whitespace(self):
        data = {**self.valid_data, 'full_name': '  Mundi Freyr  '}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['full_name'], 'Mundi Freyr')
    
    def test_full_name_empty(self):
        data = {**self.valid_data, 'full_name': ''}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('full_name', serializer.errors)

        
    def test_full_name_empty_after_strip(self):
        data = {**self.valid_data, 'full_name': '   '}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('full_name', serializer.errors)

    # Username    
    def test_username_required(self):
        data = {**self.valid_data}
        del data['username']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_too_short(self):
        data = {**self.valid_data, 'username': 'ab'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_too_long(self):
        data = {**self.valid_data, 'username': 'a' * 151}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_invalid_characters(self):
        data = {**self.valid_data, 'username': 'Mundi !'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_valid_characters(self):
        valid_usernames = ['mundi', 'mundi123', 'mundi.freyr', 'mundi@mundi', 'mundi+freyr', 'mundi-freyr', 'mundi_freyr']
        
        for username in valid_usernames:
            data = {**self.valid_data, 'username': username}
            serializer = RegisterSerializer(data=data)
            self.assertTrue(serializer.is_valid(), f'{username} should be valid')
    
    def test_username_duplicate(self):
        User.objects.create_user(username='mundi', email='other@example.com', password='pass')
        
        serializer = RegisterSerializer(data=self.valid_data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_case_insensitive_duplicate(self):
        User.objects.create_user(username='mundi', email='other@example.com', password='pass')
        
        data = {**self.valid_data, 'username': 'MUNDI'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_username_strips_whitespace(self):
        data = {**self.valid_data, 'username': '  mundi  '}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['username'], 'mundi')
    
    def test_username_empty(self):
        data = {**self.valid_data, 'username': ''}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)

    def test_username_empty_after_strip(self):
        data = {**self.valid_data, 'username': '   '}
        serializer = RegisterSerializer(data=data)
    
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    # Email
    def test_email_required(self):
        data = {**self.valid_data}
        del data['email']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_email_invalid_format(self):
        invalid_emails = ['notanemail', 'missing@domain', '@nodomain.com', 'no@.com']
        
        for email in invalid_emails:
            data = {**self.valid_data, 'email': email}
            serializer = RegisterSerializer(data=data)
            self.assertFalse(serializer.is_valid(), f'{email} should be invalid')
            self.assertIn('email', serializer.errors)
    
    def test_email_duplicate(self):
        User.objects.create_user(username='other', email='mundi@gmail.com', password='pass')
        
        serializer = RegisterSerializer(data=self.valid_data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_email_case_insensitive_duplicate(self):
        User.objects.create_user(username='other', email='mundi@gmail.com', password='pass')
        
        data = {**self.valid_data, 'email': 'MUNDI@GMAIL.COM'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_email_converts_to_lowercase(self):
        data = {**self.valid_data, 'email': 'Mundi@Gmail.COM'}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['email'], 'mundi@gmail.com')
    
    def test_email_too_long(self):
        data = {**self.valid_data, 'email': 'a' * 250 + '@test.com'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_email_empty(self):
        data = {**self.valid_data, 'email': ''}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_email_empty_after_strip(self):
        data = {**self.valid_data, 'email': '   '}
        serializer = RegisterSerializer(data=data)
    
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    # Password
    def test_password_required(self):
        data = {**self.valid_data}
        del data['password']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_password2_required(self):
        data = {**self.valid_data}
        del data['password2']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password2', serializer.errors)
    
    def test_password_too_short(self):
        data = {**self.valid_data, 'password': 'Pass1', 'password2': 'Pass1'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_password_too_long(self):
        long_pass = 'a' * 129
        data = {**self.valid_data, 'password': long_pass, 'password2': long_pass}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_password_mismatch(self):
        data = {**self.valid_data, 'password2': 'DifferentPass123'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password2', serializer.errors)
    
    def test_password2_not_in_validated_data(self):
        serializer = RegisterSerializer(data=self.valid_data)
        
        self.assertTrue(serializer.is_valid())
        self.assertNotIn('password2', serializer.validated_data)
        self.assertIn('password', serializer.validated_data)
    
    # Gender
    def test_gender_required(self):
        data = {**self.valid_data}
        del data['gender']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('gender', serializer.errors)
    
    def test_gender_invalid_choice(self):
        data = {**self.valid_data, 'gender': 'INVALID'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('gender', serializer.errors)
    
    def test_gender_valid_choices(self):
        """Test gender accepts KK and KVK"""
        for gender in ['KK', 'KVK']:
            data = {**self.valid_data, 'gender': gender}
            serializer = RegisterSerializer(data=data)
            self.assertTrue(serializer.is_valid(), f'{gender} should be valid')
    
    def test_gender_empty_after_strip(self):
        data = {**self.valid_data, 'gender': '   '}
        serializer = RegisterSerializer(data=data)
    
        self.assertFalse(serializer.is_valid())
        self.assertIn('gender', serializer.errors)
    
    # DoB
    def test_date_of_birth_required(self):
        data = {**self.valid_data}
        del data['date_of_birth']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('date_of_birth', serializer.errors)
    
    def test_date_of_birth_future(self):
        future_date = (date.today() + timedelta(days=1)).isoformat()
        data = {**self.valid_data, 'date_of_birth': future_date}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('date_of_birth', serializer.errors)
    
    def test_date_of_birth_invalid_format(self):
        data = {**self.valid_data, 'date_of_birth': 'not-a-date'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('date_of_birth', serializer.errors)
    
    # Nationality
    def test_nationality_required(self):
        data = {**self.valid_data}
        del data['nationality']
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('nationality', serializer.errors)
    
    def test_nationality_invalid_code(self):
        data = {**self.valid_data, 'nationality': 'XX'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('nationality', serializer.errors)
    
    def test_nationality_converts_to_uppercase(self):
        data = {**self.valid_data, 'nationality': 'is'}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['nationality'], 'IS')
    
    def test_nationality_wrong_length(self):
        data = {**self.valid_data, 'nationality': 'USA'}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('nationality', serializer.errors)
    
    def test_nationality_empty(self):
        data = {**self.valid_data, 'nationality': ''}
        serializer = RegisterSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn('nationality', serializer.errors)

    # Height
    def test_height_optional(self):
        """Test height_cm is optional"""
        data = {**self.valid_data}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
    
    def test_wingspan_optional(self):
        data = {**self.valid_data}
        serializer = RegisterSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
    
    def test_height_too_low(self):
        data = {**self.valid_data, 'height_cm': 49}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('height_cm', serializer.errors)
    
    def test_height_too_high(self):
        data = {**self.valid_data, 'height_cm': 301}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('height_cm', serializer.errors)
    
    # Wingspan
    def test_wingspan_too_low(self):
        data = {**self.valid_data, 'wingspan_cm': 49}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('wingspan_cm', serializer.errors)
    
    def test_wingspan_too_high(self):
        data = {**self.valid_data, 'wingspan_cm': 401}
        serializer = RegisterSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('wingspan_cm', serializer.errors)
