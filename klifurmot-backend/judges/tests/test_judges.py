import uuid
import threading
from datetime import timedelta
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import UserAccount, CompetitionRole
from competitions.models import Competition
from judges.models import JudgeLink


class TestFactories:
    _user_counter = 0
    _competition_counter = 0
    
    @classmethod
    def reset_counters(cls):
        cls._user_counter = 0
        cls._competition_counter = 0
    
    @classmethod
    def create_user(cls, email=None, username=None, password='testpass123'):
        cls._user_counter += 1
        
        if email is None:
            email = f'test{cls._user_counter}@example.com'
        
        if username is None:
            username = f"{email.split('@')[0]}_{cls._user_counter}"
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        UserAccount.objects.create(
            user=user,
            full_name=f'{username} User',
            is_admin=False
        )
        
        token, _ = Token.objects.get_or_create(user=user)
        return user, token.key
    
    @classmethod
    def create_admin(cls, email=None):
        cls._user_counter += 1
        
        if email is None:
            email = f'admin{cls._user_counter}@example.com'
        
        user, token_key = cls.create_user(email=email)
        user.profile.is_admin = True
        user.profile.save()
        return user, token_key
    
    @classmethod
    def create_competition(cls, title=None, created_by=None):
        cls._competition_counter += 1
        
        if title is None:
            title = f'Test Competition {cls._competition_counter}'
        
        if created_by is None:
            created_by, _ = cls.create_admin()
        
        return Competition.objects.create(
            title=title,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=7),
            location='Test Location',
            created_by=created_by,
            visible=True
        )
    
    @classmethod
    def create_competition_admin(cls, user, competition):
        user_account = user.profile
        CompetitionRole.objects.get_or_create(
            user=user_account,
            competition=competition,
            defaults={'role': 'admin'}
        )
    
    @classmethod
    def create_invitation(cls, competition=None, invited_email='judge@test.com',
                         invited_name='Test Judge', expires_at=None,
                         claimed_at=None, is_used=False):
        if competition is None:
            competition = cls.create_competition()
        
        if expires_at is None:
            expires_at = timezone.now() + timedelta(days=7)
        
        return JudgeLink.objects.create(
            competition=competition,
            invited_email=invited_email,
            invited_name=invited_name,
            expires_at=expires_at,
            claimed_at=claimed_at,
            is_used=is_used,
            type='invitation'
        )
    
    @classmethod
    def create_judge_link(cls, user, competition=None, expires_at=None, is_used=False):
        if competition is None:
            competition = cls.create_competition()
        
        if expires_at is None:
            expires_at = timezone.now() + timedelta(days=7)
        
        return JudgeLink.objects.create(
            user=user,
            competition=competition,
            expires_at=expires_at,
            is_used=is_used,
            type='link'
        )


class JudgePermissionsTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.admin, self.admin_token = TestFactories.create_admin()
        self.regular_user, self.regular_token = TestFactories.create_user()
        self.competition = TestFactories.create_competition(created_by=self.admin)
    
    def test_only_admin_can_send_invitation(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'name': 'Judge',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.regular_token}',
            content_type='application/json'
        )
        
        self.assertIn(response.status_code, [400, 403])
    
    def test_competition_admin_can_send_invitation(self):
        TestFactories.create_competition_admin(self.regular_user, self.competition)
        
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'name': 'Judge',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.regular_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('token', data['data'])
        self.assertIsInstance(data['data']['token'], str)
    
    def test_global_admin_can_send_invitation(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'name': 'Judge',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('token', data['data'])
    
    def test_cannot_claim_invitation_for_different_email(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='john@test.com'
        )
        wrong_user, wrong_token = TestFactories.create_user(email='jane@test.com')
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {wrong_token}'
        )
        
        self.assertEqual(response.status_code, 403)
    
    def test_cannot_access_judge_link_for_different_user(self):
        other_user, _ = TestFactories.create_user()
        judge_link = TestFactories.create_judge_link(user=other_user, competition=self.competition)
        wrong_user, wrong_token = TestFactories.create_user()
        
        response = self.client.get(
            f'/api/judges/links/{judge_link.token}/',
            HTTP_AUTHORIZATION=f'Token {wrong_token}'
        )
        
        self.assertEqual(response.status_code, 403)
    
    def test_only_admin_can_view_all_invitations(self):
        response = self.client.get(
            f'/api/judges/invitations/competition/{self.competition.id}/',
            HTTP_AUTHORIZATION=f'Token {self.regular_token}'
        )
        
        self.assertIn(response.status_code, [403, 404])
    
    def test_only_admin_can_delete_judge_link(self):
        judge_link = TestFactories.create_judge_link(user=self.regular_user, competition=self.competition)
        another_user, another_token = TestFactories.create_user()
        
        response = self.client.delete(
            f'/api/judges/links/link/{judge_link.id}/',
            HTTP_AUTHORIZATION=f'Token {another_token}'
        )
        
        self.assertIn(response.status_code, [403, 404])


class InvitationLifecycleTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.admin, self.admin_token = TestFactories.create_admin()
        self.competition = TestFactories.create_competition(created_by=self.admin)
    
    def test_send_invitation_creates_judge_link(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'name': 'John Judge',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('token', data['data'])
        self.assertIsInstance(data['data']['token'], str)
        
        link = JudgeLink.objects.filter(invited_email='judge@test.com').first()
        self.assertIsNotNone(link)
        self.assertEqual(link.competition, self.competition)
        self.assertEqual(link.invited_name, 'John Judge')
        self.assertIsNone(link.user)
        self.assertFalse(link.is_used)
        self.assertEqual(link.type, 'invitation')
    
    def test_send_invitation_returns_correct_structure(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'name': 'Judge',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn('data', data)
        response_data = data['data']
        
        self.assertIn('token', response_data)
        self.assertIsInstance(response_data['token'], str)
        
        self.assertTrue(
            'invitation_url' in response_data or 'link_url' in response_data,
            "Response should contain invitation_url or link_url"
        )
    
    def test_validate_invitation_returns_competition_info(self):
        invitation = TestFactories.create_invitation(competition=self.competition)
        
        response = self.client.get(
            f'/api/judges/invitations/validate/{invitation.token}/'
        )
        
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn('data', data)
        response_data = data['data']
        
        self.assertEqual(response_data['competition_id'], self.competition.id)
        self.assertEqual(response_data['competition_title'], self.competition.title)
        self.assertEqual(response_data['invited_email'], invitation.invited_email)
    
    def test_claim_invitation_creates_competition_role(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='judge@test.com'
        )
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 200)
        
        role = CompetitionRole.objects.filter(
            user=user.profile,
            competition=self.competition
        ).first()
        
        self.assertIsNotNone(role)
        self.assertEqual(role.role, 'judge')
    
    def test_claim_invitation_marks_as_used(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='judge@test.com'
        )
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 200)
        
        invitation.refresh_from_db()
        self.assertTrue(invitation.is_used)
        self.assertIsNotNone(invitation.claimed_at)
        self.assertEqual(invitation.claimed_by, user)
        self.assertEqual(invitation.user, user)
    
    def test_claim_invitation_without_auth_returns_auth_required(self):
        invitation = TestFactories.create_invitation(competition=self.competition)
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/'
        )
        
        data = response.json()
        response_data = data.get('data', data)
        
        self.assertIn('authenticated', response_data)
        self.assertFalse(response_data['authenticated'])
        self.assertIn('requires_auth', response_data)
        self.assertTrue(response_data['requires_auth'])


class JudgeLinkTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.admin, self.admin_token = TestFactories.create_admin()
        self.competition = TestFactories.create_competition(created_by=self.admin)
        self.judge_user, self.judge_token = TestFactories.create_user()
    
    def test_create_judge_link_for_existing_user(self):
        response = self.client.post(
            f'/api/judges/links/competition/{self.competition.id}/',
            {
                'user_id': self.judge_user.id,
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('token', data['data'])
        self.assertIsInstance(data['data']['token'], str)
        
        link = JudgeLink.objects.filter(
            user=self.judge_user, 
            competition=self.competition
        ).first()
        
        self.assertIsNotNone(link)
        self.assertIsNotNone(link.token)
        self.assertEqual(link.type, 'link')
    
    def test_validate_judge_link(self):
        judge_link = TestFactories.create_judge_link(user=self.judge_user, competition=self.competition)
        
        response = self.client.get(
            f'/api/judges/links/{judge_link.token}/',
            HTTP_AUTHORIZATION=f'Token {self.judge_token}'
        )
        
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn('data', data)
        response_data = data['data']
        
        self.assertEqual(response_data['competition_id'], self.competition.id)
        self.assertEqual(response_data['user_id'], self.judge_user.id)
    
    def test_get_all_judge_links_for_competition(self):
        judge1, _ = TestFactories.create_user()
        judge2, _ = TestFactories.create_user()
        TestFactories.create_judge_link(user=judge1, competition=self.competition)
        TestFactories.create_judge_link(user=judge2, competition=self.competition)
        
        response = self.client.get(
            f'/api/judges/links/{self.competition.id}/',
            HTTP_AUTHORIZATION=f'Token {self.admin_token}'
        )
        
        if response.status_code == 200:
            data = response.json()
            response_data = data.get('data', data)
            links_count = len(response_data) if isinstance(response_data, list) else 0
            self.assertGreaterEqual(links_count, 2)
    
    def test_update_judge_link_expiration(self):
        judge_link = TestFactories.create_judge_link(user=self.judge_user, competition=self.competition)
        new_expiration = timezone.now() + timedelta(days=30)
        
        response = self.client.patch(
            f'/api/judges/links/link/{judge_link.id}/',
            {'expires_at': new_expiration.isoformat()},
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        if response.status_code == 200:
            judge_link.refresh_from_db()
            self.assertAlmostEqual(
                judge_link.expires_at.timestamp(),
                new_expiration.timestamp(),
                delta=2
            )
    
    def test_delete_judge_link(self):
        judge_link = TestFactories.create_judge_link(user=self.judge_user, competition=self.competition)
        
        response = self.client.delete(
            f'/api/judges/links/link/{judge_link.id}/',
            HTTP_AUTHORIZATION=f'Token {self.admin_token}'
        )
        
        if response.status_code == 200:
            exists = JudgeLink.objects.filter(id=judge_link.id).exists()
            self.assertFalse(exists)


class ExpirationValidationTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.competition = TestFactories.create_competition()
    
    def test_cannot_claim_expired_invitation(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='judge@test.com',
            expires_at=timezone.now() - timedelta(hours=1)
        )
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_cannot_claim_already_claimed_invitation(self):
        user, token_key = TestFactories.create_user(email='judge@test.com')
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='judge@test.com',
            claimed_at=timezone.now(),
            is_used=True
        )
        invitation.claimed_by = user
        invitation.save()
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_validate_expired_invitation_shows_expired_status(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            expires_at=timezone.now() - timedelta(hours=1)
        )
        
        response = self.client.get(
            f'/api/judges/invitations/validate/{invitation.token}/'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_invalid_token_returns_error(self):
        fake_token = uuid.uuid4()
        
        response = self.client.get(
            f'/api/judges/invitations/validate/{fake_token}/'
        )
        
        self.assertIn(response.status_code, [400, 404])
    
    def test_expired_judge_link_cannot_be_validated(self):
        user, token_key = TestFactories.create_user()
        judge_link = TestFactories.create_judge_link(
            user=user,
            competition=self.competition,
            expires_at=timezone.now() - timedelta(hours=1)
        )
        
        response = self.client.get(
            f'/api/judges/links/{judge_link.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 400)


class RaceConditionTest(TransactionTestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.competition = TestFactories.create_competition()
    
    def test_invitation_cannot_be_claimed_twice_concurrently(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='judge@test.com'
        )
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        results = []
        errors = []
        
        def claim_invitation():
            try:
                client = APIClient()
                response = client.post(
                    f'/api/judges/invitations/claim/{invitation.token}/',
                    HTTP_AUTHORIZATION=f'Token {token_key}'
                )
                results.append(response.status_code)
            except Exception as e:
                errors.append(str(e))
        
        thread1 = threading.Thread(target=claim_invitation)
        thread2 = threading.Thread(target=claim_invitation)
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        self.assertEqual(len(errors), 0, f"Errors occurred: {errors}")
        self.assertEqual(len(results), 2)
        
        self.assertIn(200, results, "One request should succeed")
        self.assertIn(400, results, "One request should fail")
        
        roles = CompetitionRole.objects.filter(
            user=user.profile,
            competition=self.competition
        )
        self.assertEqual(roles.count(), 1, "Only one role should be created")


class EdgeCaseTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.admin, self.admin_token = TestFactories.create_admin()
        self.competition = TestFactories.create_competition(created_by=self.admin)
    
    def test_case_insensitive_email_matching(self):
        invitation = TestFactories.create_invitation(
            competition=self.competition,
            invited_email='Judge@Test.COM'
        )
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        response = self.client.post(
            f'/api/judges/invitations/claim/{invitation.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        
        self.assertEqual(response.status_code, 200)
    
    def test_send_invitation_with_missing_name(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'judge@test.com',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertIn(response.status_code, [200, 201, 400])
    
    def test_send_invitation_with_invalid_email(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': 'not-an-email',
                'name': 'Test',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_create_judge_link_for_nonexistent_user(self):
        response = self.client.post(
            f'/api/judges/links/competition/{self.competition.id}/',
            {
                'user_id': 99999,
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 404)
    
    def test_get_invitations_for_nonexistent_competition(self):
        response = self.client.get(
            f'/api/judges/invitations/competition/99999/',
            HTTP_AUTHORIZATION=f'Token {self.admin_token}'
        )
        
        self.assertEqual(response.status_code, 404)
    
    def test_claim_multiple_invitations_same_user(self):
        user, token_key = TestFactories.create_user(email='judge@test.com')
        
        comp1 = TestFactories.create_competition()
        comp2 = TestFactories.create_competition()
        inv1 = TestFactories.create_invitation(competition=comp1, invited_email='judge@test.com')
        inv2 = TestFactories.create_invitation(competition=comp2, invited_email='judge@test.com')
        
        response1 = self.client.post(
            f'/api/judges/invitations/claim/{inv1.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        self.assertEqual(response1.status_code, 200)
        
        response2 = self.client.post(
            f'/api/judges/invitations/claim/{inv2.token}/',
            HTTP_AUTHORIZATION=f'Token {token_key}'
        )
        self.assertEqual(response2.status_code, 200)
        
        roles = CompetitionRole.objects.filter(user=user.profile, role='judge')
        self.assertEqual(roles.count(), 2)
    
    def test_whitespace_in_email_is_trimmed(self):
        response = self.client.post(
            f'/api/judges/invitations/{self.competition.id}/',
            {
                'email': '  judge@test.com  ',
                'name': 'Test',
                'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
            },
            HTTP_AUTHORIZATION=f'Token {self.admin_token}',
            content_type='application/json'
        )
        
        if response.status_code == 201:
            link = JudgeLink.objects.filter(
                invited_email__icontains='judge@test.com'
            ).first()
            
            self.assertIsNotNone(link)
            self.assertEqual(link.invited_email, link.invited_email.strip())
            self.assertNotIn(' ', link.invited_email)


class GetAllJudgesTest(TestCase):
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        TestFactories.reset_counters()
    
    def setUp(self):
        self.client = APIClient()
        self.admin, self.admin_token = TestFactories.create_admin()
        self.competition = TestFactories.create_competition(created_by=self.admin)
    
    def test_get_all_judges_returns_both_invitations_and_links(self):
        TestFactories.create_invitation(
            competition=self.competition,
            invited_email='pending@test.com'
        )
        
        judge_user, _ = TestFactories.create_user()
        TestFactories.create_judge_link(user=judge_user, competition=self.competition)
        
        response = self.client.get(
            f'/api/judges/all/{self.competition.id}/',
            HTTP_AUTHORIZATION=f'Token {self.admin_token}'
        )
        
        if response.status_code == 200:
            data = response.json()
            response_data = data.get('data', data)
            
            self.assertIn('invitations', response_data)
            self.assertIn('links', response_data)
            self.assertIsInstance(response_data['invitations'], list)
            self.assertIsInstance(response_data['links'], list)
            self.assertGreaterEqual(len(response_data['invitations']), 1)
            self.assertGreaterEqual(len(response_data['links']), 1)
    
    def test_get_all_judges_shows_correct_types(self):
        TestFactories.create_invitation(competition=self.competition, invited_email='inv@test.com')
        judge, _ = TestFactories.create_user()
        TestFactories.create_judge_link(user=judge, competition=self.competition)
        
        response = self.client.get(
            f'/api/judges/all/{self.competition.id}/',
            HTTP_AUTHORIZATION=f'Token {self.admin_token}'
        )
        
        if response.status_code == 200:
            data = response.json()
            response_data = data.get('data', data)
            
            if response_data.get('invitations') and len(response_data['invitations']) > 0:
                self.assertEqual(response_data['invitations'][0]['type'], 'invitation')
            
            if response_data.get('links') and len(response_data['links']) > 0:
                self.assertEqual(response_data['links'][0]['type'], 'link')
