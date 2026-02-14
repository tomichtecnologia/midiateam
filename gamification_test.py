#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

class GamificationTester:
    def __init__(self, base_url="https://media-approval-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
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

    async def get_active_session(self):
        """Get an active session from MongoDB"""
        load_dotenv('/app/backend/.env')
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Get the most recent active session
        session = await db.user_sessions.find_one(
            {},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if session:
            self.session_token = session.get("session_token")
            self.user_id = session.get("user_id")
            print(f"📝 Using session for user: {self.user_id}")
            print(f"🔑 Session token: {self.session_token[:20]}...")
            
        client.close()
        return session is not None

    def test_gamification_leaderboard(self):
        """Test gamification leaderboard endpoint"""
        success, status, data = self.make_request('GET', 'gamification/leaderboard')
        
        if success:
            print(f"   📊 Leaderboard entries: {len(data)}")
            if data:
                top_member = data[0]
                print(f"   🏆 Top member: {top_member.get('name', 'Unknown')} with {top_member.get('points', 0)} points")
            self.log_result("Gamification Leaderboard", True)
            return True
        else:
            self.log_result("Gamification Leaderboard", False, f"Status: {status}, Data: {data}")
            return False

    def test_gamification_badges(self):
        """Test gamification badges endpoint"""
        success, status, data = self.make_request('GET', 'gamification/badges')
        
        if success:
            print(f"   🏅 Available badges: {len(data)}")
            badge_names = [badge.get('name', 'Unknown') for badge in data.values()]
            print(f"   📋 Badge examples: {', '.join(badge_names[:3])}...")
            self.log_result("Gamification Badges", True)
            return True
        else:
            self.log_result("Gamification Badges", False, f"Status: {status}, Data: {data}")
            return False

    def test_gamification_my_stats(self):
        """Test gamification my-stats endpoint"""
        success, status, data = self.make_request('GET', 'gamification/my-stats')
        
        if success:
            print(f"   📈 User points: {data.get('points', 0)}")
            print(f"   🎯 User level: {data.get('level', 1)}")
            print(f"   🏆 User rank: #{data.get('rank', 'Unknown')}")
            print(f"   🏅 User badges: {len(data.get('badges', []))}")
            self.log_result("Gamification My Stats", True)
            return True
        else:
            self.log_result("Gamification My Stats", False, f"Status: {status}, Data: {data}")
            return False

    def test_member_creation(self):
        """Test member creation (should not return _id)"""
        member_data = {
            "name": f"Test Member {uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@rhema.test",
            "role": "operator",
            "department": "production"
        }
        
        success, status, data = self.make_request('POST', 'members', member_data, expected_status=200)
        
        if success:
            # Check if _id is present (should not be)
            if "_id" in data:
                self.log_result("Member Creation (No _id)", False, "Response contains MongoDB _id field")
                return False
            else:
                print(f"   👤 Created member: {data.get('name', 'Unknown')}")
                print(f"   🆔 Member ID: {data.get('member_id', 'Unknown')}")
                self.log_result("Member Creation (No _id)", True)
                return True
        else:
            self.log_result("Member Creation (No _id)", False, f"Status: {status}, Data: {data}")
            return False

    def test_auth_me(self):
        """Test auth/me endpoint with valid session"""
        success, status, data = self.make_request('GET', 'auth/me')
        
        if success:
            print(f"   👤 Authenticated user: {data.get('name', 'Unknown')}")
            print(f"   📧 Email: {data.get('email', 'Unknown')}")
            self.log_result("Auth Me (Authenticated)", True)
            return True
        else:
            self.log_result("Auth Me (Authenticated)", False, f"Status: {status}, Data: {data}")
            return False

    async def run_all_tests(self):
        """Run all gamification tests"""
        print("🚀 Starting Rhema Gamification System Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Get active session
        if not await self.get_active_session():
            print("❌ No active session found. Cannot test authenticated endpoints.")
            return False

        # Test authentication
        self.test_auth_me()
        
        # Test gamification endpoints
        self.test_gamification_leaderboard()
        self.test_gamification_badges()
        self.test_gamification_my_stats()
        
        # Test member creation (MongoDB _id fix)
        self.test_member_creation()

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

async def main():
    """Main test execution"""
    tester = GamificationTester()
    success = await tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))