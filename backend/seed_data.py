"""
Seed database with initial data
- App roles
- Default users (admin, auditor, responsable)
- 15 SoD rules from reglas_sod_demo.xlsx
"""
import sys
from pathlib import Path

from sqlalchemy import text

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.role import AppRole
from app.models.sod import SoDRule, SoDRuleItem, RuleSeverity, SetType
from app.models.user import AppUser, UserRole


def seed_roles(db):
    """Create app role catalog"""
    print("Creating app roles...")
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS app_roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            code VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.commit()

    roles = [
        ("ADMIN", "Administrador", "Acceso total al sistema"),
        ("AUDITOR", "Auditor", "Gestion de auditorias y conflictos"),
        ("RESPONSABLE", "Responsable", "Atencion de hallazgos"),
    ]
    for code, name, description in roles:
        existing = db.query(AppRole).filter(AppRole.code == code).first()
        if not existing:
            db.add(AppRole(code=code, name=name, description=description))
            print(f"  + Created role: {code}")
        else:
            print(f"  - Role already exists: {code}")
    db.commit()


def seed_users(db):
    """Create default users"""
    print("Creating default users...")

    users = [
        {
            "username": "admin",
            "email": "admin@besalco.com",
            "password": "Admin123!",
            "full_name": "Administrador del Sistema",
            "role": UserRole.ADMIN,
        },
        {
            "username": "auditor",
            "email": "auditor@besalco.com",
            "password": "Auditor123!",
            "full_name": "Auditor Principal",
            "role": UserRole.AUDITOR,
        },
        {
            "username": "responsable",
            "email": "responsable@besalco.com",
            "password": "Resp123!",
            "full_name": "Responsable de Area",
            "role": UserRole.RESPONSABLE,
        },
    ]

    for user_data in users:
        existing = db.query(AppUser).filter(AppUser.username == user_data["username"]).first()
        if not existing:
            user = AppUser(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True,
            )
            db.add(user)
            print(f"  + Created user: {user_data['username']}")
        else:
            print(f"  - User already exists: {user_data['username']}")

    db.commit()


def seed_sod_rules(db):
    """Create/update SoD rules from business matrix"""
    print("\nCreating SoD rules...")

    rules = [
        {
            "name": "Crear proveedor + Pagar proveedor",
            "description": "Evita que una misma persona pueda dar de alta/modificar un proveedor y ademas ejecutar pagos, lo que habilita pagos a proveedores ficticios.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 85,
            "set_a": ["XK01", "XK02", "FK01"],
            "set_b": ["F110", "F-53"],
        },
        {
            "name": "Crear OC + Aprobar/ Liberar OC",
            "description": "Evita la auto-aprobacion de ordenes de compra; reduce compras no autorizadas o fuera de politica.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 80,
            "set_a": ["ME21N", "ME22N"],
            "set_b": ["ME28", "ME29N"],
        },
        {
            "name": "Crear SolPed + Aprobar SolPed",
            "description": "Evita que quien solicita bienes/servicios tambien apruebe su solicitud.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 70,
            "set_a": ["ME51N", "ME52N"],
            "set_b": ["ME54N"],
        },
        {
            "name": "Entrada de mercancia + Registrar factura",
            "description": "Evita que una misma persona confirme recepcion (GR) y ademas registre/valide la factura, reduciendo fraude en 3-way match.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 78,
            "set_a": ["MIGO"],
            "set_b": ["MIRO", "FB60"],
        },
        {
            "name": "Registrar factura + Ejecutar pago",
            "description": "Evita que quien registra facturas tambien procese pagos.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 82,
            "set_a": ["FB60", "FB65"],
            "set_b": ["F110", "F-53"],
        },
        {
            "name": "Mantener datos maestros empleado + Ejecutar nomina",
            "description": "Reduce riesgo de crear/alterar empleados y luego procesar nomina sin control.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 88,
            "set_a": ["PA30", "PA40"],
            "set_b": ["PC00_M10_CALC"],
        },
        {
            "name": "Mantener datos bancarios empleado + Ejecutar pagos nomina",
            "description": "Evita cambiar cuenta bancaria del empleado y luego ejecutar pagos (desvio de fondos).",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 90,
            "set_a": ["PA30", "HRPAYPE_BANK", "FPB1"],
            "set_b": ["PC00_M99_CIPE"],
        },
        {
            "name": "Mantener ausencias/tiempos + Ejecutar nomina",
            "description": "Evita manipular ausencias/horas para impactar remuneracion y luego procesar nomina.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 72,
            "set_a": ["PA61", "CAT2", "PT50"],
            "set_b": ["PC00_M10_CALC"],
        },
        {
            "name": "Generar contrato + Aprobar contrato",
            "description": "Evita que la misma persona genere y apruebe contratos sin segregacion.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 68,
            "set_a": ["ZHR_CONTR_GEN"],
            "set_b": ["ZHR_CONTR_APPR"],
        },
        {
            "name": "Acceso seguridad (usuarios/roles) + Procesos de pago",
            "description": "Evita que administradores SAP puedan otorgarse permisos y ejecutar pagos.",
            "severity": RuleSeverity.HIGH,
            "risk_base_score": 95,
            "set_a": ["SU01", "PFCG"],
            "set_b": ["F110", "PC00_M99_CIPE"],
        },
        {
            "name": "Acceso seguridad (trazas) + Modificar datos maestros",
            "description": "Reduce riesgo de ocultar acciones: administrar trazas y modificar datos criticos.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 65,
            "set_a": ["SM20", "ST01", "STAUTHTRACE"],
            "set_b": ["PA30", "XK02"],
        },
        {
            "name": "Aprobar compras + Registrar factura",
            "description": "Evita que quien aprueba compras tambien registre facturas asociadas.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 70,
            "set_a": ["ME28", "ME29N"],
            "set_b": ["FB60", "MIRO"],
        },
        {
            "name": "Reportes sensibles nomina + Mantener datos bancarios",
            "description": "Evita acceso excesivo: consultar nomina y ademas cambiar cuentas bancarias.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 66,
            "set_a": ["PC00_M10_CEDT", "PC00_M10_CLSTR"],
            "set_b": ["HRPAYPE_BANK", "PA30"],
        },
        {
            "name": "Ver auditoria (SUIM) + Administracion usuarios",
            "description": "Evita que un mismo perfil administre usuarios y controle evidencias de auditoria sin revision independiente.",
            "severity": RuleSeverity.LOW,
            "risk_base_score": 55,
            "set_a": ["SUIM"],
            "set_b": ["SU01", "PFCG"],
        },
        {
            "name": "Gestion de proveedores + Gestion de compras",
            "description": "Evita que quien administra proveedores tambien cree ordenes/solped, reduciendo colusion y altas no controladas.",
            "severity": RuleSeverity.MEDIUM,
            "risk_base_score": 73,
            "set_a": ["XK01", "XK02"],
            "set_b": ["ME21N", "ME51N"],
        },
    ]

    desired_names = {rule["name"] for rule in rules}

    for rule_data in rules:
        existing = db.query(SoDRule).filter(SoDRule.name == rule_data["name"]).first()
        if existing:
            existing.description = rule_data["description"]
            existing.severity = rule_data["severity"]
            existing.risk_base_score = rule_data["risk_base_score"]
            existing.is_active = True
            db.flush()
            db.query(SoDRuleItem).filter(SoDRuleItem.rule_id == existing.id).delete()
            rule = existing
            print(f"  - Updated rule: {rule_data['name']}")
        else:
            rule = SoDRule(
                name=rule_data["name"],
                description=rule_data["description"],
                severity=rule_data["severity"],
                risk_base_score=rule_data["risk_base_score"],
                is_active=True,
            )
            db.add(rule)
            db.flush()
            print(f"  + Created rule: {rule_data['name']}")

        for tcode in rule_data["set_a"]:
            db.add(SoDRuleItem(rule_id=rule.id, set_type=SetType.A, tcode=tcode.strip().upper()))
        for tcode in rule_data["set_b"]:
            db.add(SoDRuleItem(rule_id=rule.id, set_type=SetType.B, tcode=tcode.strip().upper()))

    # Deactivate old rules not in matrix
    stale_rules = db.query(SoDRule).filter(~SoDRule.name.in_(desired_names)).all()
    for stale in stale_rules:
        stale.is_active = False
        print(f"  - Deactivated old rule: {stale.name}")

    db.commit()


def main():
    """Main seed function"""
    print("=" * 60)
    print("SAP SoD Audit System - Database Seeding")
    print("=" * 60)

    db = SessionLocal()

    try:
        seed_roles(db)
        seed_users(db)
        seed_sod_rules(db)

        print("\n" + "=" * 60)
        print("+ Database seeding completed successfully!")
        print("=" * 60)
        print("\nDefault Users:")
        print("  - admin@besalco.com / Admin123!")
        print("  - auditor@besalco.com / Auditor123!")
        print("  - responsable@besalco.com / Resp123!")
        print("\nSoD Rules: 15 rules synced")
        print("=" * 60)

    except Exception as e:
        print(f"\nX Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

