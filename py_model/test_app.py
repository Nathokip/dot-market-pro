from fastapi.testclient import TestClient
from app import app
client = TestClient(app)
response = client.get("/api/predict/AAPL")
print(response.json())
