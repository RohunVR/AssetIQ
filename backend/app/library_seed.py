"""
AssetIQ — Library Data Seeder
Adds:
  - Library department + section
  - Librarian user account
  - 120+ books across 10 categories
Run from project root: python -m backend.app.library_seed
"""

from backend.app.database import SessionLocal
from backend.app.models.department import Department, Laboratory
from backend.app.models.user import User
from backend.app.models.asset import Asset
from backend.app.security import hash_password
from datetime import date
import uuid

# ── Library Book Data ──────────────────────────────────────────────────

# ── 4. Book Definitions ───────────────────────────────────────────────
# category → list of (title, author, shelf_location, condition)
BOOKS = {

    "Textbooks": [
        ("Engineering Mathematics Vol. 1", "B.S. Grewal", "A-01", "Good"),
        ("Engineering Mathematics Vol. 2", "B.S. Grewal", "A-01", "Good"),
        ("Engineering Physics", "S.K. Garg & R.M. Gupta", "A-02", "Good"),
        ("Engineering Chemistry", "P.C. Jain & Monika Jain", "A-02", "Good"),
        ("Basic Electrical Engineering", "D.P. Kothari & I.J. Nagrath", "A-03", "Good"),
        ("Mechanics of Materials", "R.C. Hibbeler", "A-04", "Good"),
        ("Fluid Mechanics and Hydraulic Machines", "R.K. Bansal", "A-05", "Minor Damage"),
        ("Engineering Thermodynamics", "P.K. Nag", "A-06", "Good"),
        ("Manufacturing Technology Vol. 1", "M. Haslehurst", "A-07", "Good"),
        ("Environmental Studies", "Anubha Kaushik & C.P. Kaushik", "A-08", "Good"),
        ("Technical English Communication", "K.R. Lakshminarayanan", "A-09", "Good"),
        ("Engineering Drawing", "N.D. Bhatt & V.M. Panchal", "A-10", "Good"),
    ],

    "Computer Science & IT": [
        ("Introduction to Algorithms (CLRS)", "Cormen, Leiserson, Rivest, Stein", "B-01", "Good"),
        ("The C Programming Language", "Brian W. Kernighan & Dennis Ritchie", "B-02", "Minor Damage"),
        ("Computer Networks", "Andrew S. Tanenbaum", "B-03", "Good"),
        ("Database System Concepts", "Silberschatz, Korth, Sudarshan", "B-04", "Good"),
        ("Operating System Concepts", "Silberschatz, Galvin, Gagne", "B-05", "Good"),
        ("Artificial Intelligence: A Modern Approach", "Stuart Russell & Peter Norvig", "B-06", "Good"),
        ("Design Patterns: Elements of Reusable OOP", "Gang of Four", "B-07", "Good"),
        ("Clean Code", "Robert C. Martin", "B-08", "Good"),
        ("Computer Organization and Architecture", "William Stallings", "B-09", "Good"),
        ("Software Engineering: A Practitioner's Approach", "Roger S. Pressman", "B-10", "Good"),
        ("Data Structures and Algorithms in Python", "Michael T. Goodrich", "B-11", "Good"),
        ("The Pragmatic Programmer", "David Thomas & Andrew Hunt", "B-12", "Good"),
        ("Machine Learning: A Probabilistic Perspective", "Kevin P. Murphy", "B-13", "Good"),
    ],

    "Electronics & Communication": [
        ("Microelectronics Circuits", "Sedra & Smith", "C-01", "Good"),
        ("Electronic Devices and Circuit Theory", "Robert Boylestad", "C-02", "Good"),
        ("Digital Logic and Computer Design", "M. Morris Mano", "C-03", "Good"),
        ("Principles of Communication Systems", "Taub & Schilling", "C-04", "Good"),
        ("Signals and Systems", "Alan V. Oppenheim & Alan S. Willsky", "C-05", "Good"),
        ("VLSI Design", "Weste & Harris", "C-06", "Good"),
        ("Embedded Systems", "Rajkamal", "C-07", "Good"),
        ("Digital Signal Processing", "Proakis & Manolakis", "C-08", "Minor Damage"),
        ("Microprocessors & Microcontrollers", "A.K. Ray & K.M. Bhurchandi", "C-09", "Good"),
        ("Control Systems Engineering", "Norman S. Nise", "C-10", "Good"),
        ("Antenna Theory: Analysis and Design", "Constantine Balanis", "C-11", "Good"),
        ("RF and Microwave Engineering", "Georg Boeck", "C-12", "Good"),
    ],

    "Mathematics & Statistics": [
        ("Higher Engineering Mathematics", "H.K. Dass", "D-01", "Good"),
        ("Probability and Statistics for Engineers", "Miller & Freund", "D-02", "Good"),
        ("Numerical Methods for Scientists and Engineers", "Hamming", "D-03", "Good"),
        ("Linear Algebra and Its Applications", "Gilbert Strang", "D-04", "Good"),
        ("Advanced Engineering Mathematics", "Erwin Kreyszig", "D-05", "Good"),
        ("Discrete Mathematics and Its Applications", "Kenneth H. Rosen", "D-06", "Good"),
        ("Graph Theory", "Frank Harary", "D-07", "Minor Damage"),
        ("Introduction to Mathematical Statistics", "Hogg, McKean, Craig", "D-08", "Good"),
        ("Calculus: Early Transcendentals", "James Stewart", "D-09", "Good"),
        ("Real Analysis", "H.L. Royden & P.M. Fitzpatrick", "D-10", "Good"),
        ("Abstract Algebra", "David S. Dummit & Richard M. Foote", "D-11", "Good"),
        ("Operations Research", "H.A. Taha", "D-12", "Good"),
    ],

    "Management & Economics": [
        ("Principles of Management", "Harold Koontz & Heinz Weihrich", "E-01", "Good"),
        ("Engineering Economics", "R. Panneerselvam", "E-02", "Good"),
        ("Human Resource Management", "Gary Dessler", "E-03", "Good"),
        ("Organizational Behaviour", "Stephen P. Robbins", "E-04", "Good"),
        ("Financial Management", "I.M. Pandey", "E-05", "Good"),
        ("Marketing Management", "Philip Kotler", "E-06", "Good"),
        ("Managerial Economics", "D.N. Dwivedi", "E-07", "Good"),
        ("Total Quality Management", "Dale H. Besterfield", "E-08", "Good"),
        ("Project Management: A Systems Approach", "Harold Kerzner", "E-09", "Minor Damage"),
        ("Strategic Management", "Fred R. David", "E-10", "Good"),
        ("Entrepreneurship Development", "S.S. Khanka", "E-11", "Good"),
    ],

    "General Science & Physics": [
        ("University Physics", "Young & Freedman", "F-01", "Good"),
        ("Concepts of Physics Vol. 1", "H.C. Verma", "F-02", "Good"),
        ("Concepts of Physics Vol. 2", "H.C. Verma", "F-02", "Good"),
        ("Organic Chemistry", "Morrison & Boyd", "F-03", "Good"),
        ("Physical Chemistry", "P.W. Atkins", "F-04", "Good"),
        ("Inorganic Chemistry", "Shriver & Atkins", "F-05", "Good"),
        ("Cell and Molecular Biology", "Gerald Karp", "F-06", "Minor Damage"),
        ("Genetics", "B.D. Singh", "F-07", "Good"),
        ("Environmental Engineering", "Howard S. Peavy", "F-08", "Good"),
        ("Nanotechnology: An Introduction", "Mark Ratner & Daniel Ratner", "F-09", "Good"),
        ("Biotechnology", "B.D. Singh", "F-10", "Good"),
    ],

    "Research & Thesis": [
        ("Research Methodology: Methods and Techniques", "C.R. Kothari", "G-01", "Good"),
        ("How to Write and Publish a Scientific Paper", "Robert A. Day", "G-02", "Good"),
        ("The Craft of Research", "Wayne C. Booth", "G-03", "Good"),
        ("Academic Writing for Graduate Students", "John M. Swales", "G-04", "Good"),
        ("Writing Your Dissertation", "Derek Swetnam", "G-05", "Good"),
        ("Practical Research: Planning and Design", "Leedy & Ormrod", "G-06", "Good"),
        ("Introduction to Research Methods", "William M.K. Trochim", "G-07", "Good"),
        ("Doing Research in the Real World", "David E. Gray", "G-08", "Good"),
        ("Research Design: Qualitative & Quantitative", "John W. Creswell", "G-09", "Good"),
        ("Statistics for Research", "Sheldon M. Ross", "G-10", "Good"),
        ("IEEE Citation Guide", "IEEE Editorial Style Manual", "G-11", "Good"),
    ],

    "Journals & Periodicals": [
        ("IEEE Transactions on Computers — Vol. 72 (2023)", "IEEE", "H-01", "Good"),
        ("ACM Computing Surveys — Vol. 55 (2023)", "ACM", "H-01", "Good"),
        ("Nature — Volume 614 (2023)", "Springer Nature", "H-02", "Good"),
        ("Science Magazine — Vol. 379 (2023)", "AAAS", "H-02", "Good"),
        ("Journal of Electronics & Communication Engineering", "IETE", "H-03", "Good"),
        ("International Journal of Computer Science", "IJCSI", "H-03", "Good"),
        ("Journal of Applied Physics — Vol. 133 (2023)", "AIP Publishing", "H-04", "Good"),
        ("Current Science Journal — Vol. 124 (2023)", "IISC Bangalore", "H-04", "Good"),
        ("Harvard Business Review — 2023 Annual", "HBR Press", "H-05", "Good"),
        ("Economic and Political Weekly — 2023", "EPW", "H-05", "Minor Damage"),
        ("Indian Journal of Engineering — Vol. 20", "Discovery Publishing", "H-06", "Good"),
        ("IEEE Spectrum — 2023 Collection", "IEEE", "H-06", "Good"),
    ],

    "Project Reports": [
        ("Smart Traffic Management System — B.Tech CSE (2022)", "R. Mehta et al.", "P-01", "Good"),
        ("IoT-Based Smart Home Automation — B.Tech ECE (2022)", "A. Sharma et al.", "P-01", "Good"),
        ("Face Recognition Attendance System — B.Tech AIML (2022)", "S. Patel et al.", "P-02", "Good"),
        ("Hospital Management System — M.Tech CS (2022)", "K. Reddy", "P-02", "Good"),
        ("Autonomous Drone Navigation — B.Tech ECE (2023)", "P. Singh et al.", "P-03", "Good"),
        ("Blockchain-Based Voting System — B.Tech CSE (2023)", "N. Kumar et al.", "P-03", "Good"),
        ("AI-Powered Medical Diagnosis — M.Tech AIML (2023)", "M. Verma", "P-04", "Good"),
        ("Solar Energy Monitoring System — B.Tech EEE (2023)", "C. Joshi et al.", "P-04", "Good"),
        ("NLP-Based Chatbot for Education — B.Tech CSE (2023)", "R. Nair et al.", "P-05", "Good"),
        ("Hybrid Renewable Energy Model — M.Tech EEE (2022)", "D. Pillai", "P-05", "Good"),
        ("Computer Vision for Defect Detection — B.Tech AIML (2023)", "A. Iyer et al.", "P-06", "Good"),
        ("Secure Cloud Storage Using Encryption — B.Tech CSE (2022)", "V. Saxena et al.", "P-06", "Good"),
    ],

    "Reference Books": [
        ("Oxford Dictionary of Computer Science", "Oxford University Press", "R-01", "Good"),
        ("CRC Handbook of Chemistry and Physics (103rd Ed.)", "CRC Press", "R-01", "Good"),
        ("Handbook of Electrical Engineering", "Al-Shemmeri", "R-02", "Good"),
        ("McGraw-Hill Encyclopedia of Engineering", "McGraw-Hill", "R-02", "Good"),
        ("IEEE Standard Glossary of Software Engineering Terminology", "IEEE", "R-03", "Good"),
        ("Britannica Encyclopedia of Science & Technology", "Encyclopaedia Britannica", "R-03", "Good"),
        ("Standard Handbook for Electrical Engineers", "Fink & Beaty", "R-04", "Good"),
        ("Marks' Standard Handbook for Mechanical Engineers", "Avallone et al.", "R-04", "Good"),
        ("The Merck Index: Encyclopedia of Chemicals", "Royal Society of Chemistry", "R-05", "Good"),
        ("International Tables for Crystallography", "Springer", "R-05", "Good"),
        ("Webster's New World Dictionary of Computer Terms", "Webster's", "R-06", "Minor Damage"),
        ("Roget's Thesaurus for Engineers", "Prentice Hall", "R-06", "Good"),
    ],
}

def seed_library_data(db=None):
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    # 1. Department
    lib_dept = db.query(Department).filter(Department.code == "LIB").first()
    if not lib_dept:
        lib_dept = Department(
            code="LIB",
            name="Central Library",
            description="Institutional library housing textbooks, references, journals, and digital resources.",
        )
        db.add(lib_dept)
        db.flush()

    # 2. Section
    lib_lab = db.query(Laboratory).filter(Laboratory.code == "LIB-MAIN").first()
    if not lib_lab:
        lib_lab = Laboratory(
            code="LIB-MAIN",
            name="Main Library Collection",
            department_id=lib_dept.id,
            location="Central Library, Ground Floor",
        )
        db.add(lib_lab)
        db.flush()

    # 3. Librarian
    librarian = db.query(User).filter(User.email == "librarian@college.edu").first()
    if not librarian:
        librarian = User(
            email="librarian@college.edu",
            full_name="Ms. Priya Raghavan",
            hashed_password=hash_password("Library@123"),
            role="LAB_STAFF",
            department_id=lib_dept.id,
            student_or_staff_id="LIB-001",
            phone="9900112233",
            is_active=True,
        )
        db.add(librarian)
        db.flush()

    # 4. Insert Books
    counter = 1
    books_added = 0
    for category, book_list in BOOKS.items():
        for title, author, shelf, condition in book_list:
            asset_code = f"LIB-{category[:3].upper()}-{counter:03d}"
            counter += 1

            existing = db.query(Asset).filter(Asset.asset_code == asset_code).first()
            if existing:
                continue

            asset = Asset(
                asset_code=asset_code,
                name=title,
                category=category,
                description=f"Author(s): {author}",
                department_id=lib_dept.id,
                laboratory_id=lib_lab.id,
                location=f"Shelf {shelf}",
                purchase_date=date(2022, 6, 1),
                serial_number=None,
                model_number=f"ISBN-{uuid.uuid4().hex[:10].upper()}",
                cost=450.0,
                condition=condition,
                status="Available",
            )
            db.add(asset)
            books_added += 1

    db.commit()
    print(f"✓ Seeded {books_added} library books into Central Library")
    if close_at_end:
        db.close()

if __name__ == "__main__":
    seed_library_data()

