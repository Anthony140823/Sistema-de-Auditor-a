import sys
import traceback

sys.path.insert(0, '.')

try:
    from app.main import app
    print("App loaded successfully")
except Exception:
    with open('debug_traceback.txt', 'w') as f:
        traceback.print_exc(file=f)
    print("Error captured in debug_traceback.txt")
