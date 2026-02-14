"""
Test suite for the new custom authentication system
Tests: Registration, Login, Admin approval, Password reset
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthRegistrationFlow:
    """Test registration and approval flow"""
    
    def test_register_endpoint_exists(self):
        """Test registration endpoint is available"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": f"test_{uuid.uuid4().hex[:8]}@teste.com",
            "password": "senha123"
        })
        # Should return 200 (success) or 400 (email exists) - not 404/500
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, body: {response.text}"
    
    def test_register_requires_fields(self):
        """Test registration validates required fields"""
        # Missing name
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 422, f"Should require name field, got: {response.status_code}"
        
    def test_register_duplicate_email_rejected(self):
        """Test duplicate email registration is rejected"""
        # Try to register with admin email (already exists)
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate User",
            "email": "admin@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 400, f"Should reject duplicate email, got: {response.status_code}"
        assert "já" in response.json().get("detail", "").lower() or "existe" in response.json().get("detail", "").lower()


class TestAuthLoginFlow:
    """Test login functionality"""
    
    def test_login_endpoint_exists(self):
        """Test login endpoint is available"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        # Should be 200 (success) or 401 (wrong credentials) - not 404/500
        assert response.status_code in [200, 401, 403], f"Unexpected: {response.status_code}, {response.text}"
    
    def test_login_with_valid_credentials(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code}, {response.text}"
        data = response.json()
        assert "user" in data, "Response should contain user data"
        assert data["user"]["email"] == "admin@teste.com"
    
    def test_login_with_wrong_password(self):
        """Test login rejects wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Should reject wrong password: {response.status_code}"
    
    def test_login_with_nonexistent_email(self):
        """Test login rejects nonexistent email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 401, f"Should reject nonexistent email: {response.status_code}"
    
    def test_login_returns_session_cookie(self):
        """Test login returns session cookie"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 200
        # Check for session cookie
        assert "session_token" in response.cookies or "set-cookie" in str(response.headers).lower()


class TestAuthMeEndpoint:
    """Test /auth/me endpoint"""
    
    def test_me_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
    
    def test_me_returns_user_data(self):
        """Test /auth/me returns user data when authenticated"""
        # First login
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        # Then get user data
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200, f"Me failed: {me_resp.text}"
        data = me_resp.json()
        assert data["email"] == "admin@teste.com"
        assert data["is_admin"] == True


class TestPendingRegistrations:
    """Test pending registrations admin functionality"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        if resp.status_code != 200:
            pytest.skip("Could not login as admin")
        return session
    
    def test_pending_registrations_requires_auth(self):
        """Test pending registrations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/pending-registrations")
        assert response.status_code == 401
    
    def test_pending_registrations_list(self, admin_session):
        """Test admin can list pending registrations"""
        response = admin_session.get(f"{BASE_URL}/api/auth/pending-registrations")
        assert response.status_code == 200, f"Failed: {response.status_code}, {response.text}"
        # Should return list
        data = response.json()
        assert isinstance(data, list)


class TestForgotPassword:
    """Test forgot password functionality"""
    
    def test_forgot_password_endpoint_exists(self):
        """Test forgot password endpoint is available"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "admin@teste.com"
        })
        # Should return 200 regardless of email existence (security)
        assert response.status_code == 200, f"Unexpected: {response.status_code}, {response.text}"
    
    def test_forgot_password_returns_token_in_dev(self):
        """Test forgot password returns reset token in dev mode"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "admin@teste.com"
        })
        assert response.status_code == 200
        data = response.json()
        # In dev mode, token is returned directly
        assert "reset_token" in data or "message" in data


class TestLogout:
    """Test logout functionality"""
    
    def test_logout_endpoint_exists(self):
        """Test logout endpoint is available"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200


class TestPendingUserCannotLogin:
    """Test that pending users cannot login"""
    
    def test_pending_user_login_rejected(self):
        """Test pending user cannot login until approved"""
        # usuario@teste.com is supposed to be pending
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "usuario@teste.com",
            "password": "senha123"
        })
        # Should be 401 (not found in registered_users) or 403 (not approved)
        assert response.status_code in [401, 403], f"Pending user should not login: {response.status_code}"


class TestApprovalFlow:
    """Test registration approval flow"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        if resp.status_code != 200:
            pytest.skip("Could not login as admin")
        return session
    
    def test_approve_registration_endpoint_exists(self, admin_session):
        """Test approve registration endpoint exists"""
        # Use a fake registration ID
        response = admin_session.post(f"{BASE_URL}/api/auth/approve-registration/fake_reg_id")
        # Should be 404 (not found) not 500 (error)
        assert response.status_code in [404, 403, 400], f"Unexpected: {response.status_code}"
    
    def test_reject_registration_endpoint_exists(self, admin_session):
        """Test reject registration endpoint exists"""
        response = admin_session.post(f"{BASE_URL}/api/auth/reject-registration/fake_reg_id")
        assert response.status_code in [404, 403, 400]


class TestMembersEndpoint:
    """Test members endpoint for admin section"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@teste.com",
            "password": "senha123"
        })
        if resp.status_code != 200:
            pytest.skip("Could not login as admin")
        return session
    
    def test_members_endpoint_works(self, admin_session):
        """Test members endpoint returns data"""
        response = admin_session.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200, f"Members failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
