import sys
import traceback

sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest

def debug_auth():
    db = SessionLocal()
    try:
        print("🔍 Debugging Auth...")
        service = AuthService(db)
        # Intentamos autenticar con las credenciales por defecto
        req = LoginRequest(username="admin", password="Admin123!")
        print(f"Attempting login for: {req.username}")
        
        resp = service.authenticate_user(req)
        print("✅ Auth Success!")
        print(resp)
        
    except Exception as e:
        print("❌ Auth Failed with Exception:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_auth()
