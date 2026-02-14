"""
Tests for Creator Response and Reevaluation Features
- POST /api/approvals/{id}/respond - creator saves response to rejection reasons
- POST /api/approvals/{id}/request-reevaluation - creator requests reevaluation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials from review_request
ADMIN_SESSION = "test_admin_session_1771021469"
CREATOR_SESSION = "creator_test_session_123"

# Known data
ADMIN_USER_ID = "test-user-1769375890031"  # Usuário Teste
CREATOR_USER_ID = "user_8499d32e2208"  # Danilo Tomich
REJECTED_APPROVAL_ID = "approval_6d68db8f31fa"  # Arte de Aniversariantes de Fevereiro


class TestCreatorResponseEndpoint:
    """Tests for POST /api/approvals/{id}/respond endpoint"""
    
    @pytest.fixture
    def admin_client(self):
        """Admin session client"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION}"
        })
        return session
    
    @pytest.fixture
    def creator_client(self):
        """Creator session client"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CREATOR_SESSION}"
        })
        return session
    
    def test_respond_returns_403_if_not_creator(self, admin_client):
        """Admin (not creator) cannot respond to rejection - returns 403"""
        response = admin_client.post(
            f"{API_URL}/approvals/{REJECTED_APPROVAL_ID}/respond",
            json={"response": "Tentativa de resposta pelo admin"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "apenas o criador" in data.get("detail", "").lower() or "criador" in data.get("detail", "").lower()
        print(f"PASS: Non-creator gets 403 with message: {data.get('detail')}")
    
    def test_respond_success_as_creator(self, creator_client):
        """Creator can respond to rejection - returns 200"""
        response = creator_client.post(
            f"{API_URL}/approvals/{REJECTED_APPROVAL_ID}/respond",
            json={"response": "Corrigi a iluminação e o enquadramento conforme sugerido."}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: Creator responded successfully: {data.get('message')}")
    
    def test_respond_verifies_response_saved(self, creator_client):
        """Verify response was saved in approval"""
        # First save a response
        test_response = f"Resposta de teste {uuid.uuid4().hex[:8]}"
        response = creator_client.post(
            f"{API_URL}/approvals/{REJECTED_APPROVAL_ID}/respond",
            json={"response": test_response}
        )
        assert response.status_code == 200
        
        # Get approval and verify
        get_response = creator_client.get(f"{API_URL}/approvals")
        assert get_response.status_code == 200
        approvals = get_response.json()
        
        approval = next((a for a in approvals if a.get("approval_id") == REJECTED_APPROVAL_ID), None)
        assert approval is not None, "Approval not found"
        assert approval.get("creator_response") == test_response, f"Expected '{test_response}', got '{approval.get('creator_response')}'"
        print(f"PASS: Creator response verified in database: {test_response}")


class TestReevaluationEndpoint:
    """Tests for POST /api/approvals/{id}/request-reevaluation endpoint"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION}"
        })
        return session
    
    @pytest.fixture
    def creator_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CREATOR_SESSION}"
        })
        return session
    
    def test_request_reevaluation_returns_403_if_not_creator(self, admin_client):
        """Admin (not creator) cannot request reevaluation - returns 403"""
        response = admin_client.post(
            f"{API_URL}/approvals/{REJECTED_APPROVAL_ID}/request-reevaluation"
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "apenas o criador" in data.get("detail", "").lower() or "criador" in data.get("detail", "").lower()
        print(f"PASS: Non-creator gets 403 on reevaluation: {data.get('detail')}")


class TestFullReevaluationFlow:
    """Tests for the complete reevaluation flow"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION}"
        })
        return session
    
    @pytest.fixture
    def creator_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CREATOR_SESSION}"
        })
        return session
    
    def test_full_reevaluation_flow(self, admin_client, creator_client):
        """
        Test complete flow:
        1. Create approval as creator
        2. Reject as admin
        3. Respond as creator
        4. Request reevaluation as creator
        5. Verify status is pending with revision_count incremented
        """
        # Step 1: Create new approval as creator
        create_response = creator_client.post(
            f"{API_URL}/approvals",
            json={
                "title": f"TEST_Reevaluation_Content_{uuid.uuid4().hex[:8]}",
                "description": "Conteúdo para teste de reavaliação",
                "content_type": "image"
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created_approval = create_response.json()
        approval_id = created_approval["approval_id"]
        print(f"Step 1 PASS: Created approval {approval_id}")
        
        # Verify initial state
        assert created_approval.get("status") == "pending"
        assert created_approval.get("revision_count", 1) == 1
        print(f"  - Initial status: pending, revision_count: 1")
        
        # Step 2: Admin votes against (reject) with reason
        vote_response = admin_client.post(
            f"{API_URL}/approvals/{approval_id}/vote",
            json={
                "approval_id": approval_id,
                "vote": "against",
                "reason": "Qualidade da imagem precisa melhorar"
            }
        )
        assert vote_response.status_code == 200, f"Vote failed: {vote_response.text}"
        voted_approval = vote_response.json()
        
        # With only 1 voter, rejection threshold met
        if voted_approval.get("status") != "rejected":
            print(f"  - Status after vote: {voted_approval.get('status')} (may need more votes)")
            # Force rejection via admin reset if needed
            admin_client.post(f"{API_URL}/admin/approvals/{approval_id}/reset-votes")
            # Vote against again
            admin_client.post(
                f"{API_URL}/approvals/{approval_id}/vote",
                json={"approval_id": approval_id, "vote": "against", "reason": "Rejeição para teste"}
            )
            # Get updated approval
            approvals_resp = creator_client.get(f"{API_URL}/approvals")
            approvals = approvals_resp.json()
            voted_approval = next((a for a in approvals if a.get("approval_id") == approval_id), None)
        
        print(f"Step 2 PASS: Voted against approval, status: {voted_approval.get('status')}")
        
        # If still not rejected, skip remaining steps (voting threshold issue)
        if voted_approval.get("status") != "rejected":
            print(f"  SKIP: Cannot complete test - approval not rejected (status: {voted_approval.get('status')})")
            # Cleanup
            admin_client.delete(f"{API_URL}/admin/approvals/{approval_id}")
            pytest.skip("Voting threshold not met for rejection")
            return
        
        # Step 3: Creator responds to rejection
        respond_response = creator_client.post(
            f"{API_URL}/approvals/{approval_id}/respond",
            json={"response": "Melhorei a qualidade da imagem e corrigi o enquadramento"}
        )
        assert respond_response.status_code == 200, f"Respond failed: {respond_response.text}"
        print(f"Step 3 PASS: Creator responded to rejection")
        
        # Step 4: Creator requests reevaluation
        reevaluate_response = creator_client.post(
            f"{API_URL}/approvals/{approval_id}/request-reevaluation"
        )
        assert reevaluate_response.status_code == 200, f"Reevaluation failed: {reevaluate_response.text}"
        print(f"Step 4 PASS: Reevaluation requested")
        
        # Step 5: Verify state after reevaluation
        approvals_resp = creator_client.get(f"{API_URL}/approvals")
        assert approvals_resp.status_code == 200
        approvals = approvals_resp.json()
        
        final_approval = next((a for a in approvals if a.get("approval_id") == approval_id), None)
        assert final_approval is not None, "Approval not found after reevaluation"
        
        # Verify status is back to pending
        assert final_approval.get("status") == "pending", f"Expected 'pending', got '{final_approval.get('status')}'"
        
        # Verify revision_count incremented
        assert final_approval.get("revision_count", 1) == 2, f"Expected revision_count=2, got {final_approval.get('revision_count')}"
        
        # Verify revision_history has entry
        revision_history = final_approval.get("revision_history", [])
        assert len(revision_history) >= 1, "revision_history should have at least 1 entry"
        
        # Verify votes were reset
        assert len(final_approval.get("votes_for", [])) == 0, "votes_for should be empty"
        assert len(final_approval.get("votes_against", [])) == 0, "votes_against should be empty"
        assert len(final_approval.get("rejection_reasons", [])) == 0, "rejection_reasons should be empty"
        
        # Verify creator_response was cleared
        assert final_approval.get("creator_response") is None, "creator_response should be cleared"
        
        print(f"Step 5 PASS: Verified final state")
        print(f"  - status: {final_approval.get('status')}")
        print(f"  - revision_count: {final_approval.get('revision_count')}")
        print(f"  - revision_history entries: {len(revision_history)}")
        
        # Cleanup - delete test approval
        admin_client.delete(f"{API_URL}/admin/approvals/{approval_id}")
        print(f"CLEANUP: Deleted test approval {approval_id}")


class TestRespondValidation:
    """Tests for validation on respond endpoint"""
    
    @pytest.fixture
    def creator_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CREATOR_SESSION}"
        })
        return session
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION}"
        })
        return session
    
    def test_respond_returns_400_if_not_rejected(self, creator_client, admin_client):
        """Can only respond to rejected content - returns 400 if pending/approved"""
        # Create a new pending approval
        create_response = creator_client.post(
            f"{API_URL}/approvals",
            json={
                "title": f"TEST_Pending_Content_{uuid.uuid4().hex[:8]}",
                "description": "Conteúdo pendente para teste",
                "content_type": "video"
            }
        )
        assert create_response.status_code == 200
        approval_id = create_response.json()["approval_id"]
        
        # Try to respond to pending content
        respond_response = creator_client.post(
            f"{API_URL}/approvals/{approval_id}/respond",
            json={"response": "Tentativa de resposta em conteúdo pendente"}
        )
        assert respond_response.status_code == 400, f"Expected 400, got {respond_response.status_code}"
        data = respond_response.json()
        assert "rejeitado" in data.get("detail", "").lower() or "rejected" in data.get("detail", "").lower()
        print(f"PASS: Respond to pending content returns 400: {data.get('detail')}")
        
        # Cleanup
        admin_client.delete(f"{API_URL}/admin/approvals/{approval_id}")
    
    def test_reevaluation_returns_400_if_not_rejected(self, creator_client, admin_client):
        """Can only request reevaluation of rejected content - returns 400 if pending/approved"""
        # Create a new pending approval
        create_response = creator_client.post(
            f"{API_URL}/approvals",
            json={
                "title": f"TEST_Pending_For_Reeval_{uuid.uuid4().hex[:8]}",
                "description": "Conteúdo pendente para teste de reavaliação",
                "content_type": "post"
            }
        )
        assert create_response.status_code == 200
        approval_id = create_response.json()["approval_id"]
        
        # Try to request reevaluation of pending content
        reevaluate_response = creator_client.post(
            f"{API_URL}/approvals/{approval_id}/request-reevaluation"
        )
        assert reevaluate_response.status_code == 400, f"Expected 400, got {reevaluate_response.status_code}"
        data = reevaluate_response.json()
        assert "rejeitado" in data.get("detail", "").lower() or "rejected" in data.get("detail", "").lower()
        print(f"PASS: Reevaluation of pending content returns 400: {data.get('detail')}")
        
        # Cleanup
        admin_client.delete(f"{API_URL}/admin/approvals/{approval_id}")


class TestRevisionHistory:
    """Tests for revision_history tracking"""
    
    @pytest.fixture
    def creator_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CREATOR_SESSION}"
        })
        return session
    
    def test_revision_history_structure(self, creator_client):
        """Verify revision_history has correct structure"""
        # Get the known content that has revision > 1 (Teste)
        response = creator_client.get(f"{API_URL}/approvals")
        assert response.status_code == 200
        approvals = response.json()
        
        # Find any approval with revision_history
        approval_with_history = next(
            (a for a in approvals if len(a.get("revision_history", [])) > 0),
            None
        )
        
        if approval_with_history is None:
            print("SKIP: No approval found with revision_history")
            pytest.skip("No approval with revision_history found")
            return
        
        revision_history = approval_with_history.get("revision_history", [])
        
        # Verify structure of first revision entry
        entry = revision_history[0]
        assert "revision_number" in entry, "revision_number required in history entry"
        assert "status" in entry, "status required in history entry"
        assert "votes_for" in entry, "votes_for required in history entry"
        assert "votes_against" in entry, "votes_against required in history entry"
        assert "closed_at" in entry, "closed_at required in history entry"
        
        print(f"PASS: revision_history structure verified for approval {approval_with_history.get('approval_id')}")
        print(f"  - revision_number: {entry.get('revision_number')}")
        print(f"  - status: {entry.get('status')}")
        print(f"  - votes_for: {len(entry.get('votes_for', []))}")
        print(f"  - votes_against: {len(entry.get('votes_against', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
