print("Testing TestClient...")
import traceback
try:
    from fastapi.testclient import TestClient
    from app import app
    client = TestClient(app)
    response = client.get("/api/predict/AAPL")
    print("STATUS:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("EXCEPTION CAUGHT:", e)
    traceback.print_exc()
print("TestClient Finished.")
