"""
Test admin controls for Tomich Gestão de Mídia
Tests: Admin endpoints for approval management, member permissions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://media-approval-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Session tokens provided for testing
ADMIN_TOKEN = "test_admin_session_1771021469"
REGULAR_TOKEN = "test_regular_user_123"


@pytest.fixture
def admin_client():
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    return session


@pytest.fixture
def regular_client():
    """Session with regular user auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {REGULAR_TOKEN}"
    })
    return session


class TestAuthMe:
    """Test /api/auth/me endpoint returns correct admin flags"""
    
    def test_admin_user_has_is_admin_true(self, admin_client):
        """Admin user should have is_admin=true"""
        response = admin_client.get(f"{API}/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == True, f"Expected is_admin=True, got {data.get('is_admin')}"
        assert "user_id" in data
        print(f"Admin user: {data.get('name')} (is_admin={data.get('is_admin')})")
    
    def test_regular_user_has_is_admin_false(self, regular_client):
        """Regular user should have is_admin=false"""
        response = regular_client.get(f"{API}/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == False, f"Expected is_admin=False, got {data.get('is_admin')}"
        print(f"Regular user: {data.get('name')} (is_admin={data.get('is_admin')})")


class TestVotingStats:
    """Test /api/approvals/voting-stats returns correct admin/voter flags"""
    
    def test_admin_voting_stats(self, admin_client):
        """Admin should see is_admin=true in voting stats"""
        response = admin_client.get(f"{API}/approvals/voting-stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == True
        assert "total_voters" in data
        assert "can_vote" in data
        print(f"Admin voting stats: total_voters={data['total_voters']}, is_admin={data['is_admin']}, can_vote={data['can_vote']}")
    
    def test_regular_user_voting_stats(self, regular_client):
        """Regular user should see is_admin=false in voting stats"""
        response = regular_client.get(f"{API}/approvals/voting-stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == False
        print(f"Regular voting stats: is_admin={data['is_admin']}, can_vote={data['can_vote']}")


class TestMembers:
    """Test member CRUD with admin/can_vote permissions"""
    
    def test_get_members_returns_badges(self, admin_client):
        """Members list should include is_admin and can_vote badges"""
        response = admin_client.get(f"{API}/members")
        assert response.status_code == 200
        members = response.json()
        assert len(members) > 0, "No members found"
        
        # Check that members have the required fields
        for member in members:
            assert "is_admin" in member or member.get("is_admin") is None, f"Member {member.get('name')} missing is_admin field"
            assert "can_vote" in member or member.get("can_vote") is None
        
        # Check we have at least one admin member
        admin_members = [m for m in members if m.get("is_admin")]
        print(f"Found {len(admin_members)} admin members out of {len(members)} total")
    
    def test_update_member_permissions(self, admin_client):
        """Admin should be able to update member is_admin and can_vote"""
        # First, create a test member
        test_member_data = {
            "name": f"TEST_PermMember_{uuid.uuid4().hex[:8]}",
            "email": f"test_perm_{uuid.uuid4().hex[:8]}@test.com",
            "role": "operator",
            "department": "production",
            "is_admin": False,
            "can_vote": False
        }
        
        create_response = admin_client.post(f"{API}/members", json=test_member_data)
        assert create_response.status_code == 200, f"Failed to create member: {create_response.text}"
        member = create_response.json()
        member_id = member["member_id"]
        
        try:
            # Update to enable can_vote
            update_data = {
                "name": test_member_data["name"],
                "email": test_member_data["email"],
                "role": "operator",
                "department": "production",
                "is_admin": False,
                "can_vote": True  # Enable voting
            }
            update_response = admin_client.put(f"{API}/members/{member_id}", json=update_data)
            assert update_response.status_code == 200
            updated_member = update_response.json()
            assert updated_member.get("can_vote") == True, "can_vote was not updated to True"
            print(f"Successfully updated can_vote to True for {updated_member.get('name')}")
            
            # Update to enable is_admin
            update_data["is_admin"] = True
            update_response = admin_client.put(f"{API}/members/{member_id}", json=update_data)
            assert update_response.status_code == 200
            updated_member = update_response.json()
            assert updated_member.get("is_admin") == True, "is_admin was not updated to True"
            print(f"Successfully updated is_admin to True for {updated_member.get('name')}")
            
        finally:
            # Cleanup - delete test member
            admin_client.delete(f"{API}/members/{member_id}")


class TestAdminApprovalControls:
    """Test admin-only approval control endpoints"""
    
    @pytest.fixture
    def test_approval(self, admin_client):
        """Create a test approval for testing"""
        approval_data = {
            "title": f"TEST_Approval_{uuid.uuid4().hex[:8]}",
            "description": "Test approval for admin controls testing",
            "content_type": "video",
            "content_url": "https://example.com/video",
            "thumbnail_url": "https://example.com/thumb.jpg"
        }
        response = admin_client.post(f"{API}/approvals", json=approval_data)
        assert response.status_code == 200
        approval = response.json()
        yield approval
        # Cleanup
        try:
            admin_client.delete(f"{API}/admin/approvals/{approval['approval_id']}")
        except:
            pass
    
    def test_reset_votes_as_admin(self, admin_client, test_approval):
        """Admin should be able to reset votes"""
        approval_id = test_approval["approval_id"]
        
        # First, vote on the approval
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "for"}
        )
        assert vote_response.status_code == 200
        
        # Now reset votes
        reset_response = admin_client.post(f"{API}/admin/approvals/{approval_id}/reset-votes")
        assert reset_response.status_code == 200
        data = reset_response.json()
        assert "message" in data
        print(f"Reset votes response: {data}")
        
        # Verify votes are cleared
        approval_response = admin_client.get(f"{API}/approvals")
        approvals = approval_response.json()
        approval = next((a for a in approvals if a["approval_id"] == approval_id), None)
        if approval:
            assert len(approval.get("votes_for", [])) == 0
            assert len(approval.get("votes_against", [])) == 0
    
    def test_reset_votes_as_regular_user_forbidden(self, regular_client, admin_client, test_approval):
        """Regular user should NOT be able to reset votes"""
        approval_id = test_approval["approval_id"]
        
        reset_response = regular_client.post(f"{API}/admin/approvals/{approval_id}/reset-votes")
        assert reset_response.status_code == 403
        data = reset_response.json()
        assert "detail" in data
        print(f"Regular user reset attempt: {data}")
    
    def test_revoke_vote_as_admin(self, admin_client, test_approval):
        """Admin should be able to revoke individual votes"""
        approval_id = test_approval["approval_id"]
        
        # Vote first
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "for"}
        )
        assert vote_response.status_code == 200
        
        # Get the user_id who voted
        me_response = admin_client.get(f"{API}/auth/me")
        user_id = me_response.json()["user_id"]
        
        # Revoke the vote
        revoke_response = admin_client.post(
            f"{API}/admin/approvals/{approval_id}/revoke-vote",
            json={"user_id": user_id}
        )
        assert revoke_response.status_code == 200
        data = revoke_response.json()
        assert "message" in data
        print(f"Revoke vote response: {data}")
    
    def test_revoke_vote_as_regular_user_forbidden(self, regular_client, admin_client, test_approval):
        """Regular user should NOT be able to revoke votes"""
        approval_id = test_approval["approval_id"]
        
        revoke_response = regular_client.post(
            f"{API}/admin/approvals/{approval_id}/revoke-vote",
            json={"user_id": "some_user_id"}
        )
        assert revoke_response.status_code == 403
    
    def test_delete_approval_as_admin(self, admin_client):
        """Admin should be able to delete approvals"""
        # Create a dedicated approval for deletion test
        approval_data = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "description": "This approval will be deleted",
            "content_type": "image"
        }
        create_response = admin_client.post(f"{API}/approvals", json=approval_data)
        assert create_response.status_code == 200
        approval_id = create_response.json()["approval_id"]
        
        # Delete it
        delete_response = admin_client.delete(f"{API}/admin/approvals/{approval_id}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print(f"Delete approval response: {data}")
        
        # Verify it's deleted
        approvals_response = admin_client.get(f"{API}/approvals")
        approvals = approvals_response.json()
        assert not any(a["approval_id"] == approval_id for a in approvals)
    
    def test_delete_approval_as_regular_user_forbidden(self, regular_client, admin_client, test_approval):
        """Regular user should NOT be able to delete approvals"""
        approval_id = test_approval["approval_id"]
        
        delete_response = regular_client.delete(f"{API}/admin/approvals/{approval_id}")
        assert delete_response.status_code == 403


class TestVotingSystem:
    """Test that voting system works correctly with can_vote permission"""
    
    def test_user_with_can_vote_can_vote(self, admin_client):
        """User with can_vote=true should be able to vote"""
        # Check user has can_vote
        me_response = admin_client.get(f"{API}/auth/me")
        user = me_response.json()
        assert user.get("can_vote") == True, "Test user should have can_vote=true"
        
        # Create an approval to vote on
        approval_data = {
            "title": f"TEST_VoteTest_{uuid.uuid4().hex[:8]}",
            "description": "Test voting",
            "content_type": "video"
        }
        create_response = admin_client.post(f"{API}/approvals", json=approval_data)
        approval_id = create_response.json()["approval_id"]
        
        try:
            # Vote on it
            vote_response = admin_client.post(
                f"{API}/approvals/{approval_id}/vote",
                json={"approval_id": approval_id, "vote": "for"}
            )
            assert vote_response.status_code == 200
            print(f"Vote successful for user with can_vote=true")
        finally:
            admin_client.delete(f"{API}/admin/approvals/{approval_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
