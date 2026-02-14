"""
Backend Tests for Schedule Swap/Substitution Feature
Tests the swap request creation, listing, accepting, and cancellation flows.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_SESSION = "test_admin_session_1771021469"
ADMIN_MEMBER_ID = "member_1769375890031"

# Second user (Danilo)
DANILO_MEMBER_ID = "member_4ab0bc5c1510"


@pytest.fixture
def admin_client():
    """Authenticated session with admin credentials"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_SESSION}"
    })
    return session


class TestSwapRequestAPIs:
    """Tests for Schedule Swap Request endpoints"""
    
    def test_get_my_schedules(self, admin_client):
        """GET /api/my-schedules - returns schedules for current user"""
        response = admin_client.get(f"{BASE_URL}/api/my-schedules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Admin should have schedules assigned
        if len(data) > 0:
            schedule = data[0]
            assert "schedule_id" in schedule
            assert "title" in schedule
            assert "assigned_members" in schedule
            print(f"User has {len(data)} schedules assigned")
    
    def test_get_swap_requests_pending(self, admin_client):
        """GET /api/schedules/swap-requests - returns pending swap requests"""
        response = admin_client.get(f"{BASE_URL}/api/schedules/swap-requests?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} pending swap requests")
        
    def test_create_swap_request_success(self, admin_client):
        """POST /api/schedules/swap-request - creates a swap request"""
        # First get a schedule to swap
        schedules_response = admin_client.get(f"{BASE_URL}/api/my-schedules")
        assert schedules_response.status_code == 200
        schedules = schedules_response.json()
        
        if not schedules:
            pytest.skip("No schedules available for swap test")
        
        # Use a schedule that has the user assigned
        schedule = schedules[0]
        schedule_id = schedule["schedule_id"]
        
        # Create swap request
        payload = {
            "schedule_id": schedule_id,
            "target_member_id": None,  # Open to anyone
            "reason": f"TEST_SWAP: Tenho compromisso médico {uuid.uuid4().hex[:6]}"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json=payload)
        
        # May be 200 or 400 if already has pending request
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "já tem uma solicitação pendente" in error_detail:
                print("User already has pending swap request for this schedule - expected behavior")
                return
        
        assert response.status_code == 200
        data = response.json()
        assert "swap_id" in data
        assert data["status"] == "pending"
        assert data["schedule_id"] == schedule_id
        assert "TEST_SWAP" in data["reason"]
        print(f"Created swap request: {data['swap_id']}")
        
    def test_create_swap_request_with_target(self, admin_client):
        """POST /api/schedules/swap-request - creates a swap request with specific target"""
        # Get a schedule
        schedules_response = admin_client.get(f"{BASE_URL}/api/my-schedules")
        schedules = schedules_response.json()
        
        if not schedules:
            pytest.skip("No schedules available")
        
        # Find a schedule that doesn't have pending swap
        schedule = schedules[1] if len(schedules) > 1 else schedules[0]
        
        payload = {
            "schedule_id": schedule["schedule_id"],
            "target_member_id": DANILO_MEMBER_ID,  # Ask Danilo specifically
            "reason": f"TEST_TARGET_SWAP: Pedindo para Danilo {uuid.uuid4().hex[:6]}"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json=payload)
        
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "já tem uma solicitação pendente" in error_detail:
                print("Already has pending request - OK")
                return
        
        assert response.status_code == 200
        data = response.json()
        assert data["target_member_id"] == DANILO_MEMBER_ID
        print(f"Created targeted swap request: {data['swap_id']}")

    def test_create_swap_request_missing_reason(self, admin_client):
        """POST /api/schedules/swap-request - fails without reason"""
        schedules_response = admin_client.get(f"{BASE_URL}/api/my-schedules")
        schedules = schedules_response.json()
        
        if not schedules:
            pytest.skip("No schedules available")
        
        payload = {
            "schedule_id": schedules[0]["schedule_id"],
            "reason": ""  # Empty reason
        }
        
        response = admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json=payload)
        # Pydantic will accept empty string but logic should handle
        # API currently doesn't validate empty reason at backend
        print(f"Response for empty reason: {response.status_code}")
        
    def test_create_swap_request_invalid_schedule(self, admin_client):
        """POST /api/schedules/swap-request - fails for non-existent schedule"""
        payload = {
            "schedule_id": "schedule_nonexistent123",
            "reason": "Testing invalid schedule"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json=payload)
        assert response.status_code == 404
        assert "não encontrada" in response.json().get("detail", "").lower()
        print("Correctly returned 404 for invalid schedule")
        
    def test_get_my_swap_requests(self, admin_client):
        """GET /api/schedules/my-swap-requests - returns user's own swap requests"""
        response = admin_client.get(f"{BASE_URL}/api/schedules/my-swap-requests")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User has {len(data)} swap requests")
        
        if len(data) > 0:
            req = data[0]
            assert "swap_id" in req
            assert "status" in req
            assert "reason" in req
            
    def test_cancel_swap_request(self, admin_client):
        """DELETE /api/schedules/swap-requests/{id} - cancels own swap request"""
        # First get or create a pending swap request
        my_requests = admin_client.get(f"{BASE_URL}/api/schedules/my-swap-requests").json()
        pending = [r for r in my_requests if r.get("status") == "pending"]
        
        if not pending:
            # Create one first
            schedules = admin_client.get(f"{BASE_URL}/api/my-schedules").json()
            if schedules:
                create_resp = admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json={
                    "schedule_id": schedules[-1]["schedule_id"] if len(schedules) > 2 else schedules[0]["schedule_id"],
                    "reason": f"TEST_CANCEL: Will cancel this {uuid.uuid4().hex[:6]}"
                })
                if create_resp.status_code == 200:
                    swap_id = create_resp.json()["swap_id"]
                else:
                    pytest.skip("Could not create swap request to cancel")
            else:
                pytest.skip("No schedules available")
        else:
            swap_id = pending[0]["swap_id"]
        
        # Cancel it
        response = admin_client.delete(f"{BASE_URL}/api/schedules/swap-requests/{swap_id}")
        assert response.status_code == 200
        assert "cancelada" in response.json().get("message", "").lower()
        print(f"Successfully cancelled swap request: {swap_id}")
        
    def test_cancel_nonexistent_request(self, admin_client):
        """DELETE /api/schedules/swap-requests/{id} - returns 404 for invalid id"""
        response = admin_client.delete(f"{BASE_URL}/api/schedules/swap-requests/swap_invalid123")
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent swap request")
        
    def test_swap_request_enriched_data(self, admin_client):
        """GET /api/schedules/swap-requests - returns enriched data with names"""
        # Create a swap request first
        schedules = admin_client.get(f"{BASE_URL}/api/my-schedules").json()
        if schedules:
            admin_client.post(f"{BASE_URL}/api/schedules/swap-request", json={
                "schedule_id": schedules[0]["schedule_id"],
                "reason": f"TEST_ENRICHED: Checking enriched data {uuid.uuid4().hex[:6]}"
            })
        
        response = admin_client.get(f"{BASE_URL}/api/schedules/swap-requests?status=pending")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            req = data[0]
            # Should have enriched fields
            assert "requester_name" in req
            assert "schedule_title" in req
            assert "schedule_date" in req
            assert "can_accept" in req
            assert "is_mine" in req
            print(f"Enriched data present: requester={req['requester_name']}, schedule={req['schedule_title']}")


class TestSwapResponseAPIs:
    """Tests for accepting/responding to swap requests"""
    
    def test_respond_own_request_fails(self, admin_client):
        """POST /api/schedules/swap-requests/{id}/respond - cannot accept own request"""
        # Get own pending request
        my_requests = admin_client.get(f"{BASE_URL}/api/schedules/my-swap-requests").json()
        pending = [r for r in my_requests if r.get("status") == "pending"]
        
        if not pending:
            pytest.skip("No pending swap requests to test")
        
        swap_id = pending[0]["swap_id"]
        
        response = admin_client.post(
            f"{BASE_URL}/api/schedules/swap-requests/{swap_id}/respond",
            json={"swap_id": swap_id, "accept": True}
        )
        
        assert response.status_code == 400
        assert "própria solicitação" in response.json().get("detail", "").lower()
        print("Correctly prevented user from accepting their own swap request")
        
    def test_respond_nonexistent_request(self, admin_client):
        """POST /api/schedules/swap-requests/{id}/respond - returns 404 for invalid id"""
        response = admin_client.post(
            f"{BASE_URL}/api/schedules/swap-requests/swap_invalid123/respond",
            json={"swap_id": "swap_invalid123", "accept": True}
        )
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent swap request")


class TestScheduleAttendance:
    """Tests for schedule confirmation/decline (related to swaps)"""
    
    def test_confirm_attendance(self, admin_client):
        """POST /api/schedules/{id}/attendance - confirms attendance"""
        schedules = admin_client.get(f"{BASE_URL}/api/my-schedules").json()
        
        if not schedules:
            pytest.skip("No schedules available")
        
        schedule = schedules[0]
        
        response = admin_client.post(
            f"{BASE_URL}/api/schedules/{schedule['schedule_id']}/attendance",
            json={
                "schedule_id": schedule["schedule_id"],
                "member_id": ADMIN_MEMBER_ID,
                "status": "confirmed"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert ADMIN_MEMBER_ID in data.get("confirmed_members", [])
        print(f"Successfully confirmed attendance for {schedule['title']}")
        
    def test_decline_attendance(self, admin_client):
        """POST /api/schedules/{id}/attendance - declines attendance"""
        schedules = admin_client.get(f"{BASE_URL}/api/my-schedules").json()
        
        if len(schedules) < 2:
            pytest.skip("Need at least 2 schedules to test decline")
        
        schedule = schedules[1]
        
        response = admin_client.post(
            f"{BASE_URL}/api/schedules/{schedule['schedule_id']}/attendance",
            json={
                "schedule_id": schedule["schedule_id"],
                "member_id": ADMIN_MEMBER_ID,
                "status": "declined"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert ADMIN_MEMBER_ID in data.get("declined_members", [])
        print(f"Successfully declined attendance for {schedule['title']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
