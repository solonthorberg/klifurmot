from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from unittest.mock import patch

from accounts import services
from accounts.models import UserAccount, Country


class LoginServiceTest(TestCase):
    def setUp(self):
        self.country = Country.objects.create(
            country_code="IS", name_en="Iceland", name_local="Ísland"
        )

        self.user = User.objects.create_user(
            username="mundi",
            email="mundi@gmail.com",
            password="secretpassword123",
            is_active=True,
        )

        self.user_account = UserAccount.objects.create(
            user=self.user,
            full_name="Gudmundur Freyr",
            gender="KK",
            nationality=self.country,
        )

    def test_login_success(self):
        result = services.login(email="mundi@gmail.com", password="secretpassword123")

        self.assertEqual(result["user"].id, self.user.id)
        self.assertEqual(result["user_account"].id, self.user_account.id)
        # JWT tokens are now generated in service layer
        self.assertIn("access", result)
        self.assertIn("refresh", result)
        self.assertIsInstance(result["access"], str)
        self.assertIsInstance(result["refresh"], str)
        self.assertTrue(len(result["access"]) > 100)  # JWT tokens are long
        self.assertTrue(len(result["refresh"]) > 100)

    def test_login_case_insensitive_email(self):
        result = services.login(email="MUNDI@GMAIL.COM", password="secretpassword123")

        self.assertEqual(result["user"].email, "mundi@gmail.com")
        self.assertIn("access", result)
        self.assertIn("refresh", result)

    def test_login_invalid_password(self):
        with self.assertRaises(ValueError):
            services.login(email="mundi@gmail.com", password="wrongpassword")

    def test_login_nonexistent_email(self):
        with self.assertRaises(ValueError):
            services.login(email="nonexistent@gmail.com", password="anypassword")

    def test_login_case_sensitive_password(self):
        with self.assertRaises(ValueError):
            services.login(email="mundi@gmail.com", password="SECRETPASSWORD123")

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()

        with self.assertRaises(ValueError):
            services.login(email="mundi@gmail.com", password="secretpassword123")

    def test_login_deleted_user_account(self):
        self.user_account.deleted = True
        self.user_account.save()

        with self.assertRaises(ValueError):
            services.login(email="mundi@gmail.com", password="secretpassword123")


class RegisterServiceTest(TestCase):
    def setUp(self):
        self.country = Country.objects.create(
            country_code="IS", name_en="Iceland", name_local="Ísland"
        )

        self.valid_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "ComplexPass123!",
            "full_name": "Test User",
            "gender": "KK",
            "date_of_birth": "1990-01-01",
            "nationality": "IS",
        }

    def test_register_success(self):
        result = services.register(**self.valid_data)

        self.assertIsNotNone(result["user"])
        self.assertIsNotNone(result["user_account"])
        # JWT tokens are now generated in service layer
        self.assertIn("access", result)
        self.assertIn("refresh", result)
        self.assertIsInstance(result["access"], str)
        self.assertIsInstance(result["refresh"], str)

        self.assertTrue(User.objects.filter(email="test@example.com").exists())
        user = User.objects.get(email="test@example.com")
        self.assertTrue(UserAccount.objects.filter(user=user).exists())

    def test_register_duplicate_email(self):
        services.register(**self.valid_data)

        with self.assertRaises(IntegrityError):
            services.register(**self.valid_data)

    def test_register_duplicate_username(self):
        services.register(**self.valid_data)

        data = self.valid_data.copy()
        data["email"] = "different@example.com"

        with self.assertRaises(IntegrityError):
            services.register(**data)

    def test_register_with_optional_fields(self):
        data = {
            **self.valid_data,
            "height_cm": 180,
            "wingspan_cm": 185,
        }

        result = services.register(**data)

        self.assertEqual(result["user_account"].height_cm, 180)
        self.assertEqual(result["user_account"].wingspan_cm, 185)
        self.assertIn("access", result)
        self.assertIn("refresh", result)


class GoogleLoginServiceTest(TestCase):
    def setUp(self):
        self.country = Country.objects.create(
            country_code="IS", name_en="Iceland", name_local="Ísland"
        )

        self.mock_google_data = {
            "email": "test@gmail.com",
            "name": "Test User",
            "sub": "google_id_12345",
        }

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_creates_new_user(self, mock_verify):
        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        self.assertIsNotNone(result["user"])
        self.assertIsNotNone(result["user_account"])
        # JWT tokens are now generated in service layer
        self.assertIn("access", result)
        self.assertIn("refresh", result)
        self.assertIsInstance(result["access"], str)
        self.assertIsInstance(result["refresh"], str)

        user = result["user"]
        self.assertEqual(user.email, "test@gmail.com")
        self.assertTrue(User.objects.filter(email="test@gmail.com").exists())

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_creates_user_account(self, mock_verify):
        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        user_account = result["user_account"]
        self.assertEqual(user_account.full_name, "Test User")
        self.assertEqual(user_account.google_id, "google_id_12345")
        self.assertIn("access", result)
        self.assertIn("refresh", result)

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_returns_existing_user(self, mock_verify):
        existing_user = User.objects.create_user(
            username="existing", email="test@gmail.com"
        )
        UserAccount.objects.create(user=existing_user, full_name="Old Name")

        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        self.assertEqual(result["user"].id, existing_user.id)
        self.assertEqual(User.objects.filter(email="test@gmail.com").count(), 1)
        self.assertIn("access", result)
        self.assertIn("refresh", result)

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_updates_missing_profile_data(self, mock_verify):
        existing_user = User.objects.create_user(
            username="existing", email="test@gmail.com"
        )
        user_account = UserAccount.objects.create(
            user=existing_user, full_name="", google_id=None
        )

        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        user_account.refresh_from_db()
        self.assertEqual(user_account.full_name, "Test User")
        self.assertEqual(user_account.google_id, "google_id_12345")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_does_not_overwrite_existing_profile_data(self, mock_verify):
        existing_user = User.objects.create_user(
            username="existing", email="test@gmail.com"
        )
        user_account = UserAccount.objects.create(
            user=existing_user, full_name="My Custom Name", google_id="old_google_id"
        )

        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        user_account.refresh_from_db()
        self.assertEqual(user_account.full_name, "My Custom Name")
        self.assertEqual(user_account.google_id, "old_google_id")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_normalizes_email_to_lowercase(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data["email"] = "TEST@GMAIL.COM"
        mock_verify.return_value = mock_data

        result = services.google_login(google_token="fake_token")

        self.assertEqual(result["user"].email, "test@gmail.com")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_handles_no_name(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data["name"] = ""
        mock_verify.return_value = mock_data

        result = services.google_login(google_token="fake_token")

        self.assertIsNotNone(result["user"])
        self.assertIsNotNone(result["user_account"])

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_invalid_token_raises_error(self, mock_verify):
        mock_verify.side_effect = ValueError("Invalid token")

        with self.assertRaises(ValueError) as context:
            services.google_login(google_token="invalid_token")

        self.assertIn("Invalid", str(context.exception))

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_generates_unique_username(self, mock_verify):
        User.objects.create_user(username="test", email="other@example.com")

        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        self.assertNotEqual(result["user"].username, "test")
        self.assertTrue(result["user"].username.startswith("test"))

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_handles_special_chars_in_email(self, mock_verify):
        mock_data = self.mock_google_data.copy()
        mock_data["email"] = "test+123@gmail.com"
        mock_verify.return_value = mock_data

        result = services.google_login(google_token="fake_token")

        self.assertIsNotNone(result["user"].username)
        self.assertTrue(len(result["user"].username) > 0)

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_multiple_username_collisions(self, mock_verify):
        User.objects.create_user(username="test", email="user1@example.com")
        User.objects.create_user(username="test1", email="user2@example.com")
        User.objects.create_user(username="test2", email="user3@example.com")

        mock_verify.return_value = self.mock_google_data

        result = services.google_login(google_token="fake_token")

        self.assertEqual(result["user"].username, "test3")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_login_transaction_rollback_on_error(self, mock_verify):
        mock_verify.return_value = self.mock_google_data

        initial_user_count = User.objects.count()

        with patch(
            "accounts.services.UserAccount.objects.get_or_create"
        ) as mock_create:
            mock_create.side_effect = Exception("Database error")

            with self.assertRaises(Exception):
                services.google_login(google_token="fake_token")

        self.assertEqual(User.objects.count(), initial_user_count)


class LogoutServiceTest(TestCase):
    def setUp(self):
        self.country = Country.objects.create(
            country_code="IS", name_en="Iceland", name_local="Ísland"
        )

        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_active=True,
        )

        self.user_account = UserAccount.objects.create(
            user=self.user, full_name="Test User", gender="KK", nationality=self.country
        )

    def test_logout_success(self):
        login_result = services.login(email="test@example.com", password="testpass123")
        refresh_token = login_result["refresh"]

        result = services.logout(refresh_token=refresh_token)

        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "Successfully logged out")

    def test_logout_invalid_token(self):
        with self.assertRaises(ValueError) as context:
            services.logout(refresh_token="invalid_token_string")

        self.assertIn("Invalid or expired", str(context.exception))

    def test_logout_already_blacklisted_token(self):
        login_result = services.login(email="test@example.com", password="testpass123")
        refresh_token = login_result["refresh"]
        services.logout(refresh_token=refresh_token)

        with self.assertRaises(ValueError):
            services.logout(refresh_token=refresh_token)

    def test_logout_empty_token(self):
        with self.assertRaises(ValueError):
            services.logout(refresh_token="")


class PasswordResetServiceTest(TestCase):
    def setUp(self):
        self.country = Country.objects.create(
            country_code="IS", name_en="Iceland", name_local="Ísland"
        )

        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="OldPassword123!",
            is_active=True,
        )

        self.user_account = UserAccount.objects.create(
            user=self.user, full_name="Test User", gender="KK", nationality=self.country
        )

    @patch("accounts.services.send_mail")
    def test_request_password_reset_success(self, mock_send_mail):
        """Test successful password reset request"""
        result = services.request_password_reset(
            email="test@example.com", request_ip="127.0.0.1"
        )

        self.assertTrue(result["success"])
        self.user_account.refresh_from_db()
        self.assertIsNotNone(self.user_account.reset_token_hash)
        self.assertIsNotNone(self.user_account.reset_token_created)
        mock_send_mail.assert_called_once()

    @patch("accounts.services.send_mail")
    def test_request_password_reset_nonexistent_email(self, mock_send_mail):
        """Test password reset for non-existent email returns success (no enumeration)"""
        result = services.request_password_reset(
            email="nonexistent@example.com", request_ip="127.0.0.1"
        )

        self.assertTrue(result["success"])
        mock_send_mail.assert_not_called()

    @patch("accounts.services.send_mail")
    def test_request_password_reset_rate_limiting(self, mock_send_mail):
        """Test rate limiting (3 requests per hour)"""
        for i in range(3):
            services.request_password_reset(email="test@example.com")

        result = services.request_password_reset(email="test@example.com")
        self.assertTrue(result["success"])
        self.assertEqual(mock_send_mail.call_count, 3)

    @patch("accounts.services.send_mail")
    def test_reset_password_success(self, mock_send_mail):
        """Test successful password reset"""
        result = services.request_password_reset(email="test@example.com")

        email_body = mock_send_mail.call_args[1]["message"]
        token = email_body.split("token=")[1].split("\n")[0].strip()

        result = services.reset_password(
            token=token, new_password="NewPassword123!", request_ip="127.0.0.1"
        )

        self.assertTrue(result["success"])

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))

        self.user_account.refresh_from_db()
        self.assertIsNone(self.user_account.reset_token_hash)

    def test_reset_password_invalid_token(self):
        """Test reset with invalid token"""
        with self.assertRaises(ValueError) as context:
            services.reset_password(
                token="invalid_token", new_password="NewPassword123!"
            )

        self.assertIn("Invalid", str(context.exception))

    @patch("accounts.services.send_mail")
    def test_reset_password_expired_token(self, mock_send_mail):
        """Test reset with expired token (>1 hour)"""
        services.request_password_reset(email="test@example.com")

        self.user_account.refresh_from_db()
        self.user_account.reset_token_created = timezone.now() - timedelta(hours=2)
        self.user_account.save()

        email_body = mock_send_mail.call_args[1]["message"]
        token = email_body.split("token=")[1].split("\n")[0].strip()

        with self.assertRaises(ValueError) as context:
            services.reset_password(token=token, new_password="NewPassword123!")

        self.assertIn("expired", str(context.exception).lower())

    @patch("accounts.services.send_mail")
    def test_reset_password_weak_password(self, mock_send_mail):
        services.request_password_reset(email="test@example.com")

        email_body = mock_send_mail.call_args[1]["message"]
        token = email_body.split("token=")[1].split("\n")[0].strip()

        with self.assertRaises(ValueError) as context:
            services.reset_password(token=token, new_password="123")

        self.assertIn("validation", str(context.exception).lower())

    @patch("accounts.services.send_mail")
    def test_reset_password_one_time_use(self, mock_send_mail):
        services.request_password_reset(email="test@example.com")

        email_body = mock_send_mail.call_args[1]["message"]
        token = email_body.split("token=")[1].split("\n")[0].strip()

        services.reset_password(token=token, new_password="NewPassword123!")

        with self.assertRaises(ValueError):
            services.reset_password(token=token, new_password="AnotherPassword123!")
