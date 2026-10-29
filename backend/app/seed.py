from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models import (
    User,
    Department,
    Laboratory,
    Asset,
    InventoryItem,
    InventoryTransaction,
    BorrowingRequest,
    MaintenanceRecord,
    SystemSetting,
)
from backend.app.security import hash_password
from backend.app.time_util import utc_now

def seed_database():
    """Seed initial realistic college data if database is empty"""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding AssetIQ database with realistic college data...")

        # 1. System Settings (Borrowing Limits)
        settings = [
            SystemSetting(key="max_active_assets", value="3", description="Maximum simultaneous active borrowings per user"),
            SystemSetting(key="max_borrowing_days", value="7", description="Maximum borrowing duration in days"),
        ]
        db.add_all(settings)
        db.commit()

        # 2. Departments
        cse = Department(
            code="CSE",
            name="Computer Science and Engineering",
            description="Department of Computer Science & Engineering - Computing Systems & Software",
        )
        ece = Department(
            code="ECE",
            name="Electronics and Communication Engineering",
            description="Department of Electronics & Communication - Circuits, Hardware & Telecommunications",
        )
        aiml = Department(
            code="AIML",
            name="Artificial Intelligence and Machine Learning",
            description="Department of AI & Data Science - Intelligent Robotics & Machine Learning",
        )
        lib_dept = Department(
            code="LIB",
            name="Central Library",
            description="Institutional library housing textbooks, references, journals, and digital resources.",
        )
        db.add_all([cse, ece, aiml, lib_dept])
        db.commit()

        # 3. Laboratories
        labs = [
            # CSE Labs
            Laboratory(code="LAB-PROG", name="Programming Laboratory", department_id=cse.id, location="Block A, Room 301"),
            Laboratory(code="LAB-AI", name="AI & Deep Learning Lab", department_id=cse.id, location="Block A, Room 304"),
            Laboratory(code="LAB-NET", name="Networks & Cloud Computing Lab", department_id=cse.id, location="Block A, Room 308"),
            # ECE Labs
            Laboratory(code="LAB-ELEC", name="Electronics & Circuits Lab", department_id=ece.id, location="Block B, Room 102"),
            Laboratory(code="LAB-IOT", name="IoT & Embedded Systems Lab", department_id=ece.id, location="Block B, Room 105"),
            # AIML Lab
            Laboratory(code="LAB-ROBO", name="Robotics & Computer Vision Lab", department_id=aiml.id, location="Block C, Room 201"),
            # Library Section
            Laboratory(code="LIB-MAIN", name="Main Library Collection", department_id=lib_dept.id, location="Central Library, Ground Floor"),
        ]
        db.add_all(labs)
        db.commit()

        # Lab lookup map
        lab_prog = labs[0]
        lab_ai = labs[1]
        lab_net = labs[2]
        lab_elec = labs[3]
        lab_iot = labs[4]
        lab_robo = labs[5]
        lab_lib = labs[6]

        # 4. Users (All 4 roles represented with clean credentials)
        users = [
            # ADMIN
            User(
                email="admin@college.edu",
                hashed_password=hash_password("Admin@123"),
                full_name="Dr. Eleanor Vance",
                role="ADMIN",
                student_or_staff_id="ADM-001",
                phone="+91 98765 43210",
                is_active=True,
            ),
            # LAB STAFF
            User(
                email="staff.cse@college.edu",
                hashed_password=hash_password("Staff@123"),
                full_name="Robert Sterling (CSE Staff)",
                role="LAB_STAFF",
                department_id=cse.id,
                student_or_staff_id="STF-CSE-101",
                phone="+91 98765 43211",
                is_active=True,
            ),
            User(
                email="staff.ece@college.edu",
                hashed_password=hash_password("Staff@123"),
                full_name="Dr. Meera Nambiar (ECE Staff)",
                role="LAB_STAFF",
                department_id=ece.id,
                student_or_staff_id="STF-ECE-102",
                phone="+91 98765 43212",
                is_active=True,
            ),
            # AIML LAB STAFF
            User(
                email="staff.aiml@college.edu",
                hashed_password=hash_password("Staff@123"),
                full_name="Dr. Riya Khanna (AIML Staff)",
                role="LAB_STAFF",
                department_id=aiml.id,
                student_or_staff_id="STF-AIML-103",
                phone="+91 98765 43216",
                is_active=True,
            ),
            # LIBRARIAN
            User(
                email="librarian@college.edu",
                hashed_password=hash_password("Library@123"),
                full_name="Ms. Priya Raghavan",
                role="LAB_STAFF",
                department_id=lib_dept.id,
                student_or_staff_id="LIB-001",
                phone="+91 99001 12233",
                is_active=True,
            ),
            # FACULTY
            User(
                email="faculty.cse@college.edu",
                hashed_password=hash_password("Faculty@123"),
                full_name="Prof. Alan Turing",
                role="FACULTY",
                department_id=cse.id,
                student_or_staff_id="FAC-CSE-201",
                phone="+91 98765 43213",
                is_active=True,
            ),
            # STUDENTS
            User(
                email="student.cse@college.edu",
                hashed_password=hash_password("Student@123"),
                full_name="Rahul Sharma",
                role="STUDENT",
                department_id=cse.id,
                student_or_staff_id="STU-2022-CSE-045",
                phone="+91 98765 43214",
                is_active=True,
            ),
            User(
                email="student.ece@college.edu",
                hashed_password=hash_password("Student@123"),
                full_name="Ananya Iyer",
                role="STUDENT",
                department_id=ece.id,
                student_or_staff_id="STU-2022-ECE-089",
                phone="+91 98765 43215",
                is_active=True,
            ),
        ]
        db.add_all(users)
        db.commit()

        admin_user = users[0]
        staff_cse = users[1]
        staff_ece = users[2]
        staff_aiml = users[3]
        # users[4] = Librarian
        faculty_user = users[5]
        student_cse = users[6]
        student_ece = users[7]

        # 5. Assets (Trackable physical items)
        today = date.today()
        assets = [
            # Available Assets
            Asset(
                asset_code="AST-CSE-001",
                name="Dell Precision 5570 Mobile Workstation",
                category="Computing",
                description="Intel i7-12800H, 32GB DDR5, RTX A2000 GPU, 1TB SSD. Intended for deep learning and heavy simulation labs.",
                department_id=cse.id,
                laboratory_id=lab_ai.id,
                location="Rack 1, Shelf B",
                purchase_date=today - timedelta(days=180),
                serial_number="SN-DELL-882391",
                model_number="Precision 5570",
                cost=185000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-CSE-002",
                name="Epson EB-2250U Full HD Projector",
                category="AV Equipment",
                description="5,000 Lumens Full HD multimedia classroom projector with HDMI/VGA and wireless mirrorcast.",
                department_id=cse.id,
                laboratory_id=lab_prog.id,
                location="Ceiling Mount / Cart 2",
                purchase_date=today - timedelta(days=360),
                serial_number="SN-EPS-991204",
                model_number="EB-2250U",
                cost=82000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-CSE-003",
                name="Cisco Catalyst 2960-X Managed Switch",
                category="Networking",
                description="48 Port Gigabit Ethernet PoE+ switch with 4x 1G SFP uplinks for network routing labs.",
                department_id=cse.id,
                laboratory_id=lab_net.id,
                location="Server Rack 3, Unit 12",
                purchase_date=today - timedelta(days=400),
                serial_number="SN-CSCO-110294",
                model_number="WS-C2960X-48FPS-L",
                cost=95000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-ECE-001",
                name="Tektronix TBS1102B Digital Storage Oscilloscope",
                category="Lab Instruments",
                description="100 MHz, 2-Channel, 2 GS/s sampling rate with advanced digital triggers and USB data logging.",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                location="Bench 4, Shelf A",
                purchase_date=today - timedelta(days=250),
                serial_number="SN-TEK-449102",
                model_number="TBS1102B",
                cost=48000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-ECE-002",
                name="Rigol DG1022Z Function / Arbitrary Waveform Generator",
                category="Lab Instruments",
                description="25 MHz dual-channel waveform generator with 200 MSa/s sample rate and built-in arbitrary waveforms.",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                location="Bench 2, Cabinet 1",
                purchase_date=today - timedelta(days=220),
                serial_number="SN-RIG-339182",
                model_number="DG1022Z",
                cost=34000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-ECE-003",
                name="Arduino Mega 2560 Ultimate Hardware Kit",
                category="Robotics & IoT",
                description="Microcontroller development kit including sensors, stepper motors, LCD, relay modules, and carrying case.",
                department_id=ece.id,
                laboratory_id=lab_iot.id,
                location="Storage Bin 7",
                purchase_date=today - timedelta(days=90),
                serial_number="SN-ARD-881920",
                model_number="Mega 2560 R3",
                cost=6500.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-AIML-001",
                name="TurtleBot 3 Burger Autonomous Mobile Robot",
                category="Robotics & IoT",
                description="ROS 2 driven mobile robot with 360 LiDAR, Raspberry Pi 4 controller, OpenCR control board.",
                department_id=aiml.id,
                laboratory_id=lab_robo.id,
                location="Robotics Arena A",
                purchase_date=today - timedelta(days=150),
                serial_number="SN-TB3-558291",
                model_number="TB3-BURGER",
                cost=120000.0,
                condition="Good",
                status="Available",
            ),
            Asset(
                asset_code="AST-AIML-002",
                name="Sony Alpha A7 IV 4K Mirrorless Camera Kit",
                category="AV Equipment",
                description="33MP Full-frame sensor, 4K 60p video, FE 24-70mm f/2.8 GM lens, for computer vision dataset capture.",
                department_id=aiml.id,
                laboratory_id=lab_robo.id,
                location="Secure Safe 1, Drawer 3",
                purchase_date=today - timedelta(days=120),
                serial_number="SN-SNY-773821",
                model_number="ILCE-7M4K",
                cost=215000.0,
                condition="Good",
                status="Available",
            ),

            # Currently Borrowed Asset (Rahul Sharma)
            Asset(
                asset_code="AST-CSE-004",
                name="HP Z2 Tower G9 Workstation",
                category="Computing",
                description="Intel Core i9-13900K, 64GB RAM, Nvidia RTX 4080 16GB, 2TB NVMe SSD for capstone project training.",
                department_id=cse.id,
                laboratory_id=lab_ai.id,
                location="Station 8",
                purchase_date=today - timedelta(days=100),
                serial_number="SN-HP-662910",
                model_number="Z2-G9-TW",
                cost=240000.0,
                condition="Good",
                status="Borrowed",
            ),

            # OVERDUE Asset (Ananya Iyer - past due date by 3 days!)
            Asset(
                asset_code="AST-ECE-004",
                name="FLIR E8-XT Infrared Thermal Camera",
                category="Lab Instruments",
                description="Handheld thermal imaging camera, 320x240 thermal resolution with MSX image enhancement for PCB inspection.",
                department_id=ece.id,
                laboratory_id=lab_iot.id,
                location="Cabinet C, Shelf 2",
                purchase_date=today - timedelta(days=300),
                serial_number="SN-FLIR-992013",
                model_number="E8-XT",
                cost=145000.0,
                condition="Good",
                status="Overdue",
            ),

            # Under Maintenance Asset
            Asset(
                asset_code="AST-ECE-005",
                name="Keysight N9320B RF Spectrum Analyzer",
                category="Lab Instruments",
                description="9 kHz to 3.0 GHz RF spectrum analyzer. Currently undergoing annual RF calibration and tracking generator check.",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                location="Service Bay 1",
                purchase_date=today - timedelta(days=500),
                serial_number="SN-KEYS-102934",
                model_number="N9320B",
                cost=380000.0,
                condition="Good",
                status="Under Maintenance",
            ),

            # Damaged Asset (requires repair ticket)
            Asset(
                asset_code="AST-CSE-005",
                name="MakerBot Sketch 3D Printer",
                category="Computing",
                description="Dual heated build plate 3D printer. Jammed extruder nozzle and damaged Bowden tube during student print run.",
                department_id=cse.id,
                laboratory_id=lab_prog.id,
                location="Workbench 3",
                purchase_date=today - timedelta(days=210),
                serial_number="SN-MB-440192",
                model_number="Sketch Large",
                cost=110000.0,
                condition="Damaged",
                status="Damaged",
            ),

            # Retired Asset
            Asset(
                asset_code="AST-CSE-006",
                name="Legacy Dell OptiPlex 790 Desktop",
                category="Computing",
                description="Core i3-2100, 4GB DDR3 RAM, 250GB HDD. Obsolete architecture decommissioned from programming lab.",
                department_id=cse.id,
                laboratory_id=lab_prog.id,
                location="Depot / Storage Block D",
                purchase_date=today - timedelta(days=2500),
                serial_number="SN-DELL-OLD-0012",
                model_number="OptiPlex 790",
                cost=35000.0,
                condition="Minor Damage",
                status="Retired",
            ),
        ]
        db.add_all(assets)
        db.commit()

        # Seed Library Books
        try:
            from backend.app.library_seed import BOOKS
            book_assets = []
            b_cnt = 1
            import uuid
            for category, book_list in BOOKS.items():
                for title, author, shelf, condition in book_list:
                    book_assets.append(
                        Asset(
                            asset_code=f"LIB-{category[:3].upper()}-{b_cnt:03d}",
                            name=title,
                            category=category,
                            description=f"Author(s): {author}",
                            department_id=lib_dept.id,
                            laboratory_id=lab_lib.id,
                            location=f"Shelf {shelf}",
                            purchase_date=date(2022, 6, 1),
                            serial_number=None,
                            model_number=f"ISBN-{uuid.uuid4().hex[:10].upper()}",
                            cost=450.0,
                            condition=condition,
                            status="Available",
                        )
                    )
                    b_cnt += 1
            db.add_all(book_assets)
            db.commit()
        except Exception as e:
            print(f"Notice: library books seed: {e}")

        # 6. Inventory Consumables (Managed internally by Lab Staff)
        inventory_items = [
            InventoryItem(
                item_code="INV-ECE-001",
                name="Premium Male-to-Male Jumper Wires (Pack of 65)",
                category="Wiring & Connectors",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                quantity=15,  # LOW STOCK: threshold 25
                min_threshold=25,
                unit="packs",
                description="Multicolor flexible breadboard jumper cables in varied lengths.",
                location="Drawer 2, Bin A",
            ),
            InventoryItem(
                item_code="INV-ECE-002",
                name="Carbon Film Resistors 220 Ohm 1/4W (Box of 500)",
                category="Electronic Components",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                quantity=80,
                min_threshold=20,
                unit="boxes",
                description="5% tolerance through-hole axial lead resistors for LED and logic circuit labs.",
                location="Component Rack B",
            ),
            InventoryItem(
                item_code="INV-ECE-003",
                name="9V Alkaline Heavy Duty Batteries",
                category="Power Supplies",
                department_id=ece.id,
                laboratory_id=lab_iot.id,
                quantity=40,
                min_threshold=15,
                unit="pcs",
                description="PP3 9V standard batteries for standalone sensor node prototypes.",
                location="Battery Safety Cabinet",
            ),
            InventoryItem(
                item_code="INV-ECE-004",
                name="Solderless Breadboards 830 Tie-Points",
                category="Prototyping",
                department_id=ece.id,
                laboratory_id=lab_elec.id,
                quantity=8,  # LOW STOCK: threshold 15
                min_threshold=15,
                unit="pcs",
                description="High quality nickel plated spring clips with adhesive backing and power rails.",
                location="Cabinet 4, Shelf 1",
            ),
            InventoryItem(
                item_code="INV-CSE-001",
                name="High-Speed USB-C to USB-A Cables 1.5m",
                category="Cables & Adapters",
                department_id=cse.id,
                laboratory_id=lab_prog.id,
                quantity=65,
                min_threshold=20,
                unit="pcs",
                description="Braided USB 3.1 cables for connecting development boards and external peripherals.",
                location="Cable Bin 3",
            ),
            InventoryItem(
                item_code="INV-CSE-002",
                name="ESP32-WROOM-32D Development Boards",
                category="Microcontrollers",
                department_id=cse.id,
                laboratory_id=lab_ai.id,
                quantity=50,
                min_threshold=15,
                unit="pcs",
                description="Dual-core Wi-Fi + Bluetooth SoC MCU modules for embedded IoT labs.",
                location="Anti-static Drawer 1",
            ),
            InventoryItem(
                item_code="INV-CSE-003",
                name="Lead-Free Solder Wire Spool (60/40 100g)",
                category="Consumables",
                department_id=cse.id,
                laboratory_id=lab_net.id,
                quantity=4,  # LOW STOCK: threshold 10
                min_threshold=10,
                unit="spools",
                description="0.8mm rosin core solder wire for electronics maintenance and connector repairs.",
                location="Tool Cabinet A",
            ),
            InventoryItem(
                item_code="INV-AIML-001",
                name="Lithium Polymer (LiPo) Battery Packs 11.1V 2200mAh",
                category="Power Supplies",
                department_id=aiml.id,
                laboratory_id=lab_robo.id,
                quantity=12,
                min_threshold=8,
                unit="pcs",
                description="3S 25C rechargeable battery packs for TurtleBot robotics chassis.",
                location="Fireproof LiPo Bunker 1",
            ),
        ]
        db.add_all(inventory_items)
        db.commit()

        # Seed initial inventory transactions for audit log
        for item in inventory_items:
            db.add(
                InventoryTransaction(
                    inventory_item_id=item.id,
                    user_id=staff_cse.id if item.department_id == cse.id else staff_ece.id,
                    transaction_type="STOCK_IN",
                    quantity_change=item.quantity,
                    previous_quantity=0,
                    new_quantity=item.quantity,
                    reason="Initial semester stock intake from central supplier",
                )
            )
        db.commit()

        # 7. Borrowing Requests (Demonstrating Active, Overdue, and Returned)
        now = utc_now()

        # Active Loan (Rahul Sharma borrowed HP Workstation AST-CSE-004)
        active_borrowing = BorrowingRequest(
            request_code="REQ-20250915-HPZ201",
            asset_id=assets[8].id,  # AST-CSE-004
            user_id=student_cse.id,
            request_date=now - timedelta(days=2),
            duration_days=5,
            intended_purpose="Senior Year Capstone: Distributed Graph Neural Network training.",
            status="Approved",
            approved_by_id=staff_cse.id,
            approval_date=now - timedelta(days=2),
            issued_at=now - timedelta(days=2),
            due_date=now + timedelta(days=3),  # Due in 3 days
        )

        # Overdue Loan (Ananya Iyer borrowed FLIR Camera AST-ECE-004 - Due 2 days ago!)
        overdue_borrowing = BorrowingRequest(
            request_code="REQ-20250910-FLIR02",
            asset_id=assets[9].id,  # AST-ECE-004
            user_id=student_ece.id,
            request_date=now - timedelta(days=9),
            duration_days=7,
            intended_purpose="VLSI Thermal Dissipation characterization experiment.",
            status="Overdue",
            approved_by_id=staff_ece.id,
            approval_date=now - timedelta(days=9),
            issued_at=now - timedelta(days=9),
            due_date=now - timedelta(days=2),  # PAST DUE!
        )

        # Pending Request (Prof. Alan Turing requested Dell Laptop AST-CSE-001)
        # Note: we keep AST-CSE-001 status as Available in sample, but create a pending request for demonstration
        pending_borrowing = BorrowingRequest(
            request_code="REQ-20250928-DELL03",
            asset_id=assets[0].id,  # AST-CSE-001
            user_id=faculty_user.id,
            request_date=now - timedelta(hours=3),
            duration_days=4,
            intended_purpose="Conference Demonstration: Parallel GPU Computing benchmarks.",
            status="Pending",
        )
        # Temporarily mark asset status as Pending Request to match
        assets[0].status = "Pending Request"

        # Returned Loan (Previous successful return with Good condition)
        returned_good = BorrowingRequest(
            request_code="REQ-20250810-TEK004",
            asset_id=assets[3].id,  # AST-ECE-001
            user_id=student_ece.id,
            request_date=now - timedelta(days=20),
            duration_days=4,
            intended_purpose="Filter circuit frequency response measurements.",
            status="Returned",
            approved_by_id=staff_ece.id,
            approval_date=now - timedelta(days=20),
            issued_at=now - timedelta(days=20),
            due_date=now - timedelta(days=16),
            returned_at=now - timedelta(days=17),
            returned_condition="Good",
            return_notes="All probes and power cable returned intact. Tested on bench 4.",
        )

        db.add_all([active_borrowing, overdue_borrowing, pending_borrowing, returned_good])
        db.commit()

        # 8. Maintenance Records
        # Record 1: Completed maintenance for Tektronix Oscilloscope, but demonstrating the CRITICAL RULE:
        # Maintenance is Completed, yet asset is awaiting manual verification by staff!
        maint_completed = MaintenanceRecord(
            ticket_code="MNT-20250901-TEK01",
            asset_id=assets[3].id,  # AST-ECE-001
            reported_by_id=staff_ece.id,
            reason="Periodic annual oscilloscope bandwidth verification and probe compensation.",
            date_reported=now - timedelta(days=15),
            status="Completed",
            is_ready_for_use=True,
            verified_by_id=staff_ece.id,
            verified_at=now - timedelta(days=12),
            service_date=today - timedelta(days=13),
            work_description="Calibrated channels 1 and 2 with precision 1 kHz test square wave. Firmware upgraded to v2.1.",
            cost=2500.0,
            technician_name="Tektronix Certified Service Center",
            next_maintenance_date=today + timedelta(days=180),
        )

        # Record 2: In-Progress maintenance for Keysight Spectrum Analyzer
        maint_in_progress = MaintenanceRecord(
            ticket_code="MNT-20250920-KEY02",
            asset_id=assets[10].id,  # AST-ECE-005 (Under Maintenance)
            reported_by_id=staff_ece.id,
            reason="Noise floor drift detected above 2.4 GHz ISM band. Tracking generator attenuation error.",
            date_reported=now - timedelta(days=5),
            status="In Progress",
            is_ready_for_use=False,
            service_date=today - timedelta(days=2),
            work_description="Sent to Keysight India calibration lab for YIG filter replacement and reference crystal alignment.",
            cost=12500.0,
            technician_name="Keysight Technologies India",
            next_maintenance_date=today + timedelta(days=365),
        )

        # Record 3: Pending maintenance ticket for Damaged 3D printer
        maint_pending = MaintenanceRecord(
            ticket_code="MNT-20250927-PRN03",
            asset_id=assets[11].id,  # AST-CSE-005 (Damaged)
            reported_by_id=staff_cse.id,
            reason="Extruder gear jammed with PLA filament. Thermal runaway sensor tripped.",
            date_reported=now - timedelta(days=1),
            status="Pending",
            is_ready_for_use=False,
            cost=1800.0,
            technician_name="Internal Lab Technician",
        )

        db.add_all([maint_completed, maint_in_progress, maint_pending])
        db.commit()

        print("Database seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
