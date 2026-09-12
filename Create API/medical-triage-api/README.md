# CareConnect Rule-Based Triage API

This is the standalone Triage API for the CareConnect — Healthcare Access & Continuity Platform.
It provides an automated healthcare triage service that evaluates patient-reported symptoms against predefined emergency warning-sign rules and classifies the case as either `EMERGENCY` or `NON_URGENT`.

**IMPORTANT: This is not an AI system and does not diagnose diseases. It is a deterministic rule-based engine.**

## Features
- **Deterministic Rule Engine:** No AI, ML, or probabilistic models. Output is strictly rules-based.
- **Multilingual Symptom Normalization:** Supports English, Hindi, and Gujarati symptom mapping.
- **Strict Triage Levels:** Only `EMERGENCY` or `NON_URGENT` returned.
- **Configurable Rules:** Emergency warning signs configured via JSON seed data.
- **Database Integration:** Prepared for Supabase `emergency_cases`, `notifications`, and `audit_logs` integration.

## Project Architecture
- **FastAPI:** High-performance web framework.
- **Pydantic:** Data validation.
- **pytest:** Automated testing.
- **Supabase-py:** PostgreSQL database client.

## Setup and Installation

1. **Create Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   *Note: Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.*

## Running the API

Run the local Uvicorn server:
```bash
uvicorn app.main:app --reload
```

## API Endpoints

- **Swagger Documentation:** `http://localhost:8000/docs`
- **Health Check:** `GET /api/v1/health`
- **List Symptoms:** `GET /api/v1/triage/symptoms`
- **Perform Triage:** `POST /api/v1/triage`
- **Triage History:** `GET /api/v1/triage/history`

### Example Request (`POST /api/v1/triage`)
```json
{
  "symptoms": ["chest pain", "difficulty breathing"],
  "severity": 9,
  "duration_days": 1
}
```

### Example Response (Emergency)
```json
{
  "triage_level": "EMERGENCY",
  "emergency": true,
  "matched_red_flags": ["chest_pain", "difficulty_breathing"],
  "reasons": [
    "Chest pain may require immediate medical assessment.",
    "Difficulty breathing is an emergency warning sign."
  ],
  "recommended_action": "Seek emergency medical care immediately.",
  "facility_action": "Route patient to the nearest appropriate emergency facility.",
  "disclaimer": "This triage result is informational and is not a medical diagnosis."
}
```

## Testing

Run the automated test suite:
```bash
pytest tests/
```

## Medical Safety Disclaimer
This system provides informational triage support only. It must not be used as a substitute for professional medical advice, diagnosis, or treatment. It strictly evaluates symptoms against configured emergency rules.
