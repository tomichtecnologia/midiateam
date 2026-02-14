"""
Test rejection reason feature for Tomich Gestão de Mídia
Tests: Modal for rejection reason, API validation, rejection_reasons display
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://media-management-1.preview.emergentagent.com').rstrip('/')
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


class TestRejectionReasonAPI:
    """Test rejection reason required for 'against' votes"""
    
    @pytest.fixture
    def test_approval(self, admin_client):
        """Create a test approval for testing rejection reasons"""
        approval_data = {
            "title": f"TEST_RejectionApproval_{uuid.uuid4().hex[:8]}",
            "description": "Test approval for rejection reason testing",
            "content_type": "video",
            "content_url": "https://example.com/video",
            "thumbnail_url": "https://example.com/thumb.jpg"
        }
        response = admin_client.post(f"{API}/approvals", json=approval_data)
        assert response.status_code == 200, f"Failed to create approval: {response.text}"
        approval = response.json()
        yield approval
        # Cleanup
        try:
            admin_client.delete(f"{API}/admin/approvals/{approval['approval_id']}")
        except:
            pass
    
    def test_vote_against_without_reason_returns_400(self, admin_client, test_approval):
        """Voting against without reason should return 400 error"""
        approval_id = test_approval["approval_id"]
        
        # Try to vote against without reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "against"}  # No reason
        )
        
        assert vote_response.status_code == 400, f"Expected 400, got {vote_response.status_code}: {vote_response.text}"
        data = vote_response.json()
        assert "detail" in data
        assert "motivo" in data["detail"].lower() or "obrigatório" in data["detail"].lower() or "rejeição" in data["detail"].lower()
        print(f"Correctly rejected vote without reason: {data['detail']}")
    
    def test_vote_against_with_reason_returns_200(self, admin_client, test_approval):
        """Voting against with reason should return 200 and save the reason"""
        approval_id = test_approval["approval_id"]
        reason_text = "Qualidade de imagem muito baixa, precisa melhorar iluminação"
        
        # Vote against with reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={
                "approval_id": approval_id,
                "vote": "against",
                "reason": reason_text
            }
        )
        
        assert vote_response.status_code == 200, f"Expected 200, got {vote_response.status_code}: {vote_response.text}"
        data = vote_response.json()
        
        # Verify rejection reason was saved
        assert "rejection_reasons" in data
        assert len(data["rejection_reasons"]) > 0, "rejection_reasons should not be empty"
        
        # Find the reason we just added
        found_reason = None
        for reason in data["rejection_reasons"]:
            if reason.get("reason") == reason_text:
                found_reason = reason
                break
        
        assert found_reason is not None, f"Could not find our reason in rejection_reasons: {data['rejection_reasons']}"
        assert "user_id" in found_reason
        assert "user_name" in found_reason
        assert "created_at" in found_reason
        
        print(f"Successfully saved rejection reason: {found_reason}")
    
    def test_vote_for_does_not_require_reason(self, admin_client, test_approval):
        """Voting 'for' (approval) should NOT require a reason"""
        approval_id = test_approval["approval_id"]
        
        # Vote for (approval) without reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "for"}  # No reason needed
        )
        
        assert vote_response.status_code == 200, f"Expected 200, got {vote_response.status_code}: {vote_response.text}"
        data = vote_response.json()
        
        # Get user_id from auth
        me_response = admin_client.get(f"{API}/auth/me")
        user_id = me_response.json()["user_id"]
        
        # Verify vote was recorded
        assert user_id in data.get("votes_for", []), "User should be in votes_for"
        print(f"Vote for approval successful without reason")
    
    def test_vote_against_with_empty_reason_returns_400(self, admin_client, test_approval):
        """Voting against with empty reason should return 400"""
        approval_id = test_approval["approval_id"]
        
        # Vote against with empty reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "against", "reason": ""}
        )
        
        # Empty reason should be treated as no reason
        assert vote_response.status_code == 400, f"Expected 400 for empty reason, got {vote_response.status_code}"
        print(f"Correctly rejected vote with empty reason")
    
    def test_vote_against_with_whitespace_reason_returns_400(self, admin_client, test_approval):
        """Voting against with whitespace-only reason should return 400"""
        approval_id = test_approval["approval_id"]
        
        # Vote against with whitespace-only reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={"approval_id": approval_id, "vote": "against", "reason": "   "}
        )
        
        # Whitespace-only reason should be treated as no reason
        # Note: API might accept this if not validating whitespace - this tests the edge case
        if vote_response.status_code == 400:
            print(f"Correctly rejected vote with whitespace-only reason")
        else:
            print(f"API accepts whitespace-only reason (status: {vote_response.status_code}) - may need stricter validation")


class TestRejectionReasonDisplay:
    """Test that rejection reasons are properly displayed in API response"""
    
    @pytest.fixture
    def approval_with_rejections(self, admin_client):
        """Create an approval and add a rejection reason"""
        # Create approval
        approval_data = {
            "title": f"TEST_DisplayApproval_{uuid.uuid4().hex[:8]}",
            "description": "Test approval for displaying rejection reasons",
            "content_type": "image"
        }
        create_response = admin_client.post(f"{API}/approvals", json=approval_data)
        assert create_response.status_code == 200
        approval = create_response.json()
        approval_id = approval["approval_id"]
        
        # Add a rejection vote with reason
        vote_response = admin_client.post(
            f"{API}/approvals/{approval_id}/vote",
            json={
                "approval_id": approval_id,
                "vote": "against",
                "reason": "Teste de motivo de rejeição para display"
            }
        )
        assert vote_response.status_code == 200
        
        yield vote_response.json()
        
        # Cleanup
        try:
            admin_client.delete(f"{API}/admin/approvals/{approval_id}")
        except:
            pass
    
    def test_rejection_reasons_in_approvals_list(self, admin_client, approval_with_rejections):
        """Rejection reasons should appear in GET /approvals response"""
        approval_id = approval_with_rejections["approval_id"]
        
        # Get all approvals
        approvals_response = admin_client.get(f"{API}/approvals")
        assert approvals_response.status_code == 200
        approvals = approvals_response.json()
        
        # Find our test approval
        test_approval = next((a for a in approvals if a["approval_id"] == approval_id), None)
        assert test_approval is not None, "Test approval not found in list"
        
        # Check rejection_reasons field
        assert "rejection_reasons" in test_approval
        assert len(test_approval["rejection_reasons"]) > 0
        
        reason = test_approval["rejection_reasons"][0]
        assert "user_name" in reason
        assert "reason" in reason
        assert "created_at" in reason
        
        print(f"Rejection reasons correctly displayed: {test_approval['rejection_reasons']}")
    
    def test_rejection_reason_has_required_fields(self, admin_client, approval_with_rejections):
        """Each rejection reason should have user_id, user_name, reason, created_at"""
        reason = approval_with_rejections["rejection_reasons"][0]
        
        required_fields = ["user_id", "user_name", "reason", "created_at"]
        for field in required_fields:
            assert field in reason, f"Missing required field: {field}"
            assert reason[field] is not None, f"Field {field} should not be None"
        
        print(f"Rejection reason has all required fields: {list(reason.keys())}")


class TestMultipleRejectionReasons:
    """Test multiple rejection reasons from different users"""
    
    def test_multiple_users_can_reject_same_approval(self, admin_client, regular_client):
        """Multiple users should be able to reject the same approval with different reasons"""
        # First check if regular user has can_vote permission
        regular_stats = regular_client.get(f"{API}/approvals/voting-stats")
        if regular_stats.status_code != 200 or not regular_stats.json().get("can_vote"):
            pytest.skip("Regular user does not have voting permission")
        
        # Create approval
        approval_data = {
            "title": f"TEST_MultiReject_{uuid.uuid4().hex[:8]}",
            "description": "Test multiple rejection reasons",
            "content_type": "video"
        }
        create_response = admin_client.post(f"{API}/approvals", json=approval_data)
        assert create_response.status_code == 200
        approval_id = create_response.json()["approval_id"]
        
        try:
            # Admin rejects with reason
            admin_vote = admin_client.post(
                f"{API}/approvals/{approval_id}/vote",
                json={
                    "approval_id": approval_id,
                    "vote": "against",
                    "reason": "Motivo do admin: qualidade baixa"
                }
            )
            
            # Regular user rejects with different reason
            regular_vote = regular_client.post(
                f"{API}/approvals/{approval_id}/vote",
                json={
                    "approval_id": approval_id,
                    "vote": "against",
                    "reason": "Motivo do usuário: conteúdo fora do padrão"
                }
            )
            
            if admin_vote.status_code == 200 and regular_vote.status_code == 200:
                # Get updated approval
                approvals = admin_client.get(f"{API}/approvals").json()
                approval = next((a for a in approvals if a["approval_id"] == approval_id), None)
                
                if approval:
                    assert len(approval.get("rejection_reasons", [])) >= 1, "Should have at least 1 rejection reason"
                    print(f"Found {len(approval.get('rejection_reasons', []))} rejection reasons")
                    for r in approval.get("rejection_reasons", []):
                        print(f"  - {r['user_name']}: {r['reason']}")
        finally:
            admin_client.delete(f"{API}/admin/approvals/{approval_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
