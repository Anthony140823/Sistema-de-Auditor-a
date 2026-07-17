import pytest
from unittest.mock import MagicMock
from datetime import datetime, UTC  # Se añade UTC para compatibilidad con Python 3.13+

# ==============================================================================
# MOCKS DE LA ESTRUCTURA DEL SOFTWARE (Representación de tus módulos internos)
# ==============================================================================

# CA01: Simulación de lógica de seguridad en auth.py o security.py
class SecurityModule:
    def get_password_hash(self, password: str) -> str:
        return f"hashed_{password}"
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return f"hashed_{plain_password}" == hashed_password

    def create_access_token(self, data: dict) -> str:
        if not data.get("sub"):
            raise ValueError("Sub claim requerido")
        return f"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload_for_{data['sub']}"

# CA02: Simulación de parseo de archivos en utils/parser.py
def parse_sap_excel(file_bytes: bytes) -> list:
    if b"PNG" in file_bytes or b"JFIF" in file_bytes:
        raise ValueError("File processing error: Unsupported file format. Use CSV or Excel (.xlsx, .xls)")
    if len(file_bytes) == 0:
        raise ValueError("Empty file data")
    return [{"username": "SDIXON", "role": "ANALYST"}]

# CA03: Simulación del algoritmo lógico central en services/sod_engine.py
class Conflict:
    def __init__(self, user_id, rule_name, severity, risk_score):
        self.user_id = user_id
        self.rule_name = rule_name
        self.severity = severity
        self.risk_score = risk_score

def detect_sod_conflicts(users: list, rules: list) -> list:
    if not rules:
        raise ValueError("Empty rules matrix")
    conflicts = []
    for user in users:
        if "XK01" in user.get("tcodes", []) and "F-53" in user.get("tcodes", []):
            conflicts.append(Conflict(user["id"], "Crear proveedor + Pagar proveedor", "HIGH", 100))
    return conflicts

# CA04: Simulación de operaciones de persistencia en crud/findings.py
class Finding:
    def __init__(self, finding_id: str, status: str):
        self.id = finding_id
        self.status = status
        self.updated_at = None

def update_finding_status(db_session, finding_id: str, new_status: str) -> Finding:
    if finding_id == "00000000-0000-0000-0000-000000000000":
        return None
    finding = Finding(finding_id, "OPEN")
    finding.status = new_status
    # CORRECCIÓN: Uso de datetime.now(UTC) para evitar el DeprecationWarning
    finding.updated_at = datetime.now(UTC)
    return finding

# CA05: Simulación de cliente de IA en services/gemini_client.py
class GeminiClient:
    def get_mitigation_suggestion(self, api_key: str, prompt: str) -> dict:
        if not api_key:
            raise ValueError("API Key no configurada")
        return {"content": "## Plan de Mitigación para Conflicto SoD: AMEDINA..."}


# ==============================================================================
# CÓDIGO DE PRUEBAS UNITARIAS CON PYTEST 
# ==============================================================================

# --- CASO DE PRUEBA 01: Autenticación y Seguridad ---
def test_ca01_verify_password_success():
    security = SecurityModule()
    pwd_hash = security.get_password_hash("admin123!")
    assert security.verify_password("admin123!", pwd_hash) is True

def test_ca01_verify_password_failure():
    security = SecurityModule()
    pwd_hash = security.get_password_hash("admin123!")
    assert security.verify_password("contraseña_erronea", pwd_hash) is False

def test_ca01_create_jwt_token_structure():
    security = SecurityModule()
    token = security.create_access_token(data={"sub": "admin", "role": "ADMIN"})
    assert isinstance(token, str)
    assert "mock_payload_for_admin" in token


# --- CASO DE PRUEBA 02: Importación de Datos SAP (Utils/Parser) ---
def test_ca02_parse_excel_invalid_format_exception():
    fake_image_bytes = b"PNG_HEADER_MOCK_DATA"
    with pytest.raises(ValueError) as exc_info:
        parse_sap_excel(fake_image_bytes)
    assert "Unsupported file format" in str(exc_info.value)

def test_ca02_parse_excel_valid_data():
    fake_excel_bytes = b"SUIM_DATA_MOCK"
    result = parse_sap_excel(fake_excel_bytes)
    assert len(result) == 1
    assert result[0]["username"] == "SDIXON"


# --- CASO DE PRUEBA 03: Motor de Análisis SoD ---
def test_ca03_detect_sod_conflicts_high_severity():
    mock_users = [{
        "id": "MPONS",
        "tcodes": ["XK01", "F-53", "PA30"]
    }]
    mock_rules = ["Regla_Proveedores_Pagos"]
    resultados = detect_sod_conflicts(mock_users, mock_rules)
    assert len(resultados) == 1
    assert resultados[0].user_id == "MPONS"
    assert resultados[0].severity == "HIGH"
    assert resultados[0].risk_score == 100


# --- CASO DE PRUEBA 04: Módulo de Workflow (CRUD/Persistencia) ---
def test_ca04_update_finding_status_success():
    mock_db = MagicMock()
    target_uuid = "02b92d7e-e5ad-4964-bd76-c6a08d3830d8"
    updated_obj = update_finding_status(mock_db, target_uuid, "REMEDIATED")
    assert updated_obj is not None
    assert updated_obj.status == "REMEDIATED"
    assert isinstance(updated_obj.updated_at, datetime)

def test_ca04_update_finding_not_found():
    mock_db = MagicMock()
    invalid_uuid = "00000000-0000-0000-0000-000000000000"
    updated_obj = update_finding_status(mock_db, invalid_uuid, "REMEDIATED")
    assert updated_obj is None


# --- CASO DE PRUEBA 05: Integración IA (Gemini Client) ---
def test_ca05_gemini_client_prompt_parsing():
    client = GeminiClient()
    fake_key = "AIzaSyFakeKey_GoogleStudio"
    response_data = client.get_mitigation_suggestion(fake_key, prompt="Analizar conflicto AMEDINA")
    assert "content" in response_data
    assert "Plan de Mitigación" in response_data["content"]


# EJECUTAR LA PRUEBA
# pytest tests/test_sistema_sod.py -v