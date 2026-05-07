import sys
sys.path.insert(0, '.')

from app.core.security import get_password_hash, verify_password
import traceback

def debug_security():
    print("🔒 Debugging Security Functions...")
    password = "Admin123!"
    
    try:
        print(f"Hashing password: '{password}'")
        hashed = get_password_hash(password)
        print(f"Hash success: {hashed}")
        
        print(f"Verifying password: '{password}' against hash")
        is_valid = verify_password(password, hashed)
        print(f"Verification result: {is_valid}")
        
    except Exception:
        print("❌ Security function failed:")
        traceback.print_exc()

if __name__ == "__main__":
    debug_security()
