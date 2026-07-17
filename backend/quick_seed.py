"""
Quick seed script - simplified version
"""
import os
import sys

# Set working directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import AppUser, UserRole
from app.models.sod import SoDRule, SoDRuleItem, RuleSeverity, SetType

print("=" * 60)
print("SAP SoD Audit System - Quick Seed")
print("=" * 60)

db = SessionLocal()

try:
    # Create admin user
    admin = db.query(AppUser).filter(AppUser.username == "admin").first()
    if not admin:
        admin = AppUser(
            username="admin",
            email="admin@besalco.com",
            password_hash=get_password_hash("Admin123!"),
            full_name="Administrador del Sistema",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("[OK] Admin user created")
    else:
        print("- Admin user exists, updating password hash for Argon2 compatibility...")
        admin.password_hash = get_password_hash("Admin123!")
        db.commit()
        print("[OK] Admin password updated")

    # Create Auditor user
    auditor = db.query(AppUser).filter(AppUser.username == "auditor").first()
    if not auditor:
        auditor = AppUser(
            username="auditor",
            email="auditor@besalco.com",
            password_hash=get_password_hash("Auditor123!"),
            full_name="Internal Auditor",
            role=UserRole.AUDITOR,
            is_active=True
        )
        db.add(auditor)
        db.commit()
        print("[OK] Auditor user created")
    else:
        print("- Auditor user exists, updating password hash...")
        auditor.password_hash = get_password_hash("Auditor123!")
        db.commit()
        print("[OK] Auditor password updated")

    # Create Responsable user
    responsable = db.query(AppUser).filter(AppUser.username == "responsable").first()
    if not responsable:
        responsable = AppUser(
            username="responsable",
            email="responsable@besalco.com",
            password_hash=get_password_hash("Resp123!"),
            full_name="Area Manager",
            role=UserRole.RESPONSABLE,
            is_active=True
        )
        db.add(responsable)
        db.commit()
        print("[OK] Responsable user created")
    else:
        print("- Responsable user exists, updating password hash...")
        responsable.password_hash = get_password_hash("Resp123!")
        db.commit()
        print("[OK] Responsable password updated")
    
    # Create one SoD rule as test
    rule = db.query(SoDRule).filter(SoDRule.name == "Create Vendor + Pay Vendor").first()
    if not rule:
        rule = SoDRule(
            name="Create Vendor + Pay Vendor",
            description="User can both create vendors and process payments",
            severity=RuleSeverity.HIGH,
            risk_base_score=80,
            is_active=True
        )
        db.add(rule)
        db.flush()
        
        # Add tcodes
        for tcode in ["ME21N", "XK01"]:
            db.add(SoDRuleItem(rule_id=rule.id, set_type=SetType.A, tcode=tcode))
        for tcode in ["F-53", "F110"]:
            db.add(SoDRuleItem(rule_id=rule.id, set_type=SetType.B, tcode=tcode))
        
        db.commit()
        print("[OK] Test SoD rule created")
    else:
        print("- Test rule already exists")
    
    print("=" * 60)
    print("[OK] Quick seed completed!")
    print("Login: admin / Admin123!")
    print("=" * 60)
    
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
