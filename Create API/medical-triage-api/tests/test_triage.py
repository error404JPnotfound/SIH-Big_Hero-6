from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_1_mild_headache():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["mild headache"],
        "severity": 3,
        "duration_days": 1
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "NON_URGENT"

def test_2_fever_body_pain():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["fever", "body pain"],
        "severity": 5,
        "duration_days": 2
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "NON_URGENT"

def test_3_severe_chest_pain():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["severe chest pain"],
        "severity": 9,
        "duration_days": 0
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_4_difficulty_breathing():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["difficulty breathing"],
        "severity": 8,
        "duration_days": 1
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_5_loss_of_consciousness():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["loss of consciousness"],
        "severity": 10,
        "duration_days": 0
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_6_mild_headache_severe_chest_pain():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["mild headache", "severe chest pain"],
        "severity": 9,
        "duration_days": 1
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_7_passed_out():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["passed out"],
        "severity": 10,
        "duration_days": 0
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_8_empty_symptoms():
    response = client.post("/api/v1/triage", json={
        "symptoms": [],
        "severity": 5,
        "duration_days": 1
    })
    assert response.status_code == 422

def test_9_hindi_symptom():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["सीने में दर्द"],
        "severity": 9,
        "duration_days": 0
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"

def test_10_gujarati_symptom():
    response = client.post("/api/v1/triage", json={
        "symptoms": ["છાતીમાં દુખાવો"],
        "severity": 9,
        "duration_days": 0
    })
    assert response.status_code == 200
    assert response.json()["triage_level"] == "EMERGENCY"
