#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone
import uuid

class RhemaAPITester:
    def __init__(self, base_url="https://media-approval-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.member_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(test_name)
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.status_code, response.json() if response.content else {}

        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, status, data = self.make_request('GET', '')
        expected_message = "Rhema Media System API"
        
        if success and data.get("message") == expected_message:
            self.log_result("Root API Endpoint", True)
            return True
        else:
            self.log_result("Root API Endpoint", False, f"Status: {status}, Data: {data}")
            return False

    def create_test_session(self):
        """Create a test session for authentication"""
        # For testing, we'll create a mock session directly in MongoDB
        # In real scenario, this would go through Google Auth
        test_user_data = {
            "user_id": f"test_user_{uuid.uuid4().hex[:12]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@rhema.test",
            "name": "Test User",
            "role": "member"
        }
        
        # Create session token
        session_token = f"test_session_{uuid.uuid4().hex}"
        
        # For testing purposes, we'll use a direct API call to create session
        # This simulates the auth flow
        session_data = {
            "session_id": f"test_session_id_{uuid.uuid4().hex[:8]}"
        }
        
        # Note: In real testing, we'd need to mock the Emergent Auth response
        # For now, we'll test without authentication first
        self.session_token = session_token
        self.user_id = test_user_data["user_id"]
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, status, data = self.make_request('GET', 'dashboard/stats', expected_status=401)
        
        # Should return 401 without authentication
        if status == 401:
            self.log_result("Dashboard Stats (Unauthenticated)", True)
            return True
        else:
            self.log_result("Dashboard Stats (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_members_endpoint(self):
        """Test members CRUD endpoints"""
        # Test GET members (should require auth)
        success, status, data = self.make_request('GET', 'members', expected_status=401)
        
        if status == 401:
            self.log_result("Members GET (Unauthenticated)", True)
        else:
            self.log_result("Members GET (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test POST members (should require auth)
        member_data = {
            "name": "Test Member",
            "email": "test@example.com",
            "role": "operator",
            "department": "production"
        }
        
        success, status, data = self.make_request('POST', 'members', member_data, expected_status=401)
        
        if status == 401:
            self.log_result("Members POST (Unauthenticated)", True)
            return True
        else:
            self.log_result("Members POST (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_schedules_endpoint(self):
        """Test schedules CRUD endpoints"""
        # Test GET schedules (should require auth)
        success, status, data = self.make_request('GET', 'schedules', expected_status=401)
        
        if status == 401:
            self.log_result("Schedules GET (Unauthenticated)", True)
        else:
            self.log_result("Schedules GET (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test POST schedules (should require auth)
        schedule_data = {
            "title": "Test Schedule",
            "schedule_type": "class",
            "date": "2025-01-20",
            "start_time": "19:00",
            "end_time": "21:00",
            "assigned_members": []
        }
        
        success, status, data = self.make_request('POST', 'schedules', schedule_data, expected_status=401)
        
        if status == 401:
            self.log_result("Schedules POST (Unauthenticated)", True)
            return True
        else:
            self.log_result("Schedules POST (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_approvals_endpoint(self):
        """Test content approvals endpoints"""
        # Test GET approvals (should require auth)
        success, status, data = self.make_request('GET', 'approvals', expected_status=401)
        
        if status == 401:
            self.log_result("Approvals GET (Unauthenticated)", True)
        else:
            self.log_result("Approvals GET (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test POST approvals (should require auth)
        approval_data = {
            "title": "Test Content",
            "description": "Test description",
            "content_type": "video"
        }
        
        success, status, data = self.make_request('POST', 'approvals', approval_data, expected_status=401)
        
        if status == 401:
            self.log_result("Approvals POST (Unauthenticated)", True)
            return True
        else:
            self.log_result("Approvals POST (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_links_endpoint(self):
        """Test links CRUD endpoints"""
        # Test GET links (should require auth)
        success, status, data = self.make_request('GET', 'links', expected_status=401)
        
        if status == 401:
            self.log_result("Links GET (Unauthenticated)", True)
        else:
            self.log_result("Links GET (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test POST links (should require auth)
        link_data = {
            "title": "Test Link",
            "url": "https://example.com",
            "category": "tools"
        }
        
        success, status, data = self.make_request('POST', 'links', link_data, expected_status=401)
        
        if status == 401:
            self.log_result("Links POST (Unauthenticated)", True)
            return True
        else:
            self.log_result("Links POST (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_ai_suggestions(self):
        """Test AI suggestions endpoint"""
        ai_data = {
            "prompt": "Suggest content ideas for church media"
        }
        
        success, status, data = self.make_request('POST', 'ai/suggest', ai_data, expected_status=401)
        
        if status == 401:
            self.log_result("AI Suggestions (Unauthenticated)", True)
            return True
        else:
            self.log_result("AI Suggestions (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_gamification_endpoints(self):
        """Test gamification endpoints"""
        # Test leaderboard endpoint (should require auth)
        success, status, data = self.make_request('GET', 'gamification/leaderboard', expected_status=401)
        
        if status == 401:
            self.log_result("Gamification Leaderboard (Unauthenticated)", True)
        else:
            self.log_result("Gamification Leaderboard (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test badges endpoint (should require auth)
        success, status, data = self.make_request('GET', 'gamification/badges', expected_status=401)
        
        if status == 401:
            self.log_result("Gamification Badges (Unauthenticated)", True)
        else:
            self.log_result("Gamification Badges (Unauthenticated)", False, f"Expected 401, got {status}")

        # Test my-stats endpoint (should require auth)
        success, status, data = self.make_request('GET', 'gamification/my-stats', expected_status=401)
        
        if status == 401:
            self.log_result("Gamification My Stats (Unauthenticated)", True)
            return True
        else:
            self.log_result("Gamification My Stats (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_attendance_endpoint(self):
        """Test attendance confirmation endpoint"""
        # Test attendance confirmation (should require auth)
        attendance_data = {
            "schedule_id": "test_schedule_123",
            "member_id": "test_member_123", 
            "status": "confirmed"
        }
        
        success, status, data = self.make_request('POST', 'schedules/test_schedule_123/attendance', attendance_data, expected_status=401)
        
        if status == 401:
            self.log_result("Attendance Confirmation (Unauthenticated)", True)
            return True
        else:
            self.log_result("Attendance Confirmation (Unauthenticated)", False, f"Expected 401, got {status}")
            return False

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test /auth/me without session
        success, status, data = self.make_request('GET', 'auth/me', expected_status=401)
        
        if status == 401:
            self.log_result("Auth Me (No Session)", True)
        else:
            self.log_result("Auth Me (No Session)", False, f"Expected 401, got {status}")

        # Test session creation with invalid data
        invalid_session_data = {"session_id": "invalid_session"}
        success, status, data = self.make_request('POST', 'auth/session', invalid_session_data, expected_status=401)
        
        if status == 401:
            self.log_result("Auth Session (Invalid)", True)
            return True
        else:
            self.log_result("Auth Session (Invalid)", False, f"Expected 401, got {status}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Rhema Media System API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        self.test_root_endpoint()
        
        # Test authentication
        self.test_auth_endpoints()
        
        # Test protected endpoints (should all return 401 without auth)
        self.test_dashboard_stats()
        self.test_members_endpoint()
        self.test_schedules_endpoint()
        self.test_attendance_endpoint()
        self.test_approvals_endpoint()
        self.test_links_endpoint()
        self.test_gamification_endpoints()
        self.test_ai_suggestions()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {len(self.failed_tests)}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure['test']}: {failure['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = RhemaAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())