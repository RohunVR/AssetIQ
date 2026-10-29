"""
AssetIQ - Comprehensive End-to-End System & Workflow Verification Suite
Tests all 8 core institutional workflows, role permissions, limit checks, and state transitions.
"""
import sys
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.app.models import (
    User, Asset, InventoryItem, BorrowingRequest, MaintenanceRecord, SystemSetting
)
from backend.app.seed import seed_database

class TestAssetIQWorkflows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Reset and recreate database with fresh seed data for clean test runs
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        seed_database()
        cls.client = TestClient(app)

        # Login helpers
        def login(email, password):
            res = cls.client.post("/api/auth/login", json={"email": email, "password": password})
            assert res.status_code == 200, f"Login failed for {email}: {res.text}"
            return res.json()["access_token"]

        cls.admin_token = login("admin@college.edu", "Admin@123")
        cls.staff_cse_token = login("staff.cse@college.edu", "Staff@123")
        cls.staff_ece_token = login("staff.ece@college.edu", "Staff@123")
        cls.faculty_token = login("faculty.cse@college.edu", "Faculty@123")
        cls.student_cse_token = login("student.cse@college.edu", "Student@123")
        cls.student_ece_token = login("student.ece@college.edu", "Student@123")

    def test_01_authentication_and_authorization(self):
        """Test authentication and strict role-based access control (RBAC)"""
        print("\n[TEST 1] Testing Authentication & RBAC...")
        # Invalid credentials test
        res = self.client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "WrongPassword!"})
        self.assertEqual(res.status_code, 401)

        # Demo switch test
        res = self.client.post("/api/auth/demo-login", json={"role": "ADMIN"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["role"], "ADMIN")

        # Student attempting to access Admin User Directory -> must be 403 Forbidden
        headers = {"Authorization": f"Bearer {self.student_cse_token}"}
        res = self.client.get("/api/users", headers=headers)
        self.assertEqual(res.status_code, 403, "Student should not have access to user management")

        # Student attempting to directly register an asset -> must be 403 Forbidden
        res = self.client.post("/api/assets", headers=headers, json={
            "asset_code": "AST-ILLEGAL-01",
            "name": "Hacked Asset",
            "category": "Computing",
            "department_id": 1
        })
        self.assertEqual(res.status_code, 403, "Student must not be able to create assets")
        print("  ✓ Authentication and RBAC properly enforced.")

    def test_02_cross_department_asset_visibility(self):
        """Test requirement: Users must be able to view assets across departments"""
        print("\n[TEST 2] Testing Cross-Department Asset Visibility...")
        headers = {"Authorization": f"Bearer {self.student_cse_token}"}
        res = self.client.get("/api/assets", headers=headers)
        self.assertEqual(res.status_code, 200)
        assets = res.json()
        dept_codes = set(a["department_code"] for a in assets if a.get("department_code"))
        # Must see CSE, ECE, and AIML assets
        self.assertIn("CSE", dept_codes)
        self.assertIn("ECE", dept_codes)
        self.assertIn("AIML", dept_codes)
        print(f"  ✓ CSE student successfully queried catalog across all departments: {dept_codes}")

    def test_03_borrowing_duration_and_limit_enforcement(self):
        """Test borrowing limits: max borrowing duration and max concurrent items"""
        print("\n[TEST 3] Testing Borrowing Limit Validations...")
        headers = {"Authorization": f"Bearer {self.student_cse_token}"}

        # Find an available asset
        res = self.client.get("/api/assets?status=Available", headers=headers)
        available_assets = res.json()
        self.assertTrue(len(available_assets) > 0, "Need at least 1 available asset")
        target_asset = available_assets[0]

        # 1. Attempt borrowing with duration > 7 days (e.g. 15 days) -> Must be rejected (400)
        req_payload = {
            "asset_id": target_asset["id"],
            "duration_days": 15,
            "intended_purpose": "Test exceeding duration limit",
        }
        res = self.client.post("/api/borrowing/requests", headers=headers, json=req_payload)
        self.assertEqual(res.status_code, 400, "Exceeding duration limit should return 400")
        self.assertIn("exceeds maximum allowable borrowing limit", res.json()["detail"])
        print("  ✓ Borrowing duration limit properly rejected excessive days.")

    def test_04_full_borrowing_and_approval_workflow(self):
        """Test borrowing request submission and lab staff approval"""
        print("\n[TEST 4] Testing Full Borrowing & Approval Workflow...")
        headers_student = {"Authorization": f"Bearer {self.faculty_token}"}
        headers_staff = {"Authorization": f"Bearer {self.staff_ece_token}"}

        # Find an Available ECE asset
        res = self.client.get("/api/assets?department_id=2&status=Available", headers=headers_student)
        ece_assets = res.json()
        self.assertTrue(len(ece_assets) > 0, "Need available ECE asset")
        asset = ece_assets[0]

        # Faculty requests asset for 3 days
        req_res = self.client.post("/api/borrowing/requests", headers=headers_student, json={
            "asset_id": asset["id"],
            "duration_days": 3,
            "intended_purpose": "Class demonstration for Analog Signal Processing.",
        })
        self.assertEqual(req_res.status_code, 201)
        borrow_data = req_res.json()
        self.assertEqual(borrow_data["status"], "Pending")

        # Verify asset status is now 'Pending Request'
        asset_check = self.client.get(f"/api/assets/{asset['id']}", headers=headers_student).json()
        self.assertEqual(asset_check["status"], "Pending Request")

        # Lab Staff approves request
        approve_res = self.client.post(f"/api/borrowing/requests/{borrow_data['id']}/approve", headers=headers_staff, json={})
        self.assertEqual(approve_res.status_code, 200)
        approved_data = approve_res.json()
        self.assertEqual(approved_data["status"], "Approved")
        self.assertIsNotNone(approved_data["due_date"])

        # Verify asset status is now 'Borrowed'
        asset_check = self.client.get(f"/api/assets/{asset['id']}", headers=headers_student).json()
        self.assertEqual(asset_check["status"], "Borrowed")
        print("  ✓ Request created -> Asset marked Pending Request -> Staff approved -> Asset marked Borrowed with due date.")

    def test_05_return_workflow_with_damage_routing(self):
        """Test equipment return with condition 'Damaged' flagging asset as DAMAGED"""
        print("\n[TEST 5] Testing Return Workflow with Damage Routing...")
        headers_staff = {"Authorization": f"Bearer {self.staff_cse_token}"}

        # AST-CSE-004 is currently borrowed by Rahul Sharma
        db = SessionLocal()
        req = db.query(BorrowingRequest).filter(BorrowingRequest.request_code == "REQ-20250915-HPZ201").first()
        req_id = req.id
        db.close()

        # Staff records return with condition 'Damaged'
        ret_res = self.client.post(f"/api/borrowing/requests/{req_id}/return", headers=headers_staff, json={
            "returned_condition": "Damaged",
            "return_notes": "Power supply fan failure and error code 43 on GPU.",
        })
        self.assertEqual(ret_res.status_code, 200)
        ret_data = ret_res.json()
        self.assertEqual(ret_data["status"], "Returned")
        self.assertEqual(ret_data["returned_condition"], "Damaged")

        # Verify asset is now DAMAGED (NOT Available!)
        asset_check = self.client.get(f"/api/assets/{ret_data['asset_id']}", headers=headers_staff).json()
        self.assertEqual(asset_check["status"], "Damaged")
        self.assertEqual(asset_check["condition"], "Damaged")
        print("  ✓ Return with damage successfully marked asset as DAMAGED and prevented auto-release.")

    def test_06_maintenance_workflow_and_manual_readiness_verification(self):
        """
        CRITICAL REQUIREMENT TEST:
        When maintenance is completed, DO NOT automatically make the asset Available.
        Lab Staff must manually confirm that the asset is ready for use.
        Only then should the asset become Available.
        """
        print("\n[TEST 6] Testing Maintenance & Manual Staff Readiness Verification...")
        headers_staff = {"Authorization": f"Bearer {self.staff_cse_token}"}

        # AST-CSE-005 is Damaged MakerBot 3D Printer. Let's create or update maintenance.
        # Find pending ticket for 3D printer
        db = SessionLocal()
        maint = db.query(MaintenanceRecord).filter(MaintenanceRecord.ticket_code == "MNT-20250927-PRN03").first()
        ticket_id = maint.id
        asset_id = maint.asset_id
        db.close()

        # Update status to 'Completed'
        upd_res = self.client.put(f"/api/maintenance/{ticket_id}", headers=headers_staff, json={
            "status": "Completed",
            "work_description": "Replaced clogged nozzle and replaced Bowden PTFE tube. Tested test cube print.",
            "cost": 1800.0,
            "technician_name": "Senior Technician Ramesh",
        })
        self.assertEqual(upd_res.status_code, 200)

        # CHECK CRITICAL RULE: Asset must STILL be NOT Available!
        asset_check = self.client.get(f"/api/assets/{asset_id}", headers=headers_staff).json()
        self.assertNotEqual(asset_check["status"], "Available", "CRITICAL RULE: Completed maintenance MUST NOT auto-release asset!")
        print("  ✓ CRITICAL VERIFIED: Maintenance status is Completed, but asset status is NOT automatically set to Available.")

        # Now, Lab Staff explicitly executes the manual readiness confirmation:
        ready_res = self.client.post(f"/api/maintenance/{ticket_id}/confirm-ready", headers=headers_staff, json={})
        self.assertEqual(ready_res.status_code, 200)
        self.assertTrue(ready_res.json()["is_ready_for_use"])

        # NOW AND ONLY NOW does asset become Available
        asset_check_after = self.client.get(f"/api/assets/{asset_id}", headers=headers_staff).json()
        self.assertEqual(asset_check_after["status"], "Available")
        self.assertEqual(asset_check_after["condition"], "Good")
        print("  ✓ CRITICAL VERIFIED: Asset only restored to Available after explicit manual staff readiness confirmation.")

    def test_07_consumable_inventory_and_low_stock_alerts(self):
        """Test stock-in, stock-out, quantity reduction, threshold validation, and low-stock alerts"""
        print("\n[TEST 7] Testing Consumable Inventory & Low-Stock Alerts...")
        headers_staff = {"Authorization": f"Bearer {self.staff_ece_token}"}

        # Find 9V Batteries (INV-ECE-003, qty 40, threshold 15)
        res = self.client.get("/api/inventory", headers=headers_staff)
        items = res.json()
        batt = next(i for i in items if i["item_code"] == "INV-ECE-003")
        init_qty = batt["quantity"]

        # 1. Stock In (+20)
        in_res = self.client.post(f"/api/inventory/{batt['id']}/stock-in", headers=headers_staff, json={
            "quantity": 20,
            "reason": "Replenishment box received",
        })
        self.assertEqual(in_res.status_code, 200)
        self.assertEqual(in_res.json()["quantity"], init_qty + 20)

        # 2. Stock Out (-50) -> New quantity = (40 + 20) - 50 = 10 (below threshold 15!)
        out_res = self.client.post(f"/api/inventory/{batt['id']}/stock-out", headers=headers_staff, json={
            "quantity": 50,
            "reason": "Issued for ECE 2nd Year IoT practical project",
        })
        self.assertEqual(out_res.status_code, 200)
        new_data = out_res.json()
        self.assertEqual(new_data["quantity"], 10)
        self.assertTrue(new_data["is_low_stock"])

        # 3. Check low stock alert appeared in /api/alerts
        alerts = self.client.get("/api/alerts", headers=headers_staff).json()
        low_stock_alert = any("9V Alkaline Heavy Duty Batteries" in a["title"] or "INV-ECE-003" in a["title"] or "9V" in a["message"] for a in alerts)
        self.assertTrue(low_stock_alert, "Low-stock alert must be generated when stock drops below threshold")

        # 4. Attempting to issue more than available (e.g. 15 when only 10 available) -> Must reject with 400
        over_out = self.client.post(f"/api/inventory/{batt['id']}/stock-out", headers=headers_staff, json={
            "quantity": 15,
            "reason": "Attempting negative stock",
        })
        self.assertEqual(over_out.status_code, 400)
        print("  ✓ Stock receive (+20), issue (-50), low-stock alert trigger, and over-draw prevention verified.")

    def test_08_overdue_detection_system(self):
        """Test overdue loan detection and overdue alert generation"""
        print("\n[TEST 8] Testing Overdue Loan Detection & Alerts...")
        headers = {"Authorization": f"Bearer {self.staff_ece_token}"}

        # Trigger sync overdue
        sync_res = self.client.get("/api/borrowing/sync-overdue", headers=headers)
        self.assertEqual(sync_res.status_code, 200)

        # Check overdue list
        res = self.client.get("/api/borrowing?overdue_only=true", headers=headers)
        self.assertEqual(res.status_code, 200)
        overdue_items = res.json()
        self.assertTrue(len(overdue_items) > 0, "Should have at least 1 overdue item from sample data")
        first_overdue = overdue_items[0]
        self.assertEqual(first_overdue["status"], "Overdue")

        # Check that alerts contains overdue alert
        alerts = self.client.get("/api/alerts", headers=headers).json()
        has_overdue = any(a["type"] == "overdue" for a in alerts)
        self.assertTrue(has_overdue, "Overdue alert must be present")
        print(f"  ✓ Overdue item '{first_overdue['asset_code']}' detected and flagged with system alert.")

    def test_09_admin_settings_configuration(self):
        """Test Admin dynamic borrowing limit configuration"""
        print("\n[TEST 9] Testing Admin Settings Configuration...")
        headers_admin = {"Authorization": f"Bearer {self.admin_token}"}

        res = self.client.put("/api/settings", headers=headers_admin, json={
            "max_active_assets": 5,
            "max_borrowing_days": 10,
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["max_active_assets"], 5)
        self.assertEqual(res.json()["max_borrowing_days"], 10)

        # Reset back to 3 and 7
        self.client.put("/api/settings", headers=headers_admin, json={
            "max_active_assets": 3,
            "max_borrowing_days": 7,
        })
        print("  ✓ Admin configurable borrowing limits updated and verified.")

    def test_10_library_book_borrowing_and_librarian_approval(self):
        """Test library book borrowing request and approval by Librarian"""
        print("\n[TEST 10] Testing Library Book Borrowing & Librarian Approval...")
        
        # 1. Login Librarian
        lib_login = self.client.post("/api/auth/login", json={
            "email": "librarian@college.edu",
            "password": "Library@123",
        })
        self.assertEqual(lib_login.status_code, 200)
        lib_token = lib_login.json()["access_token"]
        headers_lib = {"Authorization": f"Bearer {lib_token}"}

        # 2. Student searches for an available book in library
        headers_stu = {"Authorization": f"Bearer {self.student_cse_token}"}
        res = self.client.get("/api/assets?category=Textbooks", headers=headers_stu)
        self.assertEqual(res.status_code, 200)
        books = res.json()
        avail_books = [b for b in books if b["status"] == "Available"]
        self.assertTrue(len(avail_books) > 0, "Must have available textbooks in library")
        book = avail_books[0]

        # 3. Student requests to borrow book
        req_res = self.client.post("/api/borrowing/requests", headers=headers_stu, json={
            "asset_id": book["id"],
            "duration_days": 7,
            "intended_purpose": "Study for upcoming mid-term exam",
        })
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        # 4. Librarian sees request in pending list
        pending = self.client.get("/api/borrowing?status=Pending", headers=headers_lib).json()
        self.assertTrue(any(r["id"] == req_id for r in pending), "Librarian must see pending book request")

        # 5. Librarian approves request
        appr_res = self.client.post(f"/api/borrowing/requests/{req_id}/approve", headers=headers_lib, json={})
        self.assertEqual(appr_res.status_code, 200)
        self.assertEqual(appr_res.json()["status"], "Approved")

        # 6. Asset is now Borrowed
        book_after = self.client.get(f"/api/assets/{book['id']}", headers=headers_lib).json()
        self.assertEqual(book_after["status"], "Borrowed")
        print(f"  ✓ Library book '{book['name']}' requested by student and approved by Librarian ({lib_login.json()['user']['full_name']}).")

if __name__ == "__main__":
    unittest.main()

