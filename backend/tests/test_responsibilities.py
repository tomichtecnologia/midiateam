"""
Test Responsibilities CRUD API - /api/responsibilities endpoints
Tests: GET, POST, PUT, PATCH /toggle, DELETE
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_TOKEN = "test_admin_session_1771021469"

class TestResponsibilitiesAPI:
    """Responsibilities CRUD API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - get auth headers and first member"""
        self.headers = {
            "Authorization": f"Bearer {AUTH_TOKEN}",
            "Content-Type": "application/json"
        }
        # Get first available member for testing
        members_resp = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        assert members_resp.status_code == 200, f"Failed to get members: {members_resp.text}"
        members = members_resp.json()
        assert len(members) > 0, "No members available for testing"
        self.test_member_id = members[0]["member_id"]
        self.test_member_name = members[0]["name"]
    
    # ============== GET /api/responsibilities ==============
    
    def test_get_responsibilities_returns_200(self):
        """GET /api/responsibilities returns 200"""
        response = requests.get(f"{BASE_URL}/api/responsibilities", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: GET /api/responsibilities returns 200 with {len(data)} items")

    def test_get_responsibilities_returns_list_with_expected_fields(self):
        """GET /api/responsibilities returns list with expected fields"""
        response = requests.get(f"{BASE_URL}/api/responsibilities?active_only=false", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            resp = data[0]
            required_fields = ["responsibility_id", "title", "description", "category", 
                              "assigned_to", "priority", "frequency", "active", "entity_id"]
            for field in required_fields:
                assert field in resp, f"Missing field: {field}"
            print(f"PASS: Responsibilities have all required fields")
        else:
            print("SKIP: No responsibilities to validate fields")

    def test_get_responsibilities_filter_by_category(self):
        """GET /api/responsibilities?category=art filters by category"""
        response = requests.get(f"{BASE_URL}/api/responsibilities?category=art&active_only=false", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for resp in data:
            assert resp["category"] == "art", f"Expected category=art, got {resp['category']}"
        print(f"PASS: Filter by category works correctly ({len(data)} items)")

    def test_get_responsibilities_active_only_filter(self):
        """GET /api/responsibilities?active_only=true returns only active"""
        response = requests.get(f"{BASE_URL}/api/responsibilities?active_only=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for resp in data:
            assert resp["active"] == True, f"Expected active=True, got {resp['active']}"
        print(f"PASS: active_only filter works correctly ({len(data)} active items)")

    # ============== POST /api/responsibilities ==============

    def test_create_responsibility_returns_201_or_200(self):
        """POST /api/responsibilities creates new responsibility"""
        payload = {
            "title": "TEST_Responsabilidade de Teste",
            "description": "Descrição da responsabilidade de teste",
            "category": "other",
            "assigned_to": self.test_member_id,
            "priority": "medium",
            "frequency": "always",
            "notes": "Notas de teste"
        }
        
        response = requests.post(f"{BASE_URL}/api/responsibilities", json=payload, headers=self.headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "responsibility_id" in data, "Missing responsibility_id in response"
        assert data["title"] == payload["title"], f"Title mismatch: {data['title']}"
        assert data["description"] == payload["description"], "Description mismatch"
        assert data["category"] == payload["category"], "Category mismatch"
        assert data["assigned_to"] == payload["assigned_to"], "assigned_to mismatch"
        assert data["priority"] == payload["priority"], "Priority mismatch"
        assert data["frequency"] == payload["frequency"], "Frequency mismatch"
        assert data["active"] == True, "Should be active by default"
        
        # Store for cleanup
        self.created_responsibility_id = data["responsibility_id"]
        print(f"PASS: POST /api/responsibilities created {data['responsibility_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/responsibilities/{data['responsibility_id']}", headers=self.headers)

    def test_create_responsibility_requires_member_exists(self):
        """POST /api/responsibilities with invalid member returns 404"""
        payload = {
            "title": "TEST_Responsabilidade Invalida",
            "description": "Teste com membro inexistente",
            "category": "other",
            "assigned_to": "member_invalid_12345",
            "priority": "low",
            "frequency": "weekly"
        }
        
        response = requests.post(f"{BASE_URL}/api/responsibilities", json=payload, headers=self.headers)
        assert response.status_code == 404, f"Expected 404 for invalid member, got {response.status_code}"
        print("PASS: POST /api/responsibilities returns 404 for invalid member")

    def test_create_responsibility_validates_required_fields(self):
        """POST /api/responsibilities without required fields returns 422"""
        payload = {"title": "TEST_Missing fields"}  # Missing required fields
        
        response = requests.post(f"{BASE_URL}/api/responsibilities", json=payload, headers=self.headers)
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("PASS: POST /api/responsibilities validates required fields")

    # ============== PUT /api/responsibilities/{id} ==============

    def test_update_responsibility(self):
        """PUT /api/responsibilities/{id} updates responsibility"""
        # First create a responsibility
        create_payload = {
            "title": "TEST_Resp para Update",
            "description": "Será atualizada",
            "category": "production",
            "assigned_to": self.test_member_id,
            "priority": "low",
            "frequency": "weekly"
        }
        create_resp = requests.post(f"{BASE_URL}/api/responsibilities", json=create_payload, headers=self.headers)
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        resp_id = create_resp.json()["responsibility_id"]
        
        # Now update
        update_payload = {
            "title": "TEST_Resp ATUALIZADA",
            "description": "Descrição atualizada",
            "category": "art",
            "assigned_to": self.test_member_id,
            "priority": "high",
            "frequency": "monthly",
            "notes": "Notas atualizadas"
        }
        
        update_resp = requests.put(f"{BASE_URL}/api/responsibilities/{resp_id}", json=update_payload, headers=self.headers)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.status_code} - {update_resp.text}"
        
        updated = update_resp.json()
        assert updated["title"] == update_payload["title"], "Title not updated"
        assert updated["description"] == update_payload["description"], "Description not updated"
        assert updated["category"] == update_payload["category"], "Category not updated"
        assert updated["priority"] == update_payload["priority"], "Priority not updated"
        assert updated["frequency"] == update_payload["frequency"], "Frequency not updated"
        
        print(f"PASS: PUT /api/responsibilities/{resp_id} updated successfully")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["title"] == update_payload["title"], "Updated data not persisted"
        print("PASS: Updated data verified with GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)

    def test_update_nonexistent_responsibility_returns_404(self):
        """PUT /api/responsibilities/{id} with invalid id returns 404"""
        payload = {
            "title": "TEST_Nonexistent",
            "description": "Test",
            "category": "other",
            "assigned_to": self.test_member_id,
            "priority": "low",
            "frequency": "always"
        }
        
        response = requests.put(f"{BASE_URL}/api/responsibilities/resp_invalid_12345", json=payload, headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: PUT /api/responsibilities with invalid id returns 404")

    # ============== PATCH /api/responsibilities/{id}/toggle ==============

    def test_toggle_responsibility_status(self):
        """PATCH /api/responsibilities/{id}/toggle toggles active status"""
        # Create a responsibility
        create_payload = {
            "title": "TEST_Resp para Toggle",
            "description": "Será toggleada",
            "category": "admin",
            "assigned_to": self.test_member_id,
            "priority": "medium",
            "frequency": "as_needed"
        }
        create_resp = requests.post(f"{BASE_URL}/api/responsibilities", json=create_payload, headers=self.headers)
        assert create_resp.status_code in [200, 201]
        resp_id = create_resp.json()["responsibility_id"]
        initial_active = create_resp.json()["active"]
        
        # Toggle (should become inactive)
        toggle_resp = requests.patch(f"{BASE_URL}/api/responsibilities/{resp_id}/toggle", headers=self.headers)
        assert toggle_resp.status_code == 200, f"Toggle failed: {toggle_resp.status_code} - {toggle_resp.text}"
        toggle_data = toggle_resp.json()
        assert "active" in toggle_data, "Response should contain active field"
        assert toggle_data["active"] != initial_active, f"Active should toggle from {initial_active}"
        
        print(f"PASS: PATCH /toggle changed active from {initial_active} to {toggle_data['active']}")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["active"] == toggle_data["active"], "Toggle not persisted"
        print("PASS: Toggle persisted correctly")
        
        # Toggle again (should become active again)
        toggle_resp2 = requests.patch(f"{BASE_URL}/api/responsibilities/{resp_id}/toggle", headers=self.headers)
        assert toggle_resp2.status_code == 200
        assert toggle_resp2.json()["active"] == initial_active, "Second toggle should restore original"
        print("PASS: Second toggle restored original status")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)

    def test_toggle_nonexistent_responsibility_returns_404(self):
        """PATCH /api/responsibilities/{id}/toggle with invalid id returns 404"""
        response = requests.patch(f"{BASE_URL}/api/responsibilities/resp_invalid_12345/toggle", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: PATCH /toggle with invalid id returns 404")

    # ============== DELETE /api/responsibilities/{id} ==============

    def test_delete_responsibility(self):
        """DELETE /api/responsibilities/{id} removes responsibility"""
        # Create a responsibility to delete
        create_payload = {
            "title": "TEST_Resp para Deletar",
            "description": "Será deletada",
            "category": "content",
            "assigned_to": self.test_member_id,
            "priority": "low",
            "frequency": "monthly"
        }
        create_resp = requests.post(f"{BASE_URL}/api/responsibilities", json=create_payload, headers=self.headers)
        assert create_resp.status_code in [200, 201]
        resp_id = create_resp.json()["responsibility_id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.status_code} - {delete_resp.text}"
        
        print(f"PASS: DELETE /api/responsibilities/{resp_id} returned 200")
        
        # Verify it's deleted (GET should return 404)
        get_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert get_resp.status_code == 404, f"Expected 404 after delete, got {get_resp.status_code}"
        print("PASS: Deleted responsibility returns 404 on GET")

    def test_delete_nonexistent_responsibility_returns_404(self):
        """DELETE /api/responsibilities/{id} with invalid id returns 404"""
        response = requests.delete(f"{BASE_URL}/api/responsibilities/resp_invalid_12345", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: DELETE with invalid id returns 404")

    # ============== GET /api/responsibilities/{id} ==============

    def test_get_single_responsibility(self):
        """GET /api/responsibilities/{id} returns single responsibility"""
        # First get list to find an ID
        list_resp = requests.get(f"{BASE_URL}/api/responsibilities?active_only=false", headers=self.headers)
        assert list_resp.status_code == 200
        responsibilities = list_resp.json()
        
        if len(responsibilities) > 0:
            resp_id = responsibilities[0]["responsibility_id"]
            get_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
            assert get_resp.status_code == 200, f"GET single failed: {get_resp.status_code}"
            data = get_resp.json()
            assert data["responsibility_id"] == resp_id, "ID mismatch"
            print(f"PASS: GET /api/responsibilities/{resp_id} returned correct data")
        else:
            print("SKIP: No responsibilities to test single GET")

    def test_get_nonexistent_responsibility_returns_404(self):
        """GET /api/responsibilities/{id} with invalid id returns 404"""
        response = requests.get(f"{BASE_URL}/api/responsibilities/resp_invalid_12345", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET with invalid id returns 404")

    # ============== GET /api/responsibilities/by-member/{member_id} ==============

    def test_get_responsibilities_by_member(self):
        """GET /api/responsibilities/by-member/{member_id} returns responsibilities for member"""
        response = requests.get(f"{BASE_URL}/api/responsibilities/by-member/{self.test_member_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list"
        
        for resp in data:
            assert resp["assigned_to"] == self.test_member_id, f"Unexpected assigned_to: {resp['assigned_to']}"
        
        print(f"PASS: GET /api/responsibilities/by-member returned {len(data)} items for {self.test_member_name}")

    # ============== FULL CRUD FLOW ==============

    def test_full_crud_flow(self):
        """Complete CRUD flow: Create -> Read -> Update -> Toggle -> Delete"""
        # CREATE
        create_payload = {
            "title": "TEST_Full CRUD Flow",
            "description": "Testing complete CRUD operations",
            "category": "social_media",
            "assigned_to": self.test_member_id,
            "priority": "high",
            "frequency": "weekly",
            "notes": "Test notes"
        }
        create_resp = requests.post(f"{BASE_URL}/api/responsibilities", json=create_payload, headers=self.headers)
        assert create_resp.status_code in [200, 201], f"CREATE failed: {create_resp.text}"
        created = create_resp.json()
        resp_id = created["responsibility_id"]
        print(f"1. CREATE: {resp_id} created successfully")
        
        # READ
        read_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert read_resp.status_code == 200, f"READ failed: {read_resp.text}"
        assert read_resp.json()["title"] == create_payload["title"]
        print(f"2. READ: {resp_id} fetched successfully")
        
        # UPDATE
        update_payload = {
            "title": "TEST_Full CRUD Flow UPDATED",
            "description": "Updated description",
            "category": "art",
            "assigned_to": self.test_member_id,
            "priority": "low",
            "frequency": "monthly",
            "notes": "Updated notes"
        }
        update_resp = requests.put(f"{BASE_URL}/api/responsibilities/{resp_id}", json=update_payload, headers=self.headers)
        assert update_resp.status_code == 200, f"UPDATE failed: {update_resp.text}"
        assert update_resp.json()["title"] == update_payload["title"]
        print(f"3. UPDATE: {resp_id} updated successfully")
        
        # TOGGLE (active -> inactive)
        toggle_resp = requests.patch(f"{BASE_URL}/api/responsibilities/{resp_id}/toggle", headers=self.headers)
        assert toggle_resp.status_code == 200, f"TOGGLE failed: {toggle_resp.text}"
        assert toggle_resp.json()["active"] == False
        print(f"4. TOGGLE: {resp_id} deactivated successfully")
        
        # DELETE
        delete_resp = requests.delete(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert delete_resp.status_code == 200, f"DELETE failed: {delete_resp.text}"
        print(f"5. DELETE: {resp_id} deleted successfully")
        
        # VERIFY DELETED
        verify_resp = requests.get(f"{BASE_URL}/api/responsibilities/{resp_id}", headers=self.headers)
        assert verify_resp.status_code == 404
        print(f"6. VERIFY: {resp_id} confirmed deleted (404)")
        
        print("PASS: Full CRUD flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
