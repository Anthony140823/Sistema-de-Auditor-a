import requests
import sys

BASE_URL = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "Admin123!"

def test_system():
    print("[START] Iniciando Test de Integración del Sistema SAP SoD Audit...")

    # 1. Test Health Check
    try:
        resp = requests.get(f"{BASE_URL}/")
        if resp.status_code == 200:
            print("[OK] Backend Health Check: OK")
        else:
            print(f"[ERROR] Backend Health Check Failed: {resp.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error conectando al backend: {e}")
        sys.exit(1)

    # 2. Test Login
    print("\n[INFO] Probando Autenticación...")
    login_data = {"username": USERNAME, "password": PASSWORD}
    # Ruta correcta incluye /api y el endpoint es /login
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    
    if resp.status_code != 200:
        print(f"[ERROR] Login Fallido: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login Exitoso. Token obtenido.")
    
    # 2.5 Obtener ID del usuario actual
    print("[INFO] Obteniendo datos del usuario...")
    me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if me_resp.status_code != 200:
        print(f"[ERROR] Fallo al obtener usuario: {me_resp.text}")
        sys.exit(1)
    user_id = me_resp.json()["id"]
    print(f"[OK] Usuario ID: {user_id}")

    # 3. Test Crear Auditoría
    print("\n[INFO] Probando Creación de Auditoría...")
    audit_data = {
        "name": "Integration Test Audit",
        "company_name": "Test Corp",
        "period_start": "2023-01-01",
        "period_end": "2023-12-31",
        "responsible_user_id": user_id
    }
    resp = requests.post(f"{BASE_URL}/api/audits/", json=audit_data, headers=headers)
    
    if resp.status_code == 200:
        audit = resp.json()
        audit_id = audit['id']
        print(f"[OK] Auditoría Creada: {audit['name']} (ID: {audit_id})")
    else:
        print(f"[ERROR] Fallo al crear auditoría: {resp.status_code} - {resp.text}")
        sys.exit(1)

    # 4. Test Listar Auditorías
    print("\n[INFO] Probando Listado de Auditorías...")
    resp = requests.get(f"{BASE_URL}/api/audits/", headers=headers)
    if resp.status_code == 200:
        audits = resp.json()
        print(f"[OK] Listado OK. Total auditorías en sistema: {len(audits)}")
        found = any(a['id'] == audit_id for a in audits)
        if found:
            print("[OK] Auditoría creada encontrada en la lista.")
        else:
            print("[ERROR] Auditoría creada NO encontrada en la lista.")
    else:
        print(f"[ERROR] Fallo al listar auditorías: {resp.text}")

    print("\n[SUCCESS] ¡TEST COMPLETO EXITOSO! El backend y la base de datos funcionan correctamente.")

if __name__ == "__main__":
    test_system()
